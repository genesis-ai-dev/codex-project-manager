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

  const openProjectSettings = () => {
    vscode.postMessage({
      command: "openProjectSettings",
    });
  };

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
        onClick={() => openProjectSettings()}
        style={{ marginBottom: "10vh" }}
      >
        Open Project Settings
      </VSCodeButton>
    </div>
  );
}
export default App;
