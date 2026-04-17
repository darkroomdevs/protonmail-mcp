import type { ImapClient } from "../imap.js";
import type { EmailAddress, EmailEnvelope, EmailFull, MailboxInfo } from "../types.js";
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

function formatAddress(addr: EmailAddress): string {
  return addr.name ? `${addr.name} <${addr.address}>` : addr.address;
}

function formatAddressList(addresses: EmailAddress[]): string {
  return addresses.map(formatAddress).join(", ") || "(none)";
}

function formatDate(date: Date): string {
  return date.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}

function formatFlags(flags: string[]): string {
  if (flags.length === 0) return "";
  const labels = flags.map((f) => f.replace("\\", "")).join(", ");
  return ` [${labels}]`;
}

function formatSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return ` (${bytes}B)`;
  if (bytes < 1024 * 1024) return ` (${Math.round(bytes / 1024)}KB)`;
  return ` (${(bytes / (1024 * 1024)).toFixed(1)}MB)`;
}

function formatEmailLine(email: EmailEnvelope): string {
  const from = formatAddressList(email.from);
  const date = formatDate(email.date);
  const flags = formatFlags(email.flags);
  return `UID ${email.uid} | ${date} | ${from} | ${email.subject}${flags}${formatSize(email.size)}`;
}

function formatFolder(folder: MailboxInfo): string {
  const special = folder.specialUse ? ` (${folder.specialUse.replace("\\", "")})` : "";
  const unseen = folder.unseen > 0 ? `, ${folder.unseen} unread` : "";
  return `${folder.path}${special} — ${folder.messages} emails${unseen}`;
}

export async function handleListFolders(imap: ImapClient): Promise<ToolResult> {
  if (!(await imap.isAvailable())) return IMAP_UNAVAILABLE;
  try {
    const folders = await imap.listMailboxes();
    const lines = folders.map(formatFolder);
    return { content: [{ type: "text", text: lines.join("\n") }] };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Failed to list folders: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
}

export async function handleListEmails(
  imap: ImapClient,
  params: { folder: string; page?: number; pageSize: number; beforeUid?: number }
): Promise<ToolResult> {
  if (!(await imap.isAvailable())) return IMAP_UNAVAILABLE;
  try {
    const result = await imap.listEmails(params.folder, params.pageSize, {
      page: params.page,
      beforeUid: params.beforeUid,
    });

    const header = `${result.total} emails in ${params.folder}, showing ${result.emails.length}`;
    const cursor = result.nextCursor ? `\nnextCursor: ${result.nextCursor}` : "";
    const lines = result.emails.map(formatEmailLine);
    return { content: [{ type: "text", text: `${header}${cursor}\n\n${lines.join("\n")}` }] };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Failed to list emails: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
}

function truncateBody(body: string | null, maxLength?: number): { text: string | null; truncated: boolean } {
  if (!body || !maxLength || body.length <= maxLength) {
    return { text: body, truncated: false };
  }
  return { text: body.slice(0, maxLength) + "\n\n[truncated]", truncated: true };
}

export async function handleReadEmail(
  imap: ImapClient,
  params: { folder: string; uid: number; headersOnly?: boolean; maxBodyLength?: number }
): Promise<ToolResult> {
  if (!(await imap.isAvailable())) return IMAP_UNAVAILABLE;
  try {
    const email = await imap.readEmail(params.folder, params.uid, params.headersOnly);
    const textResult = truncateBody(email.text, params.maxBodyLength);
    const htmlResult = truncateBody(email.html, params.maxBodyLength);

    const parts: string[] = [
      `UID: ${email.uid}`,
      `From: ${formatAddressList(email.from)}`,
      `To: ${formatAddressList(email.to)}`,
    ];
    if (email.cc.length > 0) parts.push(`CC: ${formatAddressList(email.cc)}`);
    if (email.bcc.length > 0) parts.push(`BCC: ${formatAddressList(email.bcc)}`);
    if (email.replyTo.length > 0) parts.push(`Reply-To: ${formatAddressList(email.replyTo)}`);
    parts.push(`Date: ${formatDate(email.date)}`);
    parts.push(`Subject: ${email.subject}`);
    if (email.flags.length > 0) parts.push(`Flags: ${email.flags.join(", ")}`);
    if (email.size) parts.push(`Size: ${formatSize(email.size).trim()}`);
    if (email.messageId) parts.push(`Message-ID: ${email.messageId}`);
    if (email.inReplyTo) parts.push(`In-Reply-To: ${email.inReplyTo}`);
    if (email.references.length > 0) parts.push(`References: ${email.references.join(", ")}`);
    if (email.attachments.length > 0) {
      const atts = email.attachments.map((a) => `  ${a.filename} (${a.contentType}${formatSize(a.size)})`);
      parts.push(`Attachments:\n${atts.join("\n")}`);
    }

    if (textResult.text) {
      parts.push(`\n--- Body (text) ---\n${textResult.text}`);
    }
    if (htmlResult.text) {
      parts.push(`\n--- Body (html) ---\n${htmlResult.text}`);
    }
    if (textResult.truncated || htmlResult.truncated) {
      parts.push("\n[body truncated — use maxBodyLength=0 or omit for full content]");
    }

    return { content: [{ type: "text", text: parts.join("\n") }] };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Failed to read email: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
}

export async function handleSearchEmails(
  imap: ImapClient,
  params: { folder: string; limit: number; beforeUid?: number } & SearchCriteria
): Promise<ToolResult> {
  if (!(await imap.isAvailable())) return IMAP_UNAVAILABLE;
  try {
    const { folder, limit, beforeUid, ...criteria } = params;
    const result = await imap.searchEmails(folder, criteria, limit, beforeUid);

    const header = `${result.totalMatches} matches, showing ${result.emails.length}`;
    const cursor = result.nextCursor ? `\nnextCursor: ${result.nextCursor}` : "";
    const lines = result.emails.map(formatEmailLine);
    return { content: [{ type: "text", text: `${header}${cursor}\n\n${lines.join("\n")}` }] };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Failed to search: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
}
