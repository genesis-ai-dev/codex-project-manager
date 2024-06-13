import { useEffect } from "react";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";

const vscode = acquireVsCodeApi();

interface AccountButtonProps {
  iconClass: string;
  onClick: () => void;
  buttonDescriptionText: string;
  buttonIcon?: string;
  outerContainerStyles?: React.CSSProperties;
}

const AccountButton: React.FC<AccountButtonProps> = ({
  iconClass,
  onClick,
  buttonDescriptionText,
  buttonIcon = "codicon-pencil",
  outerContainerStyles = {},
}) => {
  return (
    <div
      style={{
        width: "100%",
        marginBottom: "1rem",
        ...outerContainerStyles,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          flexWrap: "nowrap",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            gap: "10px",
            alignItems: "center",
          }}
        >
          <i
            className={`codicon ${iconClass}`}
            style={{
              fontSize: "200%",
              padding: "0.5rem 0",
              color: "var(--button-primary-hover-background)",
              height: "max-content",
            }}
          ></i>
          <p>{buttonDescriptionText}</p>
        </div>

        <VSCodeButton
          onClick={onClick}
          style={{
            height: "max-content",
          }}
        >
          <i
            className={`codicon ${buttonIcon}`}
            style={{
              // fontSize: "200%",
              padding: "0.5rem 0",
              // color: "var(--button-primary-hover-background)",
            }}
          ></i>
        </VSCodeButton>
      </div>
      <hr
        style={{
          width: "100%",
          border: "1px solid var(--vscode-editor-foreground)",
        }}
      />
    </div>
  );
};

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
        justifyContent: "start",
        alignItems: "center",
        height: "100vh",
      }}
    >
      <i
        className="codicon codicon-tools"
        style={{
          fontSize: "500%",
          color: "var(--button-primary-background)",
        }}
      ></i>
      <hr
        style={{
          marginBottom: "5vh",
          width: "100%",
          border: "1px solid var(--button-primary-background)",
        }}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "start",
          alignItems: "center",
          flexDirection: "column",
          height: "100%",
          width: "100%",
          padding: "0 2rem",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            width: "100%",
          }}
        >
          <AccountButton
            iconClass="codicon-whole-word"
            onClick={() =>
              vscode.postMessage({
                command: "renameProject",
              })
            }
            buttonDescriptionText="Rename Project"
          />
          <AccountButton
            iconClass="codicon-account"
            onClick={() =>
              vscode.postMessage({
                command: "changeUserName",
              })
            }
            buttonDescriptionText="Change User Name"
          />
          <AccountButton
            iconClass="codicon-source-control"
            onClick={() =>
              vscode.postMessage({
                command: "changeSourceLanguage",
              })
            }
            buttonDescriptionText="Change Source Language"
          />
          <AccountButton
            iconClass="codicon-globe"
            onClick={() =>
              vscode.postMessage({
                command: "changeTargetLanguage",
              })
            }
            buttonDescriptionText="Change Target Language"
          />
          <AccountButton
            iconClass="codicon-cloud-download"
            onClick={() =>
              vscode.postMessage({
                command: "downloadSourceTextBibles",
              })
            }
            buttonDescriptionText="Download Source Text Bibles"
            buttonIcon="codicon-arrow-down"
          />
          <AccountButton
            iconClass="codicon-terminal"
            onClick={() =>
              vscode.postMessage({
                command: "openAISettings",
              })
            }
            buttonDescriptionText="Open AI Settings"
            buttonIcon="codicon-settings"
          />
        </div>

        <AccountButton
          iconClass="codicon-book"
          onClick={() =>
            vscode.postMessage({
              command: "createNewProject",
            })
          }
          buttonDescriptionText="Create New Project"
          buttonIcon="codicon-plus"
          outerContainerStyles={{
            paddingTop: "10vh",
          }}
        />
      </div>
    </div>
  );
}
export default App;
