import { nonCanonicalBookRefs } from "./verseRefUtils/verseData";
import { LanguageMetadata, LanguageProjectStatus, Project } from "codex-types";
import { getAllBookRefs } from "./verseRefUtils";
import * as vscode from "vscode";
import { LanguageCodes } from "./languageUtils";

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

  const quickPickItems = [
    ...languages.map(getLanguageDisplayName),
    "$(add) Custom Language"
  ];

  const targetLanguagePick = await vscode.window.showQuickPick(quickPickItems, {
    placeHolder: "Select the target language or choose custom",
    matchOnDescription: true,
    matchOnDetail: true,
  });

  if (!targetLanguagePick) {
    return;
  }

  let targetLanguage: LanguageMetadata;

  if (targetLanguagePick === "$(add) Custom Language") {
    const customLanguage = await vscode.window.showInputBox({
      prompt: "Enter custom language name",
      placeHolder: "e.g., My Custom Language",
    });

    if (!customLanguage) {
      return;
    }

    targetLanguage = {
      name: {
        "en": customLanguage,
      },
      tag: "custom",
      refName: customLanguage,
      projectStatus: LanguageProjectStatus.TARGET,
    };
  } else {
    const selectedLanguage = languages.find(
      (lang: LanguageMetadata) =>
        getLanguageDisplayName(lang) === targetLanguagePick
    );

    if (!selectedLanguage) {
      return;
    }

    targetLanguage = {
      ...selectedLanguage,
      projectStatus: LanguageProjectStatus.TARGET,
    };
  }

  return {
    targetLanguage,
  };
}

export async function promptForSourceLanguage(): Promise<
  ProjectDetails | undefined
> {
  const languages = LanguageCodes;
  
  function getLanguageDisplayName(lang: LanguageMetadata): string {
    return `${lang.refName} (${lang.tag})`;
  }

  const quickPickItems = [
    ...languages.map(getLanguageDisplayName),
    "$(add) Custom Language"
  ];

  const sourceLanguagePick = await vscode.window.showQuickPick(quickPickItems, {
    placeHolder: "Select the source language or choose custom",
    matchOnDescription: true,
    matchOnDetail: true,
  });

  if (!sourceLanguagePick) {
    return;
  }

  let sourceLanguage: LanguageMetadata;

  if (sourceLanguagePick === "$(add) Custom Language") {
    const customLanguage = await vscode.window.showInputBox({
      prompt: "Enter custom language name",
      placeHolder: "e.g., My Custom Language",
    });

    if (!customLanguage) {
      return;
    }

    sourceLanguage = {
      name: {
        "en": customLanguage,
      },
      tag: "custom",
      refName: customLanguage,
      projectStatus: LanguageProjectStatus.SOURCE,
    };
  } else {
    const selectedLanguage = languages.find(
      (lang: LanguageMetadata) =>
        getLanguageDisplayName(lang) === sourceLanguagePick
    );

    if (!selectedLanguage) {
      return;
    }

    sourceLanguage = {
      ...selectedLanguage,
      projectStatus: LanguageProjectStatus.SOURCE,
    };
  }

  return {
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
      "Codex Project",
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
          "Unknown",
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
