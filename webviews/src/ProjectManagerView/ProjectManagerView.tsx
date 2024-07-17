import { useEffect, useState, useCallback } from "react";
import {
  VSCodeButton,
  VSCodeDataGrid,
  VSCodeDataGridCell,
  VSCodeDataGridRow,
} from "@vscode/webview-ui-toolkit/react";
import { ProjectOverview } from "../../../types";

const vscode = acquireVsCodeApi();

function App() {
  const [projectOverview, setProjectOverview] =
    useState<ProjectOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleMessage = useCallback((event: MessageEvent) => {
    console.log("Received message:", event.data);
    const message = event.data;
    switch (message.command) {
      case "sendProjectOverview": {
        console.log("Setting project overview:", message.data);
        setProjectOverview(message.data);
        setIsLoading(false);
        break;
      }
      default:
        console.log("Unhandled message command:", message.command);
        break;
    }
  }, []);

  useEffect(() => {
    window.addEventListener("message", handleMessage);

    // Signal that the webview is ready
    vscode.postMessage({ command: "webviewReady" });

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [handleMessage]);

  // Log state changes
  useEffect(() => {
    console.log("Project Overview updated:", projectOverview);
    if (!projectOverview) {
      setIsLoading(true);
      vscode.postMessage({ command: "requestProjectOverview" });
    }
  }, [projectOverview]);

  const handleAction = (command: string, data?: any) => {
    vscode.postMessage({ command, data });
  };

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
      {isLoading ? (
        <div>Loading project overview...</div>
      ) : projectOverview ? (
        <VSCodeDataGrid grid-template-columns="1fr 1fr auto">
          {/* <VSCodeDataGridRow row-type="header">
            <VSCodeDataGridCell cell-type="columnheader" grid-column="1">
              Property
            </VSCodeDataGridCell>
            <VSCodeDataGridCell cell-type="columnheader" grid-column="2">
              Value
            </VSCodeDataGridCell>
            <VSCodeDataGridCell cell-type="columnheader" grid-column="3">
              Action
            </VSCodeDataGridCell>
          </VSCodeDataGridRow> */}

          <VSCodeDataGridRow>
            <VSCodeDataGridCell grid-column="1">
              Project Name
            </VSCodeDataGridCell>
            <VSCodeDataGridCell
              grid-column="2"
              style={{
                color: projectOverview.projectName
                  ? "inherit"
                  : "var(--vscode-errorForeground)",
              }}
            >
              {projectOverview.projectName ?? "Missing"}
              {!projectOverview.projectName && (
                <i
                  className="codicon codicon-warning"
                  style={{ marginLeft: "8px" }}
                ></i>
              )}
            </VSCodeDataGridCell>
            <VSCodeDataGridCell grid-column="3">
              <VSCodeButton onClick={() => handleAction("renameProject")}>
                <i className="codicon codicon-pencil"></i>
              </VSCodeButton>
            </VSCodeDataGridCell>
          </VSCodeDataGridRow>

          <VSCodeDataGridRow>
            <VSCodeDataGridCell grid-column="1">User Name</VSCodeDataGridCell>
            <VSCodeDataGridCell
              grid-column="2"
              style={{
                color: projectOverview.userName
                  ? "inherit"
                  : "var(--vscode-errorForeground)",
              }}
            >
              {projectOverview.userName ?? "Missing"}
              {!projectOverview.userName && (
                <i
                  className="codicon codicon-warning"
                  style={{ marginLeft: "8px" }}
                ></i>
              )}
            </VSCodeDataGridCell>
            <VSCodeDataGridCell grid-column="3">
              <VSCodeButton onClick={() => handleAction("changeUserName")}>
                <i className="codicon codicon-account"></i>
              </VSCodeButton>
            </VSCodeDataGridCell>
          </VSCodeDataGridRow>

          <VSCodeDataGridRow>
            <VSCodeDataGridCell grid-column="1">
              Source Language
            </VSCodeDataGridCell>
            <VSCodeDataGridCell
              grid-column="2"
              style={{
                color: projectOverview.sourceLanguage
                  ? "inherit"
                  : "var(--vscode-errorForeground)",
              }}
            >
              {projectOverview.sourceLanguage
                ? Object.entries(projectOverview.sourceLanguage)[0][1]
                : "Missing"}
              {!projectOverview.sourceLanguage && (
                <i
                  className="codicon codicon-warning"
                  style={{ marginLeft: "8px" }}
                ></i>
              )}
            </VSCodeDataGridCell>
            <VSCodeDataGridCell grid-column="3">
              <VSCodeButton
                onClick={() => handleAction("changeSourceLanguage")}
              >
                <i className="codicon codicon-source-control"></i>
              </VSCodeButton>
            </VSCodeDataGridCell>
          </VSCodeDataGridRow>

          <VSCodeDataGridRow>
            <VSCodeDataGridCell grid-column="1">
              Target Language
            </VSCodeDataGridCell>
            <VSCodeDataGridCell
              grid-column="2"
              style={{
                color: projectOverview.targetLanguage
                  ? "inherit"
                  : "var(--vscode-errorForeground)",
              }}
            >
              {projectOverview.targetLanguage
                ? Object.entries(projectOverview.targetLanguage)[0][1]
                : "Missing"}
              {!projectOverview.targetLanguage && (
                <i
                  className="codicon codicon-warning"
                  style={{ marginLeft: "8px" }}
                ></i>
              )}
            </VSCodeDataGridCell>
            <VSCodeDataGridCell grid-column="3">
              <VSCodeButton
                onClick={() => handleAction("changeTargetLanguage")}
              >
                <i className="codicon codicon-globe"></i>
              </VSCodeButton>
            </VSCodeDataGridCell>
          </VSCodeDataGridRow>

          <VSCodeDataGridRow>
            <VSCodeDataGridCell grid-column="1">
              Abbreviation
            </VSCodeDataGridCell>
            <VSCodeDataGridCell
              grid-column="2"
              style={{
                color: projectOverview.abbreviation
                  ? "inherit"
                  : "var(--vscode-errorForeground)",
              }}
            >
              {projectOverview.abbreviation?.toString() ?? "Missing"}
              {!projectOverview.abbreviation && (
                <i
                  className="codicon codicon-warning"
                  style={{ marginLeft: "8px" }}
                ></i>
              )}
            </VSCodeDataGridCell>
            <VSCodeDataGridCell grid-column="3">
              <VSCodeButton onClick={() => handleAction("editAbbreviation")}>
                <i className="codicon codicon-pencil"></i>
              </VSCodeButton>
            </VSCodeDataGridCell>
          </VSCodeDataGridRow>

          <VSCodeDataGridRow>
            <VSCodeDataGridCell grid-column="1">Category</VSCodeDataGridCell>
            <VSCodeDataGridCell
              grid-column="2"
              style={{
                color: projectOverview.category
                  ? "inherit"
                  : "var(--vscode-errorForeground)",
              }}
            >
              {String(projectOverview.category) ?? "Missing"}
              {!projectOverview.category && (
                <i
                  className="codicon codicon-warning"
                  style={{ marginLeft: "8px" }}
                ></i>
              )}
            </VSCodeDataGridCell>
            <VSCodeDataGridCell grid-column="3">
              <VSCodeButton onClick={() => handleAction("selectCategory")}>
                <i className="codicon codicon-pencil"></i>
              </VSCodeButton>
            </VSCodeDataGridCell>
          </VSCodeDataGridRow>

          <VSCodeDataGridRow>
            <VSCodeDataGridCell grid-column="1">
              Source Text Bibles
            </VSCodeDataGridCell>
            <VSCodeDataGridCell
              grid-column="2"
              style={{
                color:
                  projectOverview.sourceTextBibles &&
                  projectOverview.sourceTextBibles.length > 0
                    ? "inherit"
                    : "var(--vscode-errorForeground)",
              }}
            >
              {projectOverview.sourceTextBibles &&
              projectOverview.sourceTextBibles.length > 0 ? (
                <ul>
                  {projectOverview.sourceTextBibles.map((bible) => {
                    const fileName = bible.path.split("/").pop() || "";
                    return (
                      <li key={bible.path} style={{ marginBottom: "4px" }}>
                        <a
                          href="#"
                          onClick={() => handleAction("openBible", bible)}
                          style={{
                            textDecoration: "none",
                            color: "var(--vscode-textLink-foreground)",
                          }}
                        >
                          {fileName}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <>
                  Missing
                  <i
                    className="codicon codicon-warning"
                    style={{ marginLeft: "8px" }}
                  ></i>
                </>
              )}
            </VSCodeDataGridCell>
            <VSCodeDataGridCell grid-column="3">
              <VSCodeButton
                onClick={() => handleAction("downloadSourceTextBibles")}
              >
                <i className="codicon codicon-cloud-download"></i>
              </VSCodeButton>
            </VSCodeDataGridCell>
          </VSCodeDataGridRow>

          {/* <VSCodeDataGridRow>
            <VSCodeDataGridCell grid-column="1">
              Target Text Bibles
            </VSCodeDataGridCell>
            <VSCodeDataGridCell grid-column="2">
              <ul>
                {projectOverview.targetTextBibles?.map((bible) => {
                  const fileName = bible.path.split('/').pop() || '';
                  return (
                    <li key={bible.path} style={{ marginBottom: '4px' }}>
                      <a
                        href="#"
                        onClick={() => handleAction('openBible', bible)}
                        style={{
                          textDecoration: 'none',
                          color: 'var(--vscode-textLink-foreground)',
                        }}
                      >
                        {fileName}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </VSCodeDataGridCell>
            <VSCodeDataGridCell grid-column="3">
              <VSCodeButton
                onClick={() => handleAction('downloadTargetTextBibles')}
              >
                <i className="codicon codicon-cloud-download"></i>
              </VSCodeButton>
            </VSCodeDataGridCell>
          </VSCodeDataGridRow> */}

          <VSCodeDataGridRow>
            <VSCodeDataGridCell grid-column="1">
              Copilot Settings
            </VSCodeDataGridCell>
            <VSCodeDataGridCell grid-column="3">
              <VSCodeButton onClick={() => handleAction("openAISettings")}>
                <i className="codicon codicon-settings"></i>
              </VSCodeButton>
            </VSCodeDataGridCell>
          </VSCodeDataGridRow>
        </VSCodeDataGrid>
      ) : (
        "No project overview available"
      )}
      <VSCodeButton
        onClick={() => handleAction("createNewProject")}
        style={{ marginTop: "2rem" }}
      >
        <i className="codicon codicon-plus"></i> Create New Project
      </VSCodeButton>
    </div>
  );
}
export default App;
