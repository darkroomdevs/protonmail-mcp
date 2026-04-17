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

export async function handleListFolders(imap: ImapClient): Promise<ToolResult> {
  if (!(await imap.isAvailable())) return IMAP_UNAVAILABLE;
  try {
    const folders = await imap.listMailboxes();
    return { content: [{ type: "text", text: JSON.stringify(folders) }] };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Failed to list folders: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
}

export async function handleListEmails(
  imap: ImapClient,
  params: { folder: string; page: number; pageSize: number }
): Promise<ToolResult> {
  if (!(await imap.isAvailable())) return IMAP_UNAVAILABLE;
  try {
    const result = await imap.listEmails(params.folder, params.page, params.pageSize);
    const serializable = {
      total: result.total,
      emails: result.emails.map((email) => ({
        ...email,
        date: email.date.toISOString(),
      })),
    };
    return { content: [{ type: "text", text: JSON.stringify(serializable) }] };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Failed to list emails: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
}

export async function handleReadEmail(
  imap: ImapClient,
  params: { folder: string; uid: number }
): Promise<ToolResult> {
  if (!(await imap.isAvailable())) return IMAP_UNAVAILABLE;
  try {
    const email = await imap.readEmail(params.folder, params.uid);
    const serializable = { ...email, date: email.date.toISOString() };
    return { content: [{ type: "text", text: JSON.stringify(serializable) }] };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Failed to read email: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
}

export async function handleSearchEmails(
  imap: ImapClient,
  params: { folder: string; limit: number } & SearchCriteria
): Promise<ToolResult> {
  if (!(await imap.isAvailable())) return IMAP_UNAVAILABLE;
  try {
    const { folder, limit, ...criteria } = params;
    const emails = await imap.searchEmails(folder, criteria, limit);
    const serializable = emails.map((email) => ({
      ...email,
      date: email.date.toISOString(),
    }));
    return { content: [{ type: "text", text: JSON.stringify(serializable) }] };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Failed to search: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
}
