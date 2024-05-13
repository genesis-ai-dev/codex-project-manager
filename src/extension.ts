import * as vscode from "vscode";

import {
  ProjectDetails,
  // promptForProjectDetails,
  promptForTargetLanguage,
  promptForSourceLanguage,
  updateMetadataFile,
  initializeProjectMetadata,
  projectFileExists,
} from "./utils/projectUtils";
import { vrefData } from "./utils/verseRefUtils/verseData";
import {
  checkForMissingFiles,
  downloadBible,
  initializeProject,
  // setSourceAndTargetLanguage,
  setTargetFont,
} from "./utils/projectInitializers";
import { migration_changeDraftFolderToFilesFolder } from "./utils/migartionUtils";
import { registerProjectManagerViewWebviewProvider } from "./providers/parallelPassagesWebview/customParallelPassagesWebviewProvider";

const checkIfMetadataIsInitialized = async (): Promise<boolean> => {
  const metadataUri = vscode.Uri.joinPath(
    vscode.workspace.workspaceFolders![0].uri,
    "metadata.json"
  );
  try {
    await vscode.workspace.fs.stat(metadataUri);
    return true;
  } catch (error) {
    console.error("Failed to check metadata initialization:", error);
    return false;
  }
};

const createProjectFiles = async ({
  shouldImportUSFM,
}: {
  shouldImportUSFM: boolean;
}) => {
  // const projectDetails = await promptForProjectDetails();
  try {
    await initializeProject(shouldImportUSFM);
    await checkForMissingFiles();
  } catch (error) {
    console.error(
      "Error initializing project or checking for missing files:",
      error
    );
  }
};

export async function activate(context: vscode.ExtensionContext) {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (workspaceFolder) {
    try {
      const files = await vscode.workspace.fs.readDirectory(
        workspaceFolder.uri
      );
      if (files.length === 0) {
        const choice = await vscode.window.showInformationMessage(
          "The workspace is empty. Do you want to generate codex files?",
          { modal: true },
          "Yes",
          "No"
        );
        if (choice === "Yes") {
          await checkForMissingFiles();
          initializeProject(false);
        }
      }
    } catch (error) {
      console.error("Error reading workspace directory:", error);
    }
  }
  registerProjectManagerViewWebviewProvider(context);
  await migration_changeDraftFolderToFilesFolder();
  console.log("Codex Project Manager is now active!");
  vscode.commands.registerCommand(
    "codex-project-manager.downloadSourceTextBibles",
    await downloadBible
  );
  vscode.commands.registerCommand(
    "codex-project-manager.setEditorFontToTargetLanguage",
    await setTargetFont
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "codex-project-manager.promptUserForTargetLanguage",
      async () => {
        const config = vscode.workspace.getConfiguration();
        const existingTargetLanguage = config.get("targetLanguage") as any;
        console.log("existingTargetLanguage", existingTargetLanguage);
        if (existingTargetLanguage) {
          const overwrite = await vscode.window.showWarningMessage(
            `The target language is already set to ${existingTargetLanguage.refName}. Do you want to overwrite it?`,
            "Yes",
            "No"
          );
          if (overwrite === "Yes") {
            const projectDetails = await promptForTargetLanguage();
            const targetLanguage = projectDetails?.targetLanguage;
            if (targetLanguage) {
              await updateProjectSettings(projectDetails);
              vscode.window.showInformationMessage(
                `Target language updated to ${targetLanguage.refName}.`
              );
            }
          } else {
            vscode.window.showInformationMessage(
              "Target language update cancelled."
            );
          }
        } else {
          const projectDetails = await promptForTargetLanguage();
          const targetLanguage = projectDetails?.targetLanguage;
          if (targetLanguage) {
            await updateProjectSettings(projectDetails);
            vscode.window.showInformationMessage(
              `Target language set to ${targetLanguage.refName}.`
            );
          }
        }
        // const targetLanguage = await promptForTargetLanguage();
        // if (targetLanguage) {
        //   await updateProjectSettings(targetLanguage);
        // }
      }
    ),
    vscode.commands.registerCommand(
      "codex-project-manager.promptUserForSourceLanguage",
      async () => {
        try {
          const projectDetails = await promptForSourceLanguage();
          const sourceLanguage = projectDetails?.sourceLanguage;
          console.log("sourceLanguage", sourceLanguage);
          if (sourceLanguage) {
            await updateProjectSettings(projectDetails);
            vscode.window.showInformationMessage(
              `Source language set to ${sourceLanguage.refName}.`
            );
          }
        } catch (error) {
          vscode.window.showErrorMessage(
            `Failed to set source language: ${error}`
          );
        }
      }
    ),
    vscode.commands.registerCommand(
      "codex-project-manager.initializeNewProject",
      async () => {
        await createProjectFiles({ shouldImportUSFM: false });
      }
    ),
    vscode.commands.registerCommand(
      "codex-project-manager.initializeImportProject",
      async () => {
        await createProjectFiles({ shouldImportUSFM: true });
      }
    ),
    vscode.commands.registerCommand(
      "codex-project-manager.generateMetadataFiles",
      async () => {
        await checkForMissingFiles();
      }
    ),
    vscode.commands.registerCommand(
      "codex-project-manager.nameProject",
      async (commandOnly: boolean = false) => {
        const isMetadataInitialized = await checkIfMetadataIsInitialized();

        if (!isMetadataInitialized) {
          await checkForMissingFiles();
          await initializeProjectMetadata({});
        }
        if (!commandOnly) {
          const settingUri = vscode.Uri.file(
            vscode.workspace.getConfiguration().get("settings.json") || ""
          );
          await vscode.commands.executeCommand("vscode.open", settingUri, {
            viewColumn: vscode.ViewColumn.Beside,
          });
        }

        await vscode.commands.executeCommand(
          "workbench.action.openWorkspaceSettings",
          "@ext:project-accelerate.codex-project-manager codex-project-manager.projectName"
        );
      }
    ),
    vscode.commands.registerCommand(
      "codex-project-manager.userName",
      async (commandOnly: boolean = false) => {
        const isMetadataInitialized = await checkIfMetadataIsInitialized();
        if (!isMetadataInitialized) {
          await checkForMissingFiles();
          await initializeProjectMetadata({});
        }
        if (!commandOnly) {
          const settingUri = vscode.Uri.file(
            vscode.workspace.getConfiguration().get("settings.json") || ""
          );
          await vscode.commands.executeCommand("vscode.open", settingUri, {
            viewColumn: vscode.ViewColumn.Beside,
          });
        }
        // await vscode.commands.executeCommand(
        //   "workbench.action.closeActiveEditor"
        // );
        await vscode.commands.executeCommand(
          "workbench.action.openWorkspaceSettings",
          "@ext:project-accelerate.codex-project-manager codex-project-manager.userName"
        );
      }
    ),
    vscode.commands.registerCommand(
      "codex-project-manager.openProjectSettings",
      () =>
        vscode.commands.executeCommand(
          "workbench.action.openWorkspaceSettings",
          "codex-project-manager"
        )
    ),
    vscode.commands.registerCommand(
      "codex-project-manager.startWalkthrough",
      () => {
        vscode.commands.executeCommand(
          "workbench.action.openWalkthrough",
          {
            category:
              "project-accelerate.codex-project-manager#codexWalkthrough",
            step: "project-accelerate.codex-project-manager#openFolder",
          },
          true
        );
      }
    ),
    vscode.commands.registerCommand(
      "codex-project-manager.editProjectSettings",
      () => {
        vscode.commands.executeCommand(
          "workbench.action.openWalkthrough",
          {
            category:
              "project-accelerate.codex-project-manager#codexWalkthrough",
            step: "projectName",
          },
          true
        );
      }
    ),
    // startTranslating opens a quick pick with the list of books in the source language
    vscode.commands.registerCommand(
      "codex-project-manager.startTranslating",
      async () => {
        const bookRefs = Object.keys(vrefData);
        const bookNames = bookRefs.map((ref) => vrefData[ref].name);
        const selectedBook =
          bookNames ?? vscode.window.showQuickPick(bookNames);
        if (selectedBook) {
          vscode.commands.executeCommand(
            "workbench.view.extension.scripture-explorer-activity-bar"
          );
          vscode.commands.executeCommand("workbench.action.focusAuxiliaryBar");
          vscode.commands.executeCommand(
            "codex-editor.setEditorFontToTargetLanguage"
          );
        }
      }
    ),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("codex-project-manager")) {
        updateMetadataFile();
      }
    })
  );

  // prompt user to install workplace recommended extensions
  const workspaceRecommendedExtensions = vscode.workspace
    .getConfiguration("codex-project-manager")
    .get("workspaceRecommendedExtensions");
  if (workspaceRecommendedExtensions) {
    vscode.window
      .showInformationMessage(
        "Codex Project Manager has recommended extensions for you to install. Would you like to install them now?",
        "Yes",
        "No"
      )
      .then((response) => {
        const recommendedExtensions =
          workspaceRecommendedExtensions as string[];
        recommendedExtensions.forEach((extension) => {
          vscode.commands.executeCommand(
            "workbench.extensions.installExtension",
            extension
          );
        });
      });
  }
}

async function updateProjectSettings(projectDetails: ProjectDetails) {
  const projectSettings = vscode.workspace.getConfiguration(
    "codex-project-manager"
  );
  if (projectDetails.projectName) {
    await projectSettings.update(
      "projectName",
      projectDetails.projectName,
      vscode.ConfigurationTarget.Workspace
    );
  }
  if (projectDetails.projectCategory) {
    await projectSettings.update(
      "projectCategory",
      projectDetails.projectCategory,
      vscode.ConfigurationTarget.Workspace
    );
  }
  if (projectDetails.userName) {
    await projectSettings.update(
      "userName",
      projectDetails.userName,
      vscode.ConfigurationTarget.Workspace
    );
  }
  if (projectDetails.abbreviation) {
    await projectSettings.update(
      "abbreviation",
      projectDetails.abbreviation,
      vscode.ConfigurationTarget.Workspace
    );
  }
  if (projectDetails.sourceLanguage) {
    await projectSettings.update(
      "sourceLanguage",
      projectDetails.sourceLanguage,
      vscode.ConfigurationTarget.Workspace
    );
  }
  if (projectDetails.targetLanguage) {
    await projectSettings.update(
      "targetLanguage",
      projectDetails.targetLanguage,
      vscode.ConfigurationTarget.Workspace
    );
  }
}

export function deactivate() {
  console.log("Codex Project Manager is now deactivated!");
}
