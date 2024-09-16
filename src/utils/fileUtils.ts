// eslint-disable-next-line @typescript-eslint/naming-convention
import * as vscode from "vscode";
import { getWorkSpaceUri } from ".";
import { ChatMessageThread, NotebookCommentThread } from "../../types";

export const generateFiles = async ({
  filepath,
  fileContent,
  shouldOverWrite,
}: {
  filepath: string | string[];
  fileContent: Uint8Array;
  shouldOverWrite: boolean;
}) => {
  const workspaceFolder = getWorkSpaceUri();

  if (!workspaceFolder) {
    return;
  }

  let resolvedFilePath: string;

  if (Array.isArray(filepath)) {
    resolvedFilePath = vscode.Uri.joinPath(workspaceFolder, ...filepath).fsPath;
  } else {
    if (filepath.startsWith("/")) {
      resolvedFilePath = filepath;
    } else {
      resolvedFilePath = `/${filepath}`;
    }
  }

  const newFilePath = vscode.Uri.file(
    vscode.Uri.joinPath(workspaceFolder, resolvedFilePath).fsPath
  );
  let fileSuccessfullyCreated: boolean = false;

  vscode.workspace.fs.stat(newFilePath).then(
    () => {
      if (shouldOverWrite) {
        vscode.workspace.fs.writeFile(newFilePath, fileContent).then(
          () => {
            fileSuccessfullyCreated = true;
            // vscode.window.showInformationMessage(
            //     `${filepath} overwritten successfully!`,
            // );
          },
          (err) => {
            console.error(`Error: ${err}`);
            vscode.window.showErrorMessage(
              `Error overwriting ${filepath} file: ${err.message}`
            );
          }
        );
      } else {
        vscode.window.showInformationMessage(
          `${filepath} file already exists!`
        );
      }
    },
    (err) => {
      vscode.workspace.fs.writeFile(newFilePath, fileContent).then(
        () => {
          fileSuccessfullyCreated = true;
          // vscode.window.showInformationMessage(
          //     `${filepath} file created successfully!`,
          // );
        },
        (err) => {
          console.error(`Error: ${err}`);
          vscode.window.showErrorMessage(
            `Error creating new ${filepath} file: ${err.message}`
          );
        }
      );
    }
  );
  return fileSuccessfullyCreated;
};

export async function writeSerializedData(
  serializedData: string,
  filename: string
) {
  const fileHandler = new FileHandler();

  try {
    await fileHandler.writeFile(filename, serializedData);
    console.log("Write operation completed.");
  } catch (error) {
    console.error("Error writing file:", error);
  }
}

export class FileHandler {
  async writeFile(filename: string, data: string): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      throw new Error("No workspace folders found.");
    }
    const uri = vscode.Uri.joinPath(workspaceFolders[0].uri, filename);
    console.log(`Attempting to write file: ${uri.fsPath}`); // Log the file path

    const uint8Array = new TextEncoder().encode(data);

    try {
      await vscode.workspace.fs.writeFile(uri, uint8Array);
      console.log("File written successfully:", uri.fsPath);
    } catch (error) {
      console.error("Error writing file:", error, `Path: ${uri.fsPath}`);
    }
  }

  async readFile(filename: string): Promise<string> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      throw new Error("No workspace folders found.");
    }

    const uri = vscode.Uri.joinPath(workspaceFolders[0].uri, filename);

    try {
      const uint8Array = await vscode.workspace.fs.readFile(uri);
      return new TextDecoder().decode(uint8Array);
    } catch (error) {
      console.error("Error reading file:", error, `Path: ${uri.fsPath}`);
      throw error; // Rethrow the error to handle it in the calling code
    }
  }
}

export const getCommentsFromFile = async (
  fileName: string
): Promise<NotebookCommentThread[]> => {
  try {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    console.log({ workspaceFolders });
    const filePath = workspaceFolders
      ? vscode.Uri.joinPath(workspaceFolders[0].uri, fileName).fsPath
      : "";

    const uri = vscode.Uri.file(filePath);
    const fileContentUint8Array = await vscode.workspace.fs.readFile(uri);
    const fileContent = new TextDecoder().decode(fileContentUint8Array);
    return JSON.parse(fileContent);
  } catch (error) {
    console.error(error);
    throw new Error("Failed to parse notebook comments from file");
  }
};

export const getChatMessagesFromFile = async (
  fileName: string
): Promise<ChatMessageThread[]> => {
  try {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    const filePath = workspaceFolders
      ? vscode.Uri.joinPath(workspaceFolders[0].uri, fileName).fsPath
      : "";

    const uri = vscode.Uri.file(filePath);
    const fileContentUint8Array = await vscode.workspace.fs.readFile(uri);
    const fileContent = new TextDecoder().decode(fileContentUint8Array);
    return JSON.parse(fileContent);
  } catch (error) {
    console.error(error);
    throw new Error("Failed to parse notebook comments from file");
  }
};
export function configureAutoSave() {
  const config = vscode.workspace.getConfiguration();
  // Set autoSave to 'afterDelay'
  config.update(
    "files.autoSave",
    "afterDelay",
    vscode.ConfigurationTarget.Global
  );
  // Set autoSaveDelay to 1000 milliseconds (1 second)
  config.update("files.autoSaveDelay", 1000, vscode.ConfigurationTarget.Global);
}
