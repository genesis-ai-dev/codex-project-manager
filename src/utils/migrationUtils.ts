import * as vscode from "vscode";

export const migration_changeDraftFolderToFilesFolder = async () => {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders && workspaceFolders.length > 0) {
    const rootUri = workspaceFolders[0].uri;
    const metadataUri = vscode.Uri.joinPath(rootUri, "metadata.json");
    const draftsUri = vscode.Uri.joinPath(rootUri, "drafts");
    const filesUri = vscode.Uri.joinPath(rootUri, "files");

    try {
      // Check if the 'metadata.json' file exists
      await vscode.workspace.fs.stat(metadataUri);

      // Check if the 'drafts' folder exists
      try {
        const draftsFolder = await vscode.workspace.fs.readDirectory(draftsUri);

        // If the read succeeds, the folder exists, and we can attempt to rename it
        if (draftsFolder) {
          await vscode.workspace.fs.rename(draftsUri, filesUri, {
            overwrite: false,
          });
          console.log('Renamed "drafts" folder to "files".');
        }
      } catch (error) {
        // If the 'drafts' folder doesn't exist, we quietly pass
        console.log('The "drafts" folder does not exist. No action needed.');
      }
    } catch (error) {
      console.log('The "metadata.json" file does not exist. No action needed.');
    }
  }
};
