(function () {
    const vscode = acquireVsCodeApi();

    const projectTypeDropdown = document.getElementById('projectType');
    const proceedButton = document.getElementById('proceedButton');

    proceedButton.addEventListener('click', () => {
        const selectedProjectType = projectTypeDropdown.value;
        vscode.postMessage({
            type: 'projectTypeSelected',
            projectType: selectedProjectType,
        });
    });
})();