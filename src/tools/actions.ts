import type { ImapClient } from "../imap.js";

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

const IMAP_UNAVAILABLE: ToolResult = {
  content: [
    {
      type: "text",
      text: "IMAP unavailable — Proton Bridge may not be running",
    },
  ],
  isError: true,
};

function errorResult(message: string): ToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

function successResult(message: string): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify({ success: true, message }) }] };
}

export async function handleMarkRead(
  imap: ImapClient,
  params: { folder: string; uid: number }
): Promise<ToolResult> {
  if (!(await imap.isAvailable())) return IMAP_UNAVAILABLE;
  try {
    await imap.setFlags(params.folder, params.uid, ["\\Seen"], true);
    return successResult(`Email ${params.uid} marked as read`);
  } catch (error) {
    return errorResult(`Failed to mark read: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function handleMarkUnread(
  imap: ImapClient,
  params: { folder: string; uid: number }
): Promise<ToolResult> {
  if (!(await imap.isAvailable())) return IMAP_UNAVAILABLE;
  try {
    await imap.setFlags(params.folder, params.uid, ["\\Seen"], false);
    return successResult(`Email ${params.uid} marked as unread`);
  } catch (error) {
    return errorResult(`Failed to mark unread: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function handleFlagEmail(
  imap: ImapClient,
  params: { folder: string; uid: number }
): Promise<ToolResult> {
  if (!(await imap.isAvailable())) return IMAP_UNAVAILABLE;
  try {
    await imap.setFlags(params.folder, params.uid, ["\\Flagged"], true);
    return successResult(`Email ${params.uid} flagged`);
  } catch (error) {
    return errorResult(`Failed to flag: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function handleUnflagEmail(
  imap: ImapClient,
  params: { folder: string; uid: number }
): Promise<ToolResult> {
  if (!(await imap.isAvailable())) return IMAP_UNAVAILABLE;
  try {
    await imap.setFlags(params.folder, params.uid, ["\\Flagged"], false);
    return successResult(`Email ${params.uid} unflagged`);
  } catch (error) {
    return errorResult(`Failed to unflag: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function handleMoveEmail(
  imap: ImapClient,
  params: { folder: string; uid: number; destination: string }
): Promise<ToolResult> {
  if (!(await imap.isAvailable())) return IMAP_UNAVAILABLE;
  try {
    await imap.moveMessage(params.folder, params.uid, params.destination);
    return successResult(`Email ${params.uid} moved to ${params.destination}`);
  } catch (error) {
    return errorResult(`Failed to move: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function handleDeleteEmail(
  imap: ImapClient,
  params: { folder: string; uid: number }
): Promise<ToolResult> {
  if (!(await imap.isAvailable())) return IMAP_UNAVAILABLE;
  try {
    const trashFolder = await imap.resolveTrashFolder();
    if (params.folder === trashFolder) {
      return errorResult(`Email is already in ${trashFolder}. Permanent deletion is not supported.`);
    }
    await imap.moveMessage(params.folder, params.uid, trashFolder);
    return successResult(`Email ${params.uid} moved to ${trashFolder}`);
  } catch (error) {
    return errorResult(`Failed to delete: ${error instanceof Error ? error.message : String(error)}`);
  }
}
