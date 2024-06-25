import { useEffect, useState, useCallback } from 'react';
import {
  VSCodeButton,
  VSCodeDataGrid,
  VSCodeDataGridCell,
  VSCodeDataGridRow,
} from '@vscode/webview-ui-toolkit/react';
import { ProjectOverview } from '../../../types';

const vscode = acquireVsCodeApi();

function App() {
  const [projectOverview, setProjectOverview] =
    useState<ProjectOverview | null>(null);

  const handleMessage = useCallback((event: MessageEvent) => {
    console.log('Received message:', event.data);
    const message = event.data;
    switch (message.command) {
      case 'sendProjectOverview': {
        console.log('Setting project overview:', message.projectOverview);
        setProjectOverview(message.projectOverview);
        break;
      }
      default:
        console.log('Unhandled message command:', message.command);
        break;
    }
  }, []);

  useEffect(() => {
    // Request project overview on component mount
    vscode.postMessage({ command: 'requestProjectOverview' });

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [handleMessage]);

  // Log state changes
  useEffect(() => {
    console.log('Project Overview updated:', projectOverview);
  }, [projectOverview]);

  const handleAction = (command: string) => {
    vscode.postMessage({ command });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'start',
        alignItems: 'center',
        height: '100vh',
      }}
    >
      <i
        className="codicon codicon-tools"
        style={{
          fontSize: '300%',
          color: 'var(--button-primary-background)',
        }}
      ></i>
      {projectOverview ? (
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
            <VSCodeDataGridCell grid-column="2">
              {projectOverview.projectName ?? ''}
            </VSCodeDataGridCell>
            <VSCodeDataGridCell grid-column="3">
              <VSCodeButton onClick={() => handleAction('renameProject')}>
                <i className="codicon codicon-pencil"></i>
              </VSCodeButton>
            </VSCodeDataGridCell>
          </VSCodeDataGridRow>

          <VSCodeDataGridRow>
            <VSCodeDataGridCell grid-column="1">User Name</VSCodeDataGridCell>
            <VSCodeDataGridCell grid-column="2">
              {projectOverview.userName ?? ''}
            </VSCodeDataGridCell>
            <VSCodeDataGridCell grid-column="3">
              <VSCodeButton onClick={() => handleAction('changeUserName')}>
                <i className="codicon codicon-account"></i>
              </VSCodeButton>
            </VSCodeDataGridCell>
          </VSCodeDataGridRow>

          <VSCodeDataGridRow>
            <VSCodeDataGridCell grid-column="1">
              Source Language
            </VSCodeDataGridCell>
            <VSCodeDataGridCell grid-column="2">
              {projectOverview.sourceLanguage
                ? Object.entries(projectOverview.sourceLanguage)[0][1]
                : ''}
            </VSCodeDataGridCell>
            <VSCodeDataGridCell grid-column="3">
              <VSCodeButton
                onClick={() => handleAction('changeSourceLanguage')}
              >
                <i className="codicon codicon-source-control"></i>
              </VSCodeButton>
            </VSCodeDataGridCell>
          </VSCodeDataGridRow>

          <VSCodeDataGridRow>
            <VSCodeDataGridCell grid-column="1">
              Target Language
            </VSCodeDataGridCell>
            <VSCodeDataGridCell grid-column="2">
              {projectOverview.targetLanguage
                ? Object.entries(projectOverview.targetLanguage)[0][1]
                : ''}
            </VSCodeDataGridCell>
            <VSCodeDataGridCell grid-column="3">
              <VSCodeButton
                onClick={() => handleAction('changeTargetLanguage')}
              >
                <i className="codicon codicon-globe"></i>
              </VSCodeButton>
            </VSCodeDataGridCell>
          </VSCodeDataGridRow>

          <VSCodeDataGridRow>
            <VSCodeDataGridCell grid-column="1">
              Abbreviation
            </VSCodeDataGridCell>
            <VSCodeDataGridCell grid-column="2">
              {projectOverview.abbreviation?.toString() ?? ''}
            </VSCodeDataGridCell>
            <VSCodeDataGridCell grid-column="3">
              <VSCodeButton onClick={() => handleAction('changeAbbreviation')}>
                <i className="codicon codicon-pencil"></i>
              </VSCodeButton>
            </VSCodeDataGridCell>
          </VSCodeDataGridRow>

          <VSCodeDataGridRow>
            <VSCodeDataGridCell grid-column="1">Category</VSCodeDataGridCell>
            <VSCodeDataGridCell grid-column="2">
              {String(projectOverview.category) ?? ''}
            </VSCodeDataGridCell>
            <VSCodeDataGridCell grid-column="3">
              <VSCodeButton onClick={() => handleAction('changeCategory')}>
                <i className="codicon codicon-pencil"></i>
              </VSCodeButton>
            </VSCodeDataGridCell>
          </VSCodeDataGridRow>

          <VSCodeDataGridRow>
            <VSCodeDataGridCell grid-column="1">
              Source Text Bibles
            </VSCodeDataGridCell>
            <VSCodeDataGridCell grid-column="2">-</VSCodeDataGridCell>
            <VSCodeDataGridCell grid-column="3">
              <VSCodeButton
                onClick={() => handleAction('downloadSourceTextBibles')}
              >
                <i className="codicon codicon-cloud-download"></i>
              </VSCodeButton>
            </VSCodeDataGridCell>
          </VSCodeDataGridRow>

          <VSCodeDataGridRow>
            <VSCodeDataGridCell grid-column="1">
              Target Text Bibles
            </VSCodeDataGridCell>
            <VSCodeDataGridCell grid-column="2">-</VSCodeDataGridCell>
            <VSCodeDataGridCell grid-column="3">
              <VSCodeButton
                onClick={() => handleAction('downloadTargetTextBibles')}
              >
                <i className="codicon codicon-cloud-download"></i>
              </VSCodeButton>
            </VSCodeDataGridCell>
          </VSCodeDataGridRow>

          <VSCodeDataGridRow>
            <VSCodeDataGridCell grid-column="1">
              Copilot Settings
            </VSCodeDataGridCell>
            <VSCodeDataGridCell grid-column="2">-</VSCodeDataGridCell>
            <VSCodeDataGridCell grid-column="3">
              <VSCodeButton onClick={() => handleAction('openAISettings')}>
                <i className="codicon codicon-settings"></i>
              </VSCodeButton>
            </VSCodeDataGridCell>
          </VSCodeDataGridRow>
        </VSCodeDataGrid>
      ) : (
        'No project overview'
      )}
      <VSCodeButton
        onClick={() => handleAction('createNewProject')}
        style={{ marginTop: '2rem' }}
      >
        <i className="codicon codicon-plus"></i> Create New Project
      </VSCodeButton>
    </div>
  );
}
export default App;
