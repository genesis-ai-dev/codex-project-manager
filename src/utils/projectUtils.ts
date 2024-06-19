import { nonCanonicalBookRefs } from "./verseRefUtils/verseData";
import { LanguageMetadata, LanguageProjectStatus, Project } from "codex-types";
import { getAllBookRefs } from "./verseRefUtils";
import * as vscode from "vscode";
import { LanguageCodes } from "./languageUtils";
import { createProjectNotebooksFromTxt } from "./codexNotebookUtils";
import * as path from "path";

export interface ProjectDetails {
  projectName?: string;
  projectCategory?: string;
  userName?: string;
  abbreviation?: string;
  sourceLanguage?: LanguageMetadata;
  targetLanguage?: LanguageMetadata;
}

export async function promptForTargetLanguage(): Promise<
  ProjectDetails | undefined
> {
  const languages = LanguageCodes;

  function getLanguageDisplayName(lang: LanguageMetadata): string {
    return `${lang.refName} (${lang.tag})`;
  }

  const targetLanguagePick = await vscode.window.showQuickPick(
    languages.map(getLanguageDisplayName),
    {
      placeHolder: "Select the target language",
    }
  );
  if (!targetLanguagePick) {
    return;
  }

  const targetLanguage = languages.find(
    (lang: LanguageMetadata) =>
      getLanguageDisplayName(lang) === targetLanguagePick
  );
  if (!targetLanguage) {
    return;
  }

  // Add project status to the selected languages
  targetLanguage.projectStatus = LanguageProjectStatus.TARGET;

  return {
    targetLanguage,
  };
}
export async function promptForSourceLanguage(): Promise<
  ProjectDetails | undefined
> {
  const languages = LanguageCodes;
  const sourceLanguagePick = await vscode.window.showQuickPick(
    languages.map((lang: LanguageMetadata) => `${lang.refName} (${lang.tag})`),
    {
      placeHolder: "Select the source language",
    }
  );
  if (!sourceLanguagePick) {
    return;
  }

  const sourceLanguage = languages.find(
    (lang: LanguageMetadata) =>
      `${lang.refName} (${lang.tag})` === sourceLanguagePick
  );
  if (!sourceLanguage) {
    return;
  }

  // Add project status to the selected languages
  sourceLanguage.projectStatus = LanguageProjectStatus.SOURCE;

  return {
    // projectName,
    // projectCategory,
    // userName,
    // abbreviation,
    sourceLanguage,
  };
}

export function generateProjectScope(
  skipNonCanonical: boolean = true
): Project["type"]["flavorType"]["currentScope"] {
  /** For now, we are just setting the scope as all books, but allowing the vref.ts file to determine the books.
   * We could add a feature to allow users to select which books they want to include in the project.
   * And we could even drill down to specific chapter/verse ranges.
   *
   * FIXME: need to sort out whether the scope can sometimes be something other than books, like stories, etc.
   */
  const books: string[] = getAllBookRefs();

  // The keys will be the book refs, and the values will be empty arrays
  const projectScope: any = {}; // NOTE: explicit any type here because we are dynamically generating the keys

  skipNonCanonical
    ? books
        .filter((book) => !nonCanonicalBookRefs.includes(book))
        .forEach((book) => {
          projectScope[book] = [];
        })
    : books.forEach((book) => {
        projectScope[book] = [];
      });
  return projectScope;
}

export async function initializeProjectMetadata(details: ProjectDetails) {
  // Initialize a new project with the given details and return the project object
  const newProject: Project = {
    format: "scripture burrito",
    projectName:
      details.projectName ||
      vscode.workspace
        .getConfiguration("codex-project-manager")
        .get<string>("projectName") ||
      "", // previously "Codex Project"
    meta: {
      version: "0.0.0",
      category:
        details.projectCategory ||
        vscode.workspace
          .getConfiguration("codex-project-manager")
          .get<string>("projectCategory") ||
        "Scripture", // fixme: does this needed in multi modal?
      generator: {
        softwareName: "Codex Editor",
        softwareVersion: "0.0.1",
        userName:
          details.userName ||
          vscode.workspace
            .getConfiguration("codex-project-manager")
            .get<string>("userName") ||
          "", // previously "Unknown"
      },
      defaultLocale: "en",
      dateCreated: new Date().toDateString(),
      normalization: "NFC",
      comments: [],
    },
    idAuthorities: {},
    identification: {},
    languages: [],
    type: {
      flavorType: {
        name: "default",
        flavor: {
          name: "default",
          usfmVersion: "3.0",
          translationType: "unknown",
          audience: "general",
          projectType: "unknown",
        },
        currentScope: generateProjectScope(),
      },
    },
    confidential: false,
    agencies: [],
    targetAreas: [],
    localizedNames: {},
    ingredients: {},
    copyright: {
      shortStatements: [],
    },
  };

  if (details.sourceLanguage) {
    newProject.languages.push(details.sourceLanguage);
  }
  if (details.targetLanguage) {
    newProject.languages.push(details.targetLanguage);
  }

  const workspaceFolder = vscode.workspace.workspaceFolders
    ? vscode.workspace.workspaceFolders[0].uri.fsPath
    : undefined;

  if (!workspaceFolder) {
    console.error("No workspace folder found.");
    return;
  }

  const WORKSPACE_FOLDER =
    vscode?.workspace?.workspaceFolders &&
    vscode?.workspace?.workspaceFolders[0];

  if (!WORKSPACE_FOLDER) {
    console.error("No workspace folder found.");
    return;
  }

  const projectFilePath = vscode.Uri.joinPath(
    WORKSPACE_FOLDER.uri,
    "metadata.json"
  );
  const projectFileData = Buffer.from(
    JSON.stringify(newProject, null, 4),
    "utf8"
  );

  // FIXME: need to handle the case where the file does not exist
  vscode.workspace.fs
    .writeFile(projectFilePath, projectFileData)
    .then(() =>
      vscode.window.showInformationMessage(
        `Project created at ${projectFilePath.fsPath}`
      )
    );
  return newProject;
}

export async function updateMetadataFile() {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath;

  if (!workspaceFolder) {
    console.error("No workspace folder found.");
    return;
  }

  const projectFilePath = vscode.Uri.joinPath(
    vscode.Uri.file(workspaceFolder),
    "metadata.json"
  );

  let project;
  try {
    const projectFileData = await vscode.workspace.fs.readFile(projectFilePath);
    project = JSON.parse(projectFileData.toString());
  } catch (error) {
    console.warn("Metadata file does not exist, creating a new one.");
    project = {}; // Initialize an empty project object if the file does not exist
  }

  const projectSettings = vscode.workspace.getConfiguration(
    "codex-project-manager"
  );
  const projectName = projectSettings.get("projectName", "");
  console.log("Project name loaded:", projectName);

  project.projectName = projectSettings.get("projectName", "");
  project.meta = project.meta || {}; // Ensure meta object exists
  project.meta.category = projectSettings.get("projectCategory", "");
  project.meta.generator = project.meta.generator || {}; // Ensure generator object exists
  project.meta.generator.userName = projectSettings.get("userName", "");
  project.languages[0] = projectSettings.get("sourceLanguage", "");
  project.languages[1] = projectSettings.get("targetLanguage", "");
  // Update other fields as needed
  console.log("Project settings loaded:", { projectSettings, project });
  const updatedProjectFileData = Buffer.from(
    JSON.stringify(project, null, 4),
    "utf8"
  );
  await vscode.workspace.fs.writeFile(projectFilePath, updatedProjectFileData);
  vscode.window.showInformationMessage(
    `Project metadata updated at ${projectFilePath.fsPath}`
  );
}

export const projectFileExists = async () => {
  const workspaceFolder = vscode.workspace.workspaceFolders
    ? vscode.workspace.workspaceFolders[0]
    : undefined;
  if (!workspaceFolder) {
    return false;
  }
  const projectFilePath = vscode.Uri.joinPath(
    workspaceFolder.uri,
    "metadata.json"
  );
  const fileExists = await vscode.workspace.fs.stat(projectFilePath).then(
    () => true,
    () => false
  );
  return fileExists;
};

export async function parseBibleFile(bibleFile: string | undefined) {
  console.log("Starting to parse the Bible file.");
  if (!bibleFile) {
    console.error("No Bible file provided.");
    return;
  }
  console.log(`Bible file provided: ${bibleFile}`);

  bibleFile = bibleFile.replace(/\.txt$/, '.bible');

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    console.error("No workspace folders found.");
    return;
  }

  const bibleFilePath = vscode.Uri.joinPath(workspaceFolders[0].uri, ".project/targetTextBibles", path.basename(bibleFile));
  console.log(`Constructed file path: ${bibleFilePath}`);
  let bibleData;
  try {
    console.log(`Attempting to read the Bible file from path: ${bibleFilePath}`);
    bibleData = await vscode.workspace.fs.readFile(bibleFilePath);
    console.log("Bible file read successfully.");
  } catch (error) {
    console.error("Failed to read the Bible file:", error);
    return;
  }
  const bibleText = new TextDecoder("utf-8").decode(bibleData);
  console.log("Bible text decoded successfully.");
  const lines = bibleText.split(/\r?\n/);
  console.log(`Total lines found in the Bible text: ${lines.length}`);
  const books: { [key: string]: string[] } = {};

  lines.forEach(line => {
    const bookCode = line.substring(0, 3);
    if (!books[bookCode]) {
      books[bookCode] = [];
      console.log(`New book found and added: ${bookCode}`);
    }
    books[bookCode].push(line);
  });

  console.log(`Total books parsed: ${Object.keys(books).length}`);

  for (const [bookCode, content] of Object.entries(books)) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      console.error("No workspace folders found.");
      return;
    }
    console.log(`Using workspace folder: ${workspaceFolders[0].uri.fsPath}`);

    const targetPath = vscode.Uri.joinPath(
      workspaceFolders[0].uri,
      `.project/targetTextBibles/books/${bookCode}.txt`
    );
    console.log(`Target path for writing: ${targetPath}`);
    const fileContent = content.join("\n");
    try {
      console.log(`Writing to file for book ${bookCode}`);
      await vscode.workspace.fs.writeFile(targetPath, new TextEncoder().encode(fileContent));
      console.log(`File written for book ${bookCode} at ${targetPath.fsPath}`);
    } catch (error) {
      console.error(`Failed to write file for book ${bookCode}:`, error);
    }
  }
  createProjectNotebooksFromTxt({
    shouldOverWrite: true,
    folderWithTxtToConvert: [vscode.Uri.joinPath(workspaceFolders[0].uri, ".project/targetTextBibles/books")]

  });
}