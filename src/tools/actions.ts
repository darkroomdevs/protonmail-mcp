import type { ImapClient } from "../imap.js";
import type { SearchCriteria } from "../types.js";

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
  return { content: [{ type: "text", text: message }] };
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

export async function handleCreateFolder(
  imap: ImapClient,
  params: { name: string }
): Promise<ToolResult> {
  if (!(await imap.isAvailable())) return IMAP_UNAVAILABLE;
  try {
    const path = `Folders/${params.name}`;
    await imap.createMailbox(path);
    return successResult(`Folder "${params.name}" created`);
  } catch (error) {
    return errorResult(`Failed to create folder: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function handleDeleteFolder(
  imap: ImapClient,
  params: { name: string }
): Promise<ToolResult> {
  if (!(await imap.isAvailable())) return IMAP_UNAVAILABLE;
  try {
    const path = `Folders/${params.name}`;
    await imap.deleteMailbox(path);
    return successResult(`Folder "${params.name}" deleted`);
  } catch (error) {
    return errorResult(`Failed to delete folder: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function handleRenameFolder(
  imap: ImapClient,
  params: { oldName: string; newName: string }
): Promise<ToolResult> {
  if (!(await imap.isAvailable())) return IMAP_UNAVAILABLE;
  try {
    await imap.renameMailbox(`Folders/${params.oldName}`, `Folders/${params.newName}`);
    return successResult(`Folder renamed from "${params.oldName}" to "${params.newName}"`);
  } catch (error) {
    return errorResult(`Failed to rename folder: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function handleCreateLabel(
  imap: ImapClient,
  params: { name: string }
): Promise<ToolResult> {
  if (!(await imap.isAvailable())) return IMAP_UNAVAILABLE;
  try {
    const path = `Labels/${params.name}`;
    await imap.createMailbox(path);
    return successResult(`Label "${params.name}" created`);
  } catch (error) {
    return errorResult(`Failed to create label: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function handleDeleteLabel(
  imap: ImapClient,
  params: { name: string }
): Promise<ToolResult> {
  if (!(await imap.isAvailable())) return IMAP_UNAVAILABLE;
  try {
    const path = `Labels/${params.name}`;
    await imap.deleteMailbox(path);
    return successResult(`Label "${params.name}" deleted`);
  } catch (error) {
    return errorResult(`Failed to delete label: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function handleRenameLabel(
  imap: ImapClient,
  params: { oldName: string; newName: string }
): Promise<ToolResult> {
  if (!(await imap.isAvailable())) return IMAP_UNAVAILABLE;
  try {
    await imap.renameMailbox(`Labels/${params.oldName}`, `Labels/${params.newName}`);
    return successResult(`Label renamed from "${params.oldName}" to "${params.newName}"`);
  } catch (error) {
    return errorResult(`Failed to rename label: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function handleBulkAction(
  imap: ImapClient,
  params: {
    folder: string;
    action: "delete" | "move" | "markRead" | "markUnread" | "flag" | "unflag";
    criteria?: SearchCriteria;
    uids?: number[];
    destination?: string;
    dryRun: boolean;
  }
): Promise<ToolResult> {
  if (!params.criteria && !params.uids) {
    return errorResult("Either criteria or uids must be provided");
  }
  if (params.action === "move" && !params.destination) {
    return errorResult("destination is required for move action");
  }
  if (!(await imap.isAvailable())) return IMAP_UNAVAILABLE;

  try {
    let uids: number[];
    if (params.criteria) {
      uids = await imap.searchByQuery(params.folder, params.criteria);
    } else {
      uids = params.uids!;
    }

    const result = await imap.bulkAction(params.folder, params.action, uids, {
      destination: params.destination,
      dryRun: params.dryRun,
    });

    const mode = params.dryRun ? "DRY RUN" : "EXECUTED";
    const preview = result.uids.slice(0, 20);
    const uidList = preview.join(", ");
    const more = result.uids.length > 20 ? ` ... and ${result.uids.length - 20} more` : "";
    return {
      content: [{
        type: "text",
        text: `${mode}: ${params.action} — ${result.affected} emails affected\nUIDs: ${uidList}${more}`,
      }],
    };
  } catch (error) {
    return errorResult(`Bulk action failed: ${error instanceof Error ? error.message : String(error)}`);
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
