import * as vscode from "vscode";

import {
  ProjectDetails,
  promptForProjectDetails,
  updateMetadataFile,
} from "./utils/projectUtils";
import { vrefData } from "./utils/verseRefUtils/verseData";
import {
  checkForMissingFiles,
  downloadBible,
  initializeProject,
  setSourceAndTargetLanguage,
  setTargetFont,
} from "./utils/projectInitializers";
import { migration_changeDraftFolderToFilesFolder } from "./utils/migartionUtils";

const createProjectFiles = async ({
  shouldImportUSFM,
}: {
  shouldImportUSFM: boolean;
}) => {
  const projectDetails = await promptForProjectDetails();
  if (projectDetails) {
    await updateProjectSettings(projectDetails);
  }
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
      "codex-project-manager.setSourceAndTargetLanguage",
      async () => {
        await setSourceAndTargetLanguage();
      }
    ),
    vscode.commands.registerCommand(
      "codex-project-manager.nameProject",
      async () => {
        const settingUri = vscode.Uri.file(
          vscode.workspace.getConfiguration().get("settings.json") || ""
        );
        await vscode.commands.executeCommand("vscode.open", settingUri, {
          viewColumn: vscode.ViewColumn.Beside,
        });
        // await vscode.commands.executeCommand(
        //   "workbench.action.closeActiveEditor"
        // );
        await vscode.commands.executeCommand(
          "workbench.action.openWorkspaceSettings",
          "@ext:project-accelerate.codex-project-manager codex-project-manager.projectName"
        );
      }
    ),
    vscode.commands.registerCommand(
      "codex-project-manager.userName",
      async () => {
        const settingUri = vscode.Uri.file(
          vscode.workspace.getConfiguration().get("settings.json") || ""
        );
        await vscode.commands.executeCommand("vscode.open", settingUri, {
          viewColumn: vscode.ViewColumn.Beside,
        });
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
  await projectSettings.update(
    "projectName",
    projectDetails.projectName,
    vscode.ConfigurationTarget.Workspace
  );
  await projectSettings.update(
    "projectCategory",
    projectDetails.projectCategory,
    vscode.ConfigurationTarget.Workspace
  );
  await projectSettings.update(
    "userName",
    projectDetails.userName,
    vscode.ConfigurationTarget.Workspace
  );
  await projectSettings.update(
    "abbreviation",
    projectDetails.abbreviation,
    vscode.ConfigurationTarget.Workspace
  );
  await projectSettings.update(
    "sourceLanguage",
    projectDetails.sourceLanguage,
    vscode.ConfigurationTarget.Workspace
  );
  await projectSettings.update(
    "targetLanguage",
    projectDetails.targetLanguage,
    vscode.ConfigurationTarget.Workspace
  );
}

export function deactivate() {
  console.log("Codex Project Manager is now deactivated!");
}
