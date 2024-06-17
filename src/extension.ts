import * as vscode from "vscode";
import { LanguageProjectStatus } from "codex-types";

import {
  ProjectDetails,
  // promptForProjectDetails,
  promptForTargetLanguage,
  promptForSourceLanguage,
  updateMetadataFile,
  initializeProjectMetadata,
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
import { configureAutoSave } from "./utils/fileUtils";

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

async function accessMetadataFile() {
  // Accessing the metadata file
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage(
      "No workspace folder found. Please open a folder to store your project in."
    );
    return;
  }
  const workspaceFolder = workspaceFolders[0];
  const metadataFilePath = vscode.Uri.joinPath(workspaceFolder.uri, "metadata.json");
  try {
    const fileData = await vscode.workspace.fs.readFile(metadataFilePath);
    const metadata = JSON.parse(fileData.toString());
    return metadata;
  } catch (error) {
    //vscode.window.showErrorMessage("Failed to read metadata file: " + error);
    return;
  }
}

async function reopenWalkthrough() {
    
  await vscode.commands.executeCommand("workbench.action.closeAllGroups");
    
  await vscode.window.showInformationMessage(
    "You must complete the walkthrough before proceeding.",
    { modal: true },
    "OK"
  );
    
  //reopens the walkthrough in the current editor group
  await vscode.commands.executeCommand(
    "workbench.action.openWalkthrough",
    {
      category: "project-accelerate.codex-project-manager#codexWalkthrough",
      step: "project-accelerate.codex-project-manager#openFolder",
    },
    false
  );

}

export async function activate(context: vscode.ExtensionContext) {

  let isProjectInitialized = context.workspaceState.get<boolean>('isProjectInitialized', false);
  let isWalkthroughCompleted = context.workspaceState.get<boolean>('isWalkthroughCompleted', false);
  let redirecting = false;

  // Register webview provider
  registerProjectManagerViewWebviewProvider(context);
  // Migrate draft folder to files folder
  await migration_changeDraftFolderToFilesFolder();
  console.log("Codex Project Manager is now active!");

  //wrapper for registered commands
  const executeWithRedirecting = (command: (...args: any[]) => Promise<void>) => {
    return async (...args: any[]) => {
      if (redirecting) { return; }
      redirecting = true;
      try {
        await command(...args);
      } finally {
        redirecting = false;
      }
    };
  };
  // Redirects the user to the walkthrough if they are not in the walkthrough
  const handleEditorChange = async (editor?: vscode.TextEditor) => {
    if (!isWalkthroughCompleted && !redirecting) {
      redirecting = true;
      await reopenWalkthrough();
      redirecting = false;
    } 
  };

  
  // Delay registration of event listeners to avoid triggering on startup
  //setTimeout(async () => {

    console.log("Registering event listeners...");
    // Check if workspace folders are open
    if (
      !vscode.workspace.workspaceFolders ||
      vscode.workspace.workspaceFolders.length === 0 ||
      vscode.workspace.workspaceFolders[0].uri.fsPath === ""
    ) {
      // Start the walkthrough if no workspace folders are open
      vscode.commands.executeCommand("codex-project-manager.startWalkthrough");
    }

    // handle when any file or any other extension webview is opened
    vscode.window.onDidChangeVisibleTextEditors(async (editors) => {
      for (const editor of editors) {
        await handleEditorChange(editor);
      }
    });
//}, 3000);

  // Register commands
  vscode.commands.registerCommand(
    "codex-project-manager.openAutoSaveSettings",
    executeWithRedirecting( async () => {
      await vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "@files.autoSave"
      );
    }
  ));
  vscode.commands.registerCommand(
    "codex-project-manager.downloadSourceTextBibles",
    await downloadBible
  );
  vscode.commands.registerCommand(
    "codex-project-manager.setEditorFontToTargetLanguage",
    await setTargetFont
  );

  // Register command to prompt user for target language
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "codex-project-manager.promptUserForTargetLanguage",
      executeWithRedirecting(async () => {
        const metadata = await accessMetadataFile();
        if (!metadata?.languages?.find((lang: { projectStatus: LanguageProjectStatus }) => lang.projectStatus === LanguageProjectStatus.SOURCE)) {
          vscode.commands.executeCommand("codex-project-manager.showModalNotification");
          return;
        }
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
      })
    ),
    // Register command to prompt user for source language
    vscode.commands.registerCommand(
      "codex-project-manager.promptUserForSourceLanguage",
      executeWithRedirecting(async () => {
        const metadata = await accessMetadataFile();
        if (!metadata?.meta?.generator?.userName || metadata?.meta?.generator?.userName === "") {
          vscode.commands.executeCommand("codex-project-manager.showModalNotification");
          return;
        }
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
      })
    ),
    // Register command to initialize a new project
    vscode.commands.registerCommand(
      "codex-project-manager.initializeNewProject",
      executeWithRedirecting(async () => {
        const metadata = await accessMetadataFile();
        if (!metadata?.languages?.find((lang: { projectStatus: LanguageProjectStatus }) => lang.projectStatus === LanguageProjectStatus.TARGET)) {
          vscode.commands.executeCommand("codex-project-manager.showModalNotification");
          return;
        }
        await createProjectFiles({ shouldImportUSFM: false });
        isProjectInitialized = true;
        context.workspaceState.update('isProjectInitialized', true);
      })
    ),
    // Register command to initialize an import project
    vscode.commands.registerCommand(
      "codex-project-manager.initializeImportProject",
      executeWithRedirecting(async () => {
        const metadata = await accessMetadataFile();
        if (!metadata?.languages?.find((lang: { projectStatus: LanguageProjectStatus }) => lang.projectStatus === LanguageProjectStatus.TARGET)) {
          vscode.commands.executeCommand("codex-project-manager.showModalNotification");
          return;
        }
        await createProjectFiles({ shouldImportUSFM: true });
        isProjectInitialized = true;
        context.workspaceState.update('isProjectInitialized', true);
      })
    ),
    // Register command to generate metadata files
    vscode.commands.registerCommand(
      "codex-project-manager.generateMetadataFiles",
      executeWithRedirecting(async () => {
        await checkForMissingFiles();
      })
    ),
    // Register command to name the project
    vscode.commands.registerCommand(
      "codex-project-manager.nameProject",
      executeWithRedirecting(async (commandOnly: boolean = false) => {
        redirecting = true;
        const isMetadataInitialized = await checkIfMetadataIsInitialized();

        if (!isMetadataInitialized) {
          await checkForMissingFiles();
          await initializeProjectMetadata({});
          configureAutoSave();
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
        redirecting = false;
      })
    ),
    // Register command to set user name
    vscode.commands.registerCommand(
      "codex-project-manager.userName",
      executeWithRedirecting(async (commandOnly: boolean = false) => {
        const metadata = await accessMetadataFile();
        if (!metadata?.projectName || metadata?.projectName === "") {
          vscode.commands.executeCommand("codex-project-manager.showModalNotification");
          return;
        }
        const isMetadataInitialized = await checkIfMetadataIsInitialized();
        if (!isMetadataInitialized) {
          await checkForMissingFiles();
          await initializeProjectMetadata({});
          configureAutoSave();
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
          "@ext:project-accelerate.codex-project-manager codex-project-manager.userName"
        );
      })
    ),
    // Register command to open project settings
    vscode.commands.registerCommand(
      "codex-project-manager.openProjectSettings",
      executeWithRedirecting(async () => {
        vscode.commands.executeCommand(
          "workbench.action.openWorkspaceSettings",
          "codex-project-manager"
        );
      })
    ),
    // Register command to start the walkthrough
    vscode.commands.registerCommand(
      "codex-project-manager.startWalkthrough",
      executeWithRedirecting(async () => {
        vscode.commands.executeCommand(
          "workbench.action.openWalkthrough",
          {
            category:
              "project-accelerate.codex-project-manager#codexWalkthrough",
            step: "project-accelerate.codex-project-manager#openFolder",
          },
          true
        );
      })
    ),
    // Register command to edit project settings
    vscode.commands.registerCommand(
      "codex-project-manager.editProjectSettings",
      executeWithRedirecting(async () => {
        vscode.commands.executeCommand(
          "workbench.action.openWalkthrough",
          {
            category:
              "project-accelerate.codex-project-manager#codexWalkthrough",
            step: "projectName",
          },
          true
        );
      })
    ),
    // Register command to start translating
    vscode.commands.registerCommand(
      "codex-project-manager.startTranslating",
      executeWithRedirecting(async () => {
        if (!isProjectInitialized) {
          vscode.commands.executeCommand("codex-project-manager.showModalNotification");
          return;
        }
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
        isWalkthroughCompleted = true;
        context.workspaceState.update('isWalkthroughCompleted', true);
      }
    ),
    // Register command to show modal notification
    vscode.commands.registerCommand(
      "codex-project-manager.showModalNotification",
      async () => {
          await vscode.window.showInformationMessage(
          "You must complete the previous step before proceeding.",
          { modal: true },
          "OK"
        );

      })
    ),
    // Register event listener for configuration changes
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("codex-project-manager")) {
        updateMetadataFile();
      }
    }),

    //register command to open AI settings
    vscode.commands.registerCommand(
      "codex-project-manager.openAISettings",
      async () => {
        vscode.commands.executeCommand("workbench.action.openSettings", "@ext:project-accelerate.ai-translate");
      }
    ),

    //register command to import eBible project
    vscode.commands.registerCommand(
      "codex-project-manager.importEBibleProject",
      async () => {
        await vscode.window.showInformationMessage("Importing eBible project..."); 
        //TODO: implement import eBible project
      }
    )


  );

  // Prompt user to install recommended extensions
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