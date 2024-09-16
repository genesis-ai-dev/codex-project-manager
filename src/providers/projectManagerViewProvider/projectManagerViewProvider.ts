import * as vscode from "vscode";
import { jumpToCellInNotebook } from "../../utils";
import { ProjectOverview } from "../../../types";
import { getProjectOverview } from "../../utils/projectUtils";
import { initializeProjectMetadata } from "../../utils/projectUtils";

async function simpleOpen(uri: string) {
  try {
    const parsedUri = vscode.Uri.parse(uri);
    if (parsedUri.toString().includes(".codex")) {
      jumpToCellInNotebook(uri.toString(), 0);
    } else {
      const document = await vscode.workspace.openTextDocument(parsedUri);
      await vscode.window.showTextDocument(document);
    }
  } catch (error) {
    console.error(`Failed to open file: ${uri}`, error);
  }
}

async function jumpToFirstOccurrence(uri: string, word: string) {
  const chapter = word.split(":");
  jumpToCellInNotebook(uri, parseInt(chapter[0], 10));
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const document = editor.document;
  const text = document.getText();
  const wordIndex = text.indexOf(word);

  if (wordIndex === -1) {
    return;
  }

  const position = document.positionAt(wordIndex);
  editor.selection = new vscode.Selection(position, position);
  editor.revealRange(
    new vscode.Range(position, position),
    vscode.TextEditorRevealType.InCenter
  );

  vscode.window.showInformationMessage(
    `Jumped to the first occurrence of "${word}"`
  );
}

const loadWebviewHtml = (
  webviewView: vscode.WebviewView,
  extensionUri: vscode.Uri
) => {
  webviewView.webview.options = {
    enableScripts: true,
    localResourceRoots: [extensionUri],
  };

  const styleResetUri = webviewView.webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "src", "assets", "reset.css")
  );
  const styleVSCodeUri = webviewView.webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "src", "assets", "vscode.css")
  );

  const scriptUri = webviewView.webview.asWebviewUri(
    vscode.Uri.joinPath(
      extensionUri,
      "webviews",
      "dist",
      "ProjectManagerView",
      "index.js"
    )
  );
  const styleUri = webviewView.webview.asWebviewUri(
    vscode.Uri.joinPath(
      extensionUri,
      "webviews",
      "dist",
      "ProjectManagerView",
      "index.css"
    )
  );
  const codiconsUri = webviewView.webview.asWebviewUri(
    vscode.Uri.joinPath(
      extensionUri,
      "node_modules",
      "@vscode/codicons",
      "dist",
      "codicon.css"
    )
  );
  function getNonce() {
    let text = "";
    const possible =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
  const nonce = getNonce();
  const html = /*html*/ `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <!--
      Use a content security policy to only allow loading images from https or from our extension directory,
      and only allow scripts that have a specific nonce.
    -->
    <meta http-equiv="Content-Security-Policy" content="img-src https: data:; style-src 'unsafe-inline' ${webviewView.webview.cspSource
    }; script-src 'nonce-${nonce}';">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="${styleResetUri}" rel="stylesheet">
    <link href="${styleVSCodeUri}" rel="stylesheet">
    <link href="${styleUri}" rel="stylesheet">
    <link href="${codiconsUri}" rel="stylesheet" />
    <script nonce="${nonce}">
      const apiBaseUrl = ${JSON.stringify("http://localhost:3002")}
    </script>
    </head>
    <body>
    <div id="root"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
  </body>
  </html>`;

  webviewView.webview.html = html;
};

export class CustomWebviewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private _context: vscode.ExtensionContext;
  private _projectOverview?: ProjectOverview;

  constructor(context: vscode.ExtensionContext) {
    this._context = context;
  }

  async resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;
    loadWebviewHtml(webviewView, this._context.extensionUri);

    // Wait for the webview to signal it's ready
    await new Promise<void>((resolve) => {
      const readyListener = webviewView.webview.onDidReceiveMessage(
        (message) => {
          if (message.command === "webviewReady") {
            resolve();
            readyListener.dispose();
          }
        }
      );
    });

    // Initial project overview fetch
    await this.updateProjectOverview();

    // Add message listener
    webviewView.webview.onDidReceiveMessage(async (message: any) => {
      switch (message.command) {
        case "requestProjectOverview":
          console.log("requestProjectOverview called in provider");
          await this.updateProjectOverview(true);
          break;
        case "openProjectSettings":
          vscode.commands.executeCommand(
            "codex-project-manager.editProjectSettings"
          );
          break;
        case "renameProject":
          vscode.commands.executeCommand(
            "codex-project-manager.nameProject",
            true
          );
          break;
        case "changeUserName":
          vscode.commands.executeCommand(
            "codex-project-manager.userName",
            true
          );
          break;
        case "editAbbreviation":
          vscode.commands.executeCommand(
            "codex-project-manager.editAbbreviation"
          );
          break;
        case "changeSourceLanguage":
          console.log("changeSourceLanguage called");
          vscode.commands.executeCommand(
            "codex-project-manager.promptUserForSourceLanguage"
          );
          break;
        case "changeTargetLanguage":
          vscode.commands.executeCommand(
            "codex-project-manager.promptUserForTargetLanguage"
          );
          break;
        case "downloadTargetTextBibles":
          vscode.commands.executeCommand(
            "codex-project-manager.downloadTargetTextBibles"
          );
          break;
        case "openAISettings":
          vscode.commands.executeCommand(
            "codex-project-manager.openAISettings"
          );
          break;
        case "selectCategory":
          vscode.commands.executeCommand(
            "codex-project-manager.selectCategory"
          );
          break;
        case "downloadSourceTextBibles":
          vscode.commands.executeCommand(
            "codex-project-manager.downloadSourceTextBibles"
          );
          break;
        case "createNewProject":
          await this.createNewProject();
          break;
        case "openBible":
          vscode.window.showInformationMessage(
            `Opening bible: ${JSON.stringify(message)}`
          );
          simpleOpen(message.data.path);
          break;
        case "webviewReady":
          break;
        default:
          console.error(`Unknown command: ${message.command}`);
      }
    });

    // Set up a listener for configuration changes
    vscode.workspace.onDidChangeConfiguration(async (event) => {
      if (event.affectsConfiguration("codex-project-manager")) {
        await this.updateProjectOverview();
      }
    });
  }

  private webviewHasInitialProjectOverviewData: boolean = false;

  private async updateProjectOverview(force: boolean = false) {
    try {
      const newProjectOverview = await getProjectOverview();

      if (!newProjectOverview) {
        // If no project overview is available, send a message to show the "Create New Project" button
        this._view?.webview.postMessage({
          command: "noProjectFound",
        });
        this.webviewHasInitialProjectOverviewData = true;
      } else if (!this.webviewHasInitialProjectOverviewData || force) {
        this._view?.webview.postMessage({
          command: "sendProjectOverview",
          data: newProjectOverview,
        });
        this.webviewHasInitialProjectOverviewData = true;
      } else if (
        JSON.stringify(newProjectOverview) !==
        JSON.stringify(this._projectOverview)
      ) {
        this._projectOverview = newProjectOverview;
        this._view?.webview.postMessage({
          command: "sendProjectOverview",
          data: this._projectOverview,
        });
      }
    } catch (error) {
      console.error("Error updating project overview:", error);
      this._view?.webview.postMessage({
        command: "error",
        message: "Failed to load project overview. Please try again.",
      });
    }
  }

  private async createNewProject() {
    try {
      await initializeProjectMetadata({});
      // Wait a short moment to ensure the file system has time to update
      await new Promise(resolve => setTimeout(resolve, 500));

      const newProjectOverview = await getProjectOverview();
      if (newProjectOverview) {
        this._projectOverview = newProjectOverview;
        this._view?.webview.postMessage({
          command: "projectCreated",
          data: newProjectOverview,
        });
      } else {
        console.warn("Project created but overview not immediately available");
        // Instead of throwing an error, we'll send a message to refresh
        this._view?.webview.postMessage({
          command: "refreshProjectOverview",
        });
      }
    } catch (error) {
      console.error("Error creating new project:", error);
      this._view?.webview.postMessage({
        command: "error",
        message: "Failed to create new project. Please try again.",
      });
    }
  }
}

export function registerProjectManagerViewWebviewProvider(
  context: vscode.ExtensionContext
) {
  const provider = new CustomWebviewProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "project-manager-sidebar",
      provider
    )
  );

  // .show() the sidebar / view
  vscode.commands.executeCommand("project-manager-sidebar.show");
}
