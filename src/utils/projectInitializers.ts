import * as vscode from "vscode";
import {
  createProjectCommentFiles,
  createProjectNotebooks,
} from "../utils/codexNotebookUtils";
import { getProjectMetadata, getWorkSpaceFolder } from "../utils";
import { LanguageProjectStatus } from "codex-types";
import {
  ProjectDetails,
  initializeProjectMetadata,
  promptForProjectDetails,
} from "../utils/projectUtils";
// import {
//     indexVerseRefsInSourceText,
// } from "../commands/indexVrefsCommand";
import * as path from "path";
import {
  EbibleCorpusMetadata,
  downloadEBibleText,
  ensureVrefList,
  getEBCorpusMetadataByLanguageCode,
} from "../utils/ebibleCorpusUtils";

const ROOT_PATH = getWorkSpaceFolder();

const PATHS_TO_POPULATE = [
  // "metadata.json", // This is where we store the project metadata in scripture burrito format, but we create this using the project initialization command
  { filePath: "files/" }, // This is where we store the project files, including project.dictionary and embedding dbs
  { filePath: "files/target/" }, // This is where we store the drafted scripture in particular as .codex files
  { filePath: "files/project.dictionary", defaultContent: "" }, // This is where we store the project dictionary
  { filePath: "comments.json", defaultContent: "" }, // This is where we store the VS Code comments api comments, such as on .bible files
  { filePath: "file-comments.json", defaultContent: "[]" }, // We can't use the VS Code comments api for notebooks (.codex files) and other non standard files, so a second files avoids overwriting conflicts
  { filePath: "chat-threads.json", defaultContent: "[]" }, // This is where chat thread conversations are saved
];
export async function downloadBible() {
  const projectMetadata = await getProjectMetadata();
  const sourceLanguageCode = projectMetadata?.languages?.find(
    (language) => language.projectStatus === LanguageProjectStatus.SOURCE
  )?.tag;
  let ebibleCorpusMetadata: EbibleCorpusMetadata[] =
    getEBCorpusMetadataByLanguageCode(sourceLanguageCode || "");
  if (ebibleCorpusMetadata.length === 0) {
    vscode.window.showInformationMessage(
      `No source text bibles found for ${
        sourceLanguageCode || "(no source language specified in metadata.json)"
      } in the eBible corpus.`
    );
    ebibleCorpusMetadata = getEBCorpusMetadataByLanguageCode(""); // Get all bibles if no source language is specified
  }
  const selectedCorpus = await vscode.window.showQuickPick(
    ebibleCorpusMetadata.map((corpus) => corpus.file),
    {
      placeHolder: "Select a source text bible to download",
    }
  );

  if (selectedCorpus) {
    const selectedCorpusMetadata = ebibleCorpusMetadata.find(
      (corpus) => corpus.file === selectedCorpus
    );
    if (selectedCorpusMetadata) {
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
      if (workspaceRoot) {
        const vrefPath = await ensureVrefList(workspaceRoot);

        const sourceTextBiblePath = path.join(
          workspaceRoot,
          ".project",
          "sourceTextBibles",
          selectedCorpusMetadata.file
        );
        const sourceTextBiblePathUri = vscode.Uri.file(sourceTextBiblePath);
        try {
          console.log("Checking if source text bible exists");
          await vscode.workspace.fs.stat(sourceTextBiblePathUri);
          vscode.window.showInformationMessage(
            `Source text bible ${selectedCorpusMetadata.file} already exists.`
          );
        } catch {
          await downloadEBibleText(selectedCorpusMetadata, workspaceRoot);
          vscode.window.showInformationMessage(
            `Source text bible for ${selectedCorpusMetadata.lang} downloaded successfully.`
          );
        }

        // Read the vref.txt file and the newly downloaded source text bible file
        const vrefFilePath = vscode.Uri.file(vrefPath);
        const vrefFileData = await vscode.workspace.fs.readFile(vrefFilePath);
        const vrefLines = new TextDecoder("utf-8")
          .decode(vrefFileData)
          .split(/\r?\n/);

        const sourceTextBibleData = await vscode.workspace.fs.readFile(
          sourceTextBiblePathUri
        );
        const bibleLines = new TextDecoder("utf-8")
          .decode(sourceTextBibleData)
          .split(/\r?\n/);

        // Zip the lines together
        const zippedLines = vrefLines
          .map((vrefLine, index) => `${vrefLine} ${bibleLines[index] || ""}`)
          .filter((line) => line.trim() !== "");

        // Write the zipped lines to a new .bible file
        let fileNameWithoutExtension;
        if (selectedCorpusMetadata.file.includes(".")) {
          fileNameWithoutExtension = selectedCorpusMetadata.file.split(".")[0];
        } else {
          fileNameWithoutExtension = selectedCorpusMetadata.file;
        }

        const bibleFilePath = path.join(
          workspaceRoot,
          ".project",
          "sourceTextBibles",
          `${fileNameWithoutExtension}.bible`
        );
        const bibleFileUri = vscode.Uri.file(bibleFilePath);
        await vscode.workspace.fs.writeFile(
          bibleFileUri,
          new TextEncoder().encode(zippedLines.join("\n"))
        );

        vscode.window.showInformationMessage(
          `.bible file created successfully at ${bibleFilePath}`
        );
      }
    }
  }
  //   indexVerseRefsInSourceText();
}

export async function setTargetFont() {
  const projectMetadata = await getProjectMetadata();
  const targetLanguageCode = projectMetadata?.languages?.find(
    (language) => language.projectStatus === LanguageProjectStatus.TARGET
  )?.tag;
  if (targetLanguageCode) {
    const fontApiUrl = `https://lff.api.languagetechnology.org/lang/${targetLanguageCode}`;
    const fontApiResponse = await fetch(fontApiUrl);
    const fontApiData = (await fontApiResponse.json()) as {
      defaultfamily: string[];
      families: {
        [key: string]: {
          defaults: { ttf: string };
          files: { [key: string]: { url: string } };
        };
      };
    };
    const defaultFontFamily = fontApiData.defaultfamily[0];
    const fontFile = fontApiData.families[defaultFontFamily].defaults.ttf;
    const fontFileRemoteUrl =
      fontApiData.families[defaultFontFamily].files[fontFile].url;
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (workspaceRoot) {
      const fontFilePath = path.join(
        workspaceRoot,
        ".project",
        "fonts",
        fontFile
      );
      const fontFilePathUri = vscode.Uri.file(fontFilePath);
      try {
        await vscode.workspace.fs.stat(fontFilePathUri);
      } catch {
        const fontFileResponse = await fetch(fontFileRemoteUrl);
        const fontFileBuffer = await fontFileResponse.arrayBuffer();
        await vscode.workspace.fs.createDirectory(
          vscode.Uri.file(path.dirname(fontFilePath))
        );
        await vscode.workspace.fs.writeFile(
          fontFilePathUri,
          new Uint8Array(fontFileBuffer)
        );
      }
    }
    const config = vscode.workspace.getConfiguration();
    const fallbackFont = "serif";
    // config.update(
    //     "editor.fontFamily",
    //     fallbackFont,
    //     vscode.ConfigurationTarget.Workspace,
    // );
    config.update(
      "editor.fontFamily",
      `${defaultFontFamily} ${fallbackFont}`,
      vscode.ConfigurationTarget.Workspace
    );
    vscode.window.showInformationMessage(
      `Font set to ${defaultFontFamily} with fallback to ${fallbackFont}`
    );
  }
}
enum ConfirmationOptions {
  Yes = "Yes",
  No = "No",
  NotNeeded = "Not-Needed",
}

export async function setSourceAndTargetLanguage() {
  const workspaceFolder = vscode.workspace.workspaceFolders
    ? vscode.workspace.workspaceFolders[0]
    : undefined;
  if (!workspaceFolder) {
    console.error(
      "No workspace folder found. Please open a folder to store your project in."
    );
    return;
  }

  vscode.window.showInformationMessage("Initializing new project...");
  try {
    const projectDetails = await promptForProjectDetails();
    if (projectDetails) {
      const newProject = await initializeProjectMetadata(projectDetails);
      vscode.window.showInformationMessage(
        `New project initialized: ${newProject?.meta.generator.userName}'s ${newProject?.meta.category}`
      );
    } else {
      vscode.window.showInformationMessage("Project initialization cancelled.");
    }
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to initialize new project: ${error}`
    );
  }
  await vscode.commands.executeCommand(
    "codex-project-manager.setEditorFontToTargetLanguage"
  );
  await vscode.commands.executeCommand(
    "codex-project-manager.downloadSourceTextBibles"
  );
}

export async function initializeProject(shouldImportUSFM: boolean) {
  const workspaceFolder = vscode.workspace.workspaceFolders
    ? vscode.workspace.workspaceFolders[0]
    : undefined;
  if (!workspaceFolder) {
    console.error(
      "No workspace folder found. Please open a folder to store your project in."
    );
    return;
  }

  vscode.window.showInformationMessage("Initializing new project...");
  try {
    let projectScope;
    const projectFilePath = vscode.Uri.joinPath(
      workspaceFolder.uri,
      "metadata.json"
    );
    const fileData = await vscode.workspace.fs.readFile(projectFilePath);
    const metadata = JSON.parse(fileData.toString());
    projectScope = metadata?.type?.flavorType?.currentScope;
    if (!projectScope) {
      vscode.window.showErrorMessage(
        "Failed to initialize new project: project scope not found."
      );
      return;
    }
    const books = Object.keys(projectScope);

    const codexFiles = await vscode.workspace.findFiles("**/*.codex");
    let overwriteSelection = ConfirmationOptions.NotNeeded;

    if (codexFiles.length > 0) {
      const userChoice = await vscode.window.showWarningMessage(
        "Do you want to overwrite any existing .codex project files?",
        { modal: true }, // This option ensures the dialog stays open until an explicit choice is made.
        ConfirmationOptions.Yes,
        ConfirmationOptions.No
      );
      overwriteSelection =
        userChoice === ConfirmationOptions.Yes
          ? ConfirmationOptions.Yes
          : ConfirmationOptions.No;
    }

    switch (overwriteSelection) {
      case ConfirmationOptions.NotNeeded:
        vscode.window.showInformationMessage("Creating Codex Project.");
        break;
      case ConfirmationOptions.Yes:
        vscode.window.showInformationMessage(
          "Creating Codex Project with overwrite."
        );
        break;
      default:
        vscode.window.showInformationMessage(
          "Creating Codex Project without overwrite."
        );
        break;
    }
    const shouldOverWrite =
      overwriteSelection === ConfirmationOptions.Yes ||
      overwriteSelection === ConfirmationOptions.NotNeeded;
    let folderWithUsfmToConvert: vscode.Uri[] | undefined;
    if (shouldImportUSFM) {
      vscode.window
        .showOpenDialog({
          canSelectFolders: true,
          canSelectFiles: false,
          canSelectMany: false,
          openLabel: "Choose USFM project folder",
        })
        .then((folderUri) => {
          folderWithUsfmToConvert = folderUri;
        });
    }
    await createProjectNotebooks({
      shouldOverWrite,
      books,
      foldersWithUsfmToConvert: folderWithUsfmToConvert,
    });
    await createProjectCommentFiles({
      shouldOverWrite,
    });
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to initialize new project: ${error}`
    );
  }
  try {
    await vscode.commands.executeCommand(
      "scripture-explorer-activity-bar.refreshEntry"
    );
  } catch (error) {
    console.log("error called commands of outside extension", error);
  }
}

export async function checkForMissingFiles() {
  if (ROOT_PATH) {
    vscode.window.showInformationMessage(
      "Checking for missing project files..."
    );
    for (const fileToPopulate of PATHS_TO_POPULATE) {
      const fullPath = vscode.Uri.joinPath(
        vscode.Uri.file(ROOT_PATH),
        fileToPopulate.filePath
      );
      try {
        await vscode.workspace.fs.stat(fullPath);
      } catch (error) {
        // Determine if the missing path is a file or a directory based on its name
        if (fileToPopulate.filePath.includes(".")) {
          // Assuming it's a file if there's an extension
          vscode.window.showInformationMessage(
            `Creating file: ${fileToPopulate}`
          );
          await vscode.workspace.fs.writeFile(
            fullPath,
            new TextEncoder().encode(fileToPopulate.defaultContent || "")
          ); // Create an empty file
        } else {
          // Assuming it's a directory if there's no file extension
          vscode.window.showInformationMessage(
            `Creating directory: ${fileToPopulate}`
          );
          await vscode.workspace.fs.createDirectory(fullPath);
        }
      }
    }
  }
}

export async function handleConfig() {
  const config = vscode.workspace.getConfiguration();

  config.update("editor.wordWrap", "on", vscode.ConfigurationTarget.Workspace);
  // Turn off line numbers by default in workspace
  config.update(
    "editor.lineNumbers",
    "off",
    vscode.ConfigurationTarget.Workspace
  );
  // Set to serif font by default in workspace

  // Set to 16px font size by default in workspace
  // config.update("editor.fontSize", 16, vscode.ConfigurationTarget.Workspace);
  // Set cursor style to line-thin by default in workspace
  config.update(
    "editor.cursorStyle",
    "line-thin",
    vscode.ConfigurationTarget.Workspace
  );

  // TODO: set up the layout for the workspace
  // FIXME: this way of doing things clobbers the users existing settings.
  // These settings should probably be bundled in the app only, and not applied via the extension.

  const existingPatterns = config.get("files.readonlyInclude") || {};
  const updatedPatterns = { ...existingPatterns, "**/*.bible": true };

  config.update(
    "files.readonlyInclude",
    updatedPatterns,
    vscode.ConfigurationTarget.Global
  );
}

async function openWorkspace() {
  let workspaceFolder;
  const openFolder = await vscode.window.showOpenDialog({
    canSelectFolders: true,
    canSelectFiles: false,
    canSelectMany: false,
    openLabel: "Choose project folder",
  });
  if (openFolder && openFolder.length > 0) {
    await vscode.commands.executeCommand(
      "vscode.openFolder",
      openFolder[0],
      false
    );
    workspaceFolder = vscode.workspace.workspaceFolders
      ? vscode.workspace.workspaceFolders[0]
      : undefined;
  }
  if (!workspaceFolder) {
    return;
  }
}

export async function onBoard() {
  // The following block ensures a smooth user experience by guiding the user through the initial setup process before the extension is fully activated. This is crucial for setting up the necessary project environment and avoiding any functionality issues that might arise from missing project configurations.

  // NOTE: the following two blocks are deactivated for now while we work on the project management extension. We might not need them.
  // First, check if a project root path is set, indicating whether the user has an existing project open.
  if (!ROOT_PATH) {
    // If no project is found, prompt the user to select a project folder. This step is essential to ensure that the extension operates within the context of a project, which is necessary for most of its functionalities.
    vscode.window
      .showInformationMessage(
        "No project found. You need to select a project folder for your new project, or open an existing project folder.",
        { modal: true }, // The modal option is used here to make sure the user addresses this prompt before proceeding, ensuring that the extension does not proceed without a project context.
        "Select a Folder"
      )
      .then((result) => {
        // Depending on the user's choice, either guide them to select a folder and initialize a new project or quit the application. This decision point is crucial for aligning the extension's state with the user's intent.
        if (result === "Select a Folder") {
          openWorkspace();
          // This command initializes a new project, setting up the necessary project structure and files, ensuring that the user starts with a properly configured environment.
          vscode.commands.executeCommand(
            "codex-project-manager.initializeNewProject"
          );
        } else {
          // If the user decides not to select a folder, quitting the application prevents them from encountering unanticipated behavior due to the lack of a project context.
          vscode.commands.executeCommand("workbench.action.quit");
        }
      });
  } else {
    // If a project root path exists, check for the presence of a metadata file to determine if the project needs initialization. This step ensures that existing projects are correctly recognized and that the extension does not reinitialize them unnecessarily.
    const metadataPath = path.join(ROOT_PATH, "metadata.json");
    if (!vscode.workspace.fs.stat(vscode.Uri.file(metadataPath))) {
      // Initialize a new project if the metadata file is missing, ensuring that the project has all the necessary configurations for the extension to function correctly.
      vscode.commands.executeCommand(
        "codex-project-manager.initializeNewProject"
      );
    }
  }
}
