import * as vscode from "vscode";
import * as fs from "fs";
import { CodexContentSerializer } from "./serializer";
import { generateFiles as generateFile } from "../utils/fileUtils";
import { getAllBookRefs, getAllBookChapterRefs, getAllVrefs } from ".";
import { vrefData } from "./verseRefUtils/verseData";
import path from "path";
import grammar from "usfm-grammar";

export const NOTEBOOK_TYPE = "codex-type";
export enum CellTypes {
  CHAPTER_HEADING = "chapter-heading",
}

/**
 * Interface representing a Codex cell with optional metadata.
 *
 * This interface extends the vscode.NotebookCellData with additional metadata that
 * specifies the type of cell and associated data. The metadata includes the type of the cell,
 * which is defined by the CellTypes enum, and data that contains the chapter information.
 *
 * @property {CellTypes} [type] - The type of the cell, as defined by the CellTypes enum.
 * @property {Object} [data] - An object containing additional data for the cell.
 * @property {string} [chapter] - The chapter number or identifier associated with the cell.
 */
export interface CodexCell extends vscode.NotebookCellData {
  metadata?: {
    type: CellTypes;
    data: {
      chapter: string;
    };
  };
}

export const createCodexNotebook = async (
  cells: vscode.NotebookCellData[] = []
) => {
  /**
   * Creates a Codex notebook with the provided cell data.
   *
   * This function takes an array of NotebookCellData objects and uses them to create a new Codex notebook.
   * If no cells are provided, an empty array is used by default. Each cell in the array is transformed into
   * a NotebookCellData object, which is then used to create the notebook data. A new notebook document is
   * opened with this data in the Codex-specific notebook type.
   *
   * @param {vscode.NotebookCellData[]} cells - An array of NotebookCellData objects to populate the notebook.
   * @returns {Promise<vscode.NotebookDocument>} A promise that resolves to the created NotebookDocument.
   */
  const cellData =
    cells.length > 0
      ? cells.map(
          (cell) =>
            new vscode.NotebookCellData(cell.kind, cell.value, cell.languageId)
        )
      : [];
  const data = new vscode.NotebookData(cellData);
  const doc = await vscode.workspace.openNotebookDocument(NOTEBOOK_TYPE, data);
  return doc;
};

/**
 * Creates a Codex notebook for each book in the Bible.
 *
 * This function generates a Codex notebook for each book in the Bible. If a list of books is provided,
 * notebooks will only be created for those books. Otherwise, notebooks will be created for all books.
 * Each notebook contains a code cell for each chapter in the book. Each chapter cell is preceded by a
 * markdown cell with the chapter number and followed by a markdown cell for notes for the chapter.
 *
 * @param {Object} options - An object containing options for the notebook creation.
 * @param {boolean} options.shouldOverWrite - A boolean indicating whether existing notebooks should be overwritten.
 * @param {string[]} options.books - An array of book names for which to create notebooks. If not provided, notebooks will be created for all books.
 * @returns {Promise<void>} A promise that resolves when all notebooks have been created.
 */

const importProjectAndConvertToJson = async (
  folderWithUsfmToConvert: vscode.Uri[]
): Promise<ParsedUSFM[]> => {
  const projectFileContent: ParsedUSFM[] = [];
  const directoryPath = folderWithUsfmToConvert[0].fsPath;
  const files = await fs.promises.readdir(directoryPath);

  for (const file of files) {
    if (
      path.extname(file) === ".SFM" ||
      path.extname(file) === ".sfm" ||
      path.extname(file) === ".USFM" ||
      path.extname(file) === ".usfm"
    ) {
      const contents = await fs.promises.readFile(
        path.join(directoryPath, file),
        "utf8"
      );
      let fileName = "";
      try {
        const myUsfmParser = new grammar.USFMParser(
          contents,
          grammar.LEVEL.RELAXED
        );

        fileName = path.basename(file, path.extname(file)) + ".json";
        const jsonOutput = myUsfmParser.toJSON() as any as ParsedUSFM;
        projectFileContent.push(jsonOutput);
      } catch (error) {
        vscode.window.showErrorMessage(
          `Error generating files for ${fileName}: ${error}`
        );
      }
    }
  }
  return projectFileContent;
};

export async function createProjectNotebooks({
  shouldOverWrite = false,
  books = undefined,
  foldersWithUsfmToConvert = undefined,
}: {
  shouldOverWrite?: boolean;
  books?: string[] | undefined;
  foldersWithUsfmToConvert?: vscode.Uri[] | undefined;
} = {}) {
  const notebookCreationPromises = [];
  let projectFileContent: ParsedUSFM[] | undefined = undefined;
  if (foldersWithUsfmToConvert) {
    projectFileContent = await importProjectAndConvertToJson(
      foldersWithUsfmToConvert
    );
  }

  const allBooks = books ? books : getAllBookRefs();
  // Loop over all books and createCodexNotebook for each
  for (const book of allBooks) {
    /**
     * One notebook for each book of the Bible. Each notebook has a code cell for each chapter.
     * Each chapter cell has a preceding markdown cell with the chapter number, and a following
     * markdown cell that says '### Notes for Chapter {chapter number}'
     */
    const cells: vscode.NotebookCellData[] = [];
    const chapterHeadingText = `# Chapter`;

    // Iterate over all chapters in the current book
    for (const chapter of getAllBookChapterRefs(book)) {
      // Generate a markdown cell with the chapter number
      const cell = new vscode.NotebookCellData(
        vscode.NotebookCellKind.Markup,
        `${chapterHeadingText} ${chapter}`,
        "markdown"
      );
      cell.metadata = {
        type: CellTypes.CHAPTER_HEADING,
        data: {
          chapter: chapter,
        },
      };
      cells.push(cell);
      const importedBook = projectFileContent?.find(
        (projectFile) => projectFile?.book?.bookCode === book
      );

      const verseRefText = importedBook?.chapters.find(
        (projectBookChapter) => projectBookChapter?.chapterNumber === chapter
      )?.contents;
      // Generate a code cell for the chapter
      const numberOfVrefsForChapter =
        vrefData[book].chapterVerseCountPairings[chapter];
      const vrefsString = getAllVrefs(
        book,
        chapter,
        numberOfVrefsForChapter,
        verseRefText
      );

      cells.push(
        new vscode.NotebookCellData(
          vscode.NotebookCellKind.Code,
          vrefsString,
          "scripture"
        )
      );

      // Generate a markdown cell for notes for the chapter
      cells.push(
        new vscode.NotebookCellData(
          vscode.NotebookCellKind.Markup,
          `### Notes for Chapter ${chapter}`,
          "markdown"
        )
      );
    }
    // Create a notebook for the current book
    const serializer = new CodexContentSerializer();
    const notebookData = new vscode.NotebookData(cells);

    // const project = await getProjectMetadata();
    const notebookCreationPromise = serializer
      .serializeNotebook(
        notebookData,
        new vscode.CancellationTokenSource().token
      )
      .then((notebookFile) => {
        // Save the notebook using generateFiles
        const filePath = `files/target/${book}.codex`;
        return generateFile({
          filepath: filePath,
          fileContent: notebookFile,
          shouldOverWrite,
        });
      });
    notebookCreationPromises.push(notebookCreationPromise);
  }
  await Promise.all(notebookCreationPromises);
}

export async function createProjectNotebooksFromTxt({
  shouldOverWrite = false,
  books = undefined,
  folderWithTxtToConvert = undefined,
}: {
  shouldOverWrite?: boolean;
  books?: string[] | undefined;
  folderWithTxtToConvert?: vscode.Uri[] | undefined;
} = {}) {
  if (!folderWithTxtToConvert) {
    console.error("No folder provided for TXT to Notebook conversion.");
    return;
  }

  const notebookCreationPromises = folderWithTxtToConvert.map(async (folderUri) => {
    const files = await vscode.workspace.fs.readDirectory(folderUri);
    const txtFiles = files.filter(([file, type]) => type === vscode.FileType.File && file.endsWith('.txt'));

    return Promise.all(txtFiles.map(async ([file]) => {
      const filePath = vscode.Uri.joinPath(folderUri, file);
      const fileContent = await vscode.workspace.fs.readFile(filePath);
      const text = new TextDecoder("utf-8").decode(fileContent);
      const lines = text.split(/\r?\n/);
      const chapters: { [key: string]: string[] } = {};
      lines.reduce((acc, line) => {
        const chapterMatch = line.match(/(\d+):/);
        if (chapterMatch) {
          const chapter = chapterMatch[1];
          if (!acc[chapter]) {
            acc[chapter] = [];
          }
          acc[chapter].push(line);
        }
        return acc;
      }, chapters);

      const cells: vscode.NotebookCellData[] = [];
      Object.keys(chapters).forEach(chapter => {
        // Markdown cell for the chapter heading
        const chapterHeadingCell = new vscode.NotebookCellData(
          vscode.NotebookCellKind.Markup,
          `# Chapter ${chapter}`,
          "markdown"
        );
        chapterHeadingCell.metadata = {
          type: "chapter-heading",
          data: {
            chapter: chapter,
          },
        };
        cells.push(chapterHeadingCell);

        // Code cell for the chapter content
        cells.push(new vscode.NotebookCellData(
          vscode.NotebookCellKind.Code,
          chapters[chapter].join('\n'),
          "scripture"
        ));

        // Markdown cell for notes
        cells.push(new vscode.NotebookCellData(
          vscode.NotebookCellKind.Markup,
          `### Notes for Chapter ${chapter}`,
          "markdown"
        ));
      });

      const notebookData = new vscode.NotebookData(cells);
      const serializer = new CodexContentSerializer();
      const notebookFile = await serializer.serializeNotebook(notebookData, new vscode.CancellationTokenSource().token);

      // Save the notebook
      const notebookPath = `files/target/${path.basename(file, '.txt')}.codex`;
      return generateFile({
        filepath: notebookPath,
        fileContent: notebookFile,
        shouldOverWrite,
      });
    }));
  });

  await Promise.all(notebookCreationPromises.flat());
}

export async function createProjectCommentFiles({
  shouldOverWrite = false,
}: {
  shouldOverWrite?: boolean;
} = {}) {
  // Save the notebook using generateFiles
  const commentsFilePath = `comments.json`;
  const notebookCommentsFilePath = `file-comments.json`;
  await generateFile({
    filepath: commentsFilePath,
    fileContent: new TextEncoder().encode("[]"),
    shouldOverWrite,
  });
  await generateFile({
    filepath: notebookCommentsFilePath,
    fileContent: new TextEncoder().encode("[]"),
    shouldOverWrite,
  });
}
