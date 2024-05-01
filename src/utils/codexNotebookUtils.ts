import * as vscode from "vscode";
import * as fs from "fs";
import { CodexContentSerializer } from "./serializer";
import { getProjectMetadata, getWorkSpaceFolder } from ".";
import { generateFiles as generateFile } from "../utils/fileUtils";
import { getAllBookRefs, getAllBookChapterRefs, getAllVrefs } from ".";
import { vrefData } from "./verseRefUtils/verseData";
import { LanguageProjectStatus } from "codex-types";
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
  await fs.readdir(directoryPath, async function (err: any, files: any) {
    if (err) {
      return console.error("Unable to scan directory: " + err);
    }
    for (const file of files) {
      if (path.extname(file) === ".SFM" || path.extname(file) === ".sfm") {
        await fs.readFile(
          path.join(directoryPath, file),
          "utf8",
          async function (err: any, contents: any) {
            let fileName = "";
            try {
              const myUsfmParser = new grammar.USFMParser(
                contents,
                grammar.LEVEL.RELAXED
              );

              fileName = path.basename(file, path.extname(file)) + ".json";
              const jsonOutput = myUsfmParser.toJSON() as any as ParsedUSFM;
              console.log({ jsonOutput });
              projectFileContent.push(jsonOutput);
              // update matching codex file with the verseText content
              // jsonOutput.chapters.map(async (chapter) => {
              //   chapter.contents.map(async (content) => {
              //     const codexFileName = `${jsonOutput.book.bookCode}.codex`;
              //     const codexFileUri = vscode.Uri.file(codexFileName);
              //     const codexNotebook =
              //       await vscode.workspace.openNotebookDocument(codexFileUri);
              //     if (!content.verseText) {
              //       return;
              //     }
              //     const verseTextCell = new vscode.NotebookCellData(
              //       vscode.NotebookCellKind.Code,
              //       content.verseText,
              //       "plaintext"
              //     );
              //     codexNotebook.cells.push(verseTextCell);
              //     await vscode.workspace.applyEdit(
              //       new vscode.WorkspaceEdit().replaceNotebookCells(
              //         codexFileUri,
              //         new vscode.NotebookRange(
              //           codexNotebook.cells.length - 1,
              //           codexNotebook.cells.length
              //         ),
              //         [verseTextCell]
              //       )
              //     );
              //     // const codexFile =
              //     //     vscode.workspace.fs.readFile(
              //     //         codexFileUri,
              //     //     );
              //   });
              // });

              // await generateFiles({
              //     filepath: `importedProject/${fileName}`,
              //     fileContent:
              //         new TextEncoder().encode(
              //             JSON.stringify(
              //                 jsonOutput,
              //                 null,
              //                 4,
              //             ),
              //         ),
              //     shouldOverWrite:
              //         true,
              // });
            } catch (error) {
              vscode.window.showErrorMessage(
                `Error generating files for ${fileName}: ${error}`
              );
            }
          }
        );
      }
    }
  });
  console.log({ projectFileContent });
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
  console.log({ projectFileContent, foldersWithUsfmToConvert });

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

      console.log({
        verseRefText,
        importedBook,
        book,
        chapter,
        projectFileContent,
      });
      // Generate a code cell for the chapter
      const numberOfVrefsForChapter =
        vrefData[book].chapterVerseCountPairings[chapter];
      const vrefsString = getAllVrefs(
        book,
        chapter,
        numberOfVrefsForChapter,
        verseRefText
      );

      if (projectFileContent && projectFileContent?.length > 0) {
        console.log({ vrefsString });
      }
      const projectFileContentFileThatMatchBook = projectFileContent?.find(
        (projectFile) =>
          projectFile.book.bookCode === book &&
          projectFile.chapters.findIndex(
            (projectBookChapter) => projectBookChapter.chapterNumber === chapter
          )
      );
      // console.log({ projectFileContentFileThatMatchBook });
      if (projectFileContent && projectFileContentFileThatMatchBook) {
        // hydrate vrefsString string from projectFileContentFileThatMatchBook
        // projectFileContent.map((chapter) => {
        //   if (chapter.book.bookCode === book && chapter.chapter === chapter) {
        //     chapter.contents.map((content) => {
        //       if (content.verseRef === vrefsString) {
        //         vrefsString = content.verseText;
        //       }
        //     });
        //   }
        // });
      }
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
