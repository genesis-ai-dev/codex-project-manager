import * as vscode from 'vscode';
import { promptForProjectDetails, updateMetadataFile } from './utils/projectUtils';








export async function activate(context: vscode.ExtensionContext) {
  console.log('Codex Project Manager is now active!');

  context.subscriptions.push(
    vscode.commands.registerCommand('codex-project-manager.initializeNewProject', async () => {
      const projectDetails = await promptForProjectDetails();
      if (projectDetails) {
        await updateProjectSettings(projectDetails);
      }
    }),
    vscode.commands.registerCommand('codex-project-manager.openProjectSettings', () =>
      vscode.commands.executeCommand('workbench.action.openWorkspaceSettings', 'codex-project-manager')
    ),
    vscode.commands.registerCommand('codex-project-manager.startWalkthrough',
      async () => {
        vscode.commands.executeCommand('welcome.showWalkthrough', 'codex-project-manager.codexWalkthrough');
      }
    ),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('codex-project-manager')) {
        updateMetadataFile();
      }
    })
  );

  // prompt user to install workplace recommended extensions
  const workspaceRecommendedExtensions = vscode.workspace.getConfiguration('codex-project-manager').get('workspaceRecommendedExtensions');
  if (workspaceRecommendedExtensions) {
    vscode.window.showInformationMessage('Codex Project Manager has recommended extensions for you to install. Would you like to install them now?', 'Yes', 'No').then((response) => {
      const recommendedExtensions = workspaceRecommendedExtensions as string[];
      recommendedExtensions.forEach((extension) => {
        vscode.commands.executeCommand('workbench.extensions.installExtension', extension);
      });
    }
    );
  }
}

async function updateProjectSettings(projectDetails: any) {
  const projectSettings = vscode.workspace.getConfiguration('codex-project-manager');
  await projectSettings.update('projectName', projectDetails.projectName, vscode.ConfigurationTarget.Workspace);
  await projectSettings.update('projectCategory', projectDetails.projectCategory, vscode.ConfigurationTarget.Workspace);
  await projectSettings.update('userName', projectDetails.userName, vscode.ConfigurationTarget.Workspace);
  await projectSettings.update('abbreviation', projectDetails.abbreviation, vscode.ConfigurationTarget.Workspace);
  await projectSettings.update('sourceLanguage', projectDetails.sourceLanguage, vscode.ConfigurationTarget.Workspace);
  await projectSettings.update('targetLanguage', projectDetails.targetLanguage, vscode.ConfigurationTarget.Workspace);
}

export function deactivate() {
  console.log('Codex Project Manager is now deactivated!');
}