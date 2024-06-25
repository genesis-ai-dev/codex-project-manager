import * as vscode from "vscode";

export const migration_changeDraftFolderToFilesFolder = async () => {
  // Assuming your workspace has a single root folder
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders && workspaceFolders.length > 0) {
    const rootUri = workspaceFolders[0].uri;
    const metadataUri = vscode.Uri.joinPath(rootUri, "metadata.json");
    const draftsUri = vscode.Uri.joinPath(rootUri, "drafts");
    const filesUri = vscode.Uri.joinPath(rootUri, "files");

    try {
      // Check if the 'metadata.json' file exists by trying to read it
      await vscode.workspace.fs.stat(metadataUri);

      try {
        // Check if the 'drafts' folder exists by trying to read it
        const draftsFolder = await vscode.workspace.fs.readDirectory(draftsUri);

        // If the read succeeds, the folder exists, and we can attempt to rename it
        if (draftsFolder) {
          await vscode.workspace.fs.rename(draftsUri, filesUri, {
            overwrite: false,
          });
          console.log('Renamed "drafts" folder to "files".');
        }
      } catch (error) {
        // If the read fails, the folder likely doesn't exist, so we catch the error
        // You might want to check the error code to ensure it's because the folder doesn't exist
        // and not due to some other issue
        console.error(
          'Error checking for or renaming "drafts" to "files":',
          error
        );
      }
    } catch (error) {
      console.error('The "metadata.json" file does not exist:', error);
    }
  }
};
