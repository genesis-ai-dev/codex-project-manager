# Codex Project Manager

The Codex Project Manager is an extension designed to streamline the process of initializing, configuring, and managing translation projects. This extension provides a suite of tools and features to assist users in setting up their projects with ease, ensuring that they can focus on the translation work without worrying about the underlying project setup.

## Features

- **Project Initialization**: Quickly set up a new translation project with predefined or custom templates.
  - Command: `codex-project-manager.initializeNewProject`

- **Project Configuration**: Easily configure project settings such as project name, source and target languages, and user information.
  - Commands:
    - `codex-project-manager.nameProject`
    - `codex-project-manager.setSourceAndTargetLanguage`
    - `codex-project-manager.userName`

- **Dependency Management**: Automatically checks for and suggests the installation of recommended extensions to enhance the project management experience.
  - Recommended extension: `project-accelerate.codex-editor-extension`

- **Walkthroughs and Guides**: Offers guided walkthroughs to help users get started with their projects and make the best use of the extension's features.
  - Walkthroughs include steps like opening a project folder, naming the project, setting user name, and selecting source and target languages.

- **Integration with External Tools**: Provides commands to interact with other extensions and tools, such as downloading source texts and setting editor fonts to match the target language.
  - Commands:
    - `codex-project-manager.downloadSourceTextBibles`
    - `codex-project-manager.setEditorFontToTargetLanguage`

- **Project Management Utilities**: Includes utilities for checking missing project files, updating project settings, and more to ensure the project's integrity and consistency.

## Goals and Purpose

The primary goal of the Codex Project Manager extension is to simplify the initial setup and ongoing management of Bible translation projects. It aims to reduce the technical overhead for translators and project managers, allowing them to focus on the translation work itself.

## Related or Dependent Extensions

This extension relies on the following VS Code extension for enhanced functionality:

- **Codex Editor Extension** (`project-accelerate.codex-editor-extension`): Provides additional editing and management capabilities tailored for Bible translation projects.

## Getting Started

To get started with the Codex Project Manager, install the extension from the Visual Studio Code Marketplace, and follow the on-screen walkthroughs to initialize and configure your new project.

**Enjoy your translation journey with Codex Project Manager!**