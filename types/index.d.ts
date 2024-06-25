import { Dictionary, LanguageMetadata } from "codex-types";
import * as vscode from "vscode";
interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ProjectOverview {
  projectName: string;
  abbreviation: string;
  sourceLanguage: LanguageMetadata;
  targetLanguage: LanguageMetadata;
  category: string;
  userName: string;
}

interface ChatMessageWithContext extends ChatMessage {
  context?: any; // FixMe: discuss what context could be. Cound it be a link to a note?
  createdAt: string;
}

interface FrontEndMessage {
  command: {
    name: string; // use enum
    data?: any; // define based on enum
  };
}
type CommentThread = vscode.CommentThread;

interface ChatMessageThread {
  id: string;
  messages: ChatMessageWithContext[];
  collapsibleState: number;
  canReply: boolean;
  threadTitle?: string;
  deleted: boolean;
  createdAt: string;
}

interface NotebookCommentThread {
  id: string;
  uri?: string;
  verseRef: string;
  comments: {
    id: number;
    body: string;
    mode: number;
    contextValue: "canDelete";
    deleted: boolean;
    author: {
      name: string;
    };
  }[];
  collapsibleState: number;
  canReply: boolean;
  threadTitle?: string;
  deleted: boolean;
}

interface VerseRefGlobalState {
  verseRef: string;
  uri: string;
}
interface ScriptureContent extends vscode.NotebookData {
  metadata: {
    data?: {
      chapter: string;
    };
    type?: "chapter-heading";
  };
}
type NotebookCellKind = vscode.NotebookCellKind;

type CommentPostMessages =
  | { command: "commentsFromWorkspace"; content: string }
  | { command: "reload"; data: VerseRefGlobalState }
  | { command: "updateCommentThread"; commentThread: NotebookCommentThread }
  | { command: "deleteCommentThread"; commentThreadId: string }
  | {
      command: "deleteComment";
      args: { commentId: number; commentThreadId: string };
    }
  | { command: "getCurrentVerseRef" }
  | { command: "fetchComments" };
interface SelectedTextDataWithContext {
  selection: string;
  completeLineContent: string | null;
  vrefAtStartOfLine: string | null;
  selectedText: string | null;
}

type ChatPostMessages =
  | { command: "threadsFromWorkspace"; content: ChatMessageThread[] }
  | { command: "response"; finished: boolean; text: string }
  | { command: "reload" }
  | { command: "select"; textDataWithContext: SelectedTextDataWithContext }
  | { command: "fetch"; messages: string }
  | { command: "notifyUserError"; message: string }
  | {
      command: "updateMessageThread";
      messages: ChatMessageWithContext[];
      threadId: string;
      threadTitle?: string;
    }
  | { command: "deleteThread"; threadId: string }
  | { command: "fetchThread" }
  | { command: "abort-fetch" }
  | { command: "openSettings" };

type DictionaryPostMessages =
  | { command: "sendData"; data: Dictionary }
  | { command: "updateData"; data: Dictionary }
  | { command: "confirmRemove"; count: number }
  | { command: "removeConfirmed" };

type ScripturePostMessages =
  | { command: "sendScriptureData"; data: ScriptureContent }
  | { command: "fetchScriptureData" };
