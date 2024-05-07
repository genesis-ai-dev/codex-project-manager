import { useEffect } from "react";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";

const vscode = acquireVsCodeApi();

function App() {
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      switch (message.command) {
        case "stuff": {
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
      }}
    >
      <i
        className="codicon codicon-repo"
        style={{
          fontSize: "500%",
          paddingBottom: "5vh",
          color: "var(--button-primary-background)",
        }}
      ></i>
      <VSCodeButton
        onClick={() =>
          vscode.postMessage({
            command: "renameProject",
          })
        }
        style={{ marginBottom: "10vh" }}
      >
        Rename Project
      </VSCodeButton>
      <VSCodeButton
        onClick={() =>
          vscode.postMessage({
            command: "changeUserName",
          })
        }
        style={{ marginBottom: "10vh" }}
      >
        Change User Name
      </VSCodeButton>
      <VSCodeButton
        onClick={() =>
          vscode.postMessage({
            command: "changeSourceLanguage",
          })
        }
        style={{ marginBottom: "10vh" }}
      >
        Change Source Language
      </VSCodeButton>
      <VSCodeButton
        onClick={() =>
          vscode.postMessage({
            command: "changeTargetLanguage",
          })
        }
        style={{ marginBottom: "10vh" }}
      >
        Change Target Language
      </VSCodeButton>
    </div>
  );
}
export default App;
