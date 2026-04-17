import { z } from "zod";

export const sendEmailTool = {
  name: "sendEmail",
  description: "Send an email via ProtonMail Bridge",
  schema: z
    .object({
      to: z.array(z.string()).min(1).describe("Recipient email addresses"),
      cc: z.array(z.string()).optional().describe("CC recipients"),
      bcc: z.array(z.string()).optional().describe("BCC recipients"),
      subject: z.string().describe("Email subject"),
      text: z.string().optional().describe("Plain text body"),
      html: z.string().optional().describe("HTML body"),
      replyTo: z.string().optional().describe("Reply-To address"),
      priority: z
        .enum(["high", "normal", "low"])
        .optional()
        .describe("Email priority"),
      attachments: z
        .array(
          z.object({
            filename: z.string(),
            content: z.string().describe("Base64 encoded content"),
            contentType: z.string().optional(),
          })
        )
        .optional()
        .describe("File attachments"),
    })
    .refine((data) => data.text !== undefined || data.html !== undefined, {
      message: "Either text or html body is required",
    }),
  annotations: { title: "Send Email", readOnlyHint: false, destructiveHint: false },
};

export const replyEmailTool = {
  name: "replyEmail",
  description: "Reply to an existing email",
  schema: z
    .object({
      folder: z.string().regex(/^[^\r\n\0]+$/).default("INBOX").describe("Folder containing the email"),
      uid: z.number().describe("UID of the email to reply to"),
      text: z.string().optional().describe("Plain text reply body"),
      html: z.string().optional().describe("HTML reply body"),
      cc: z.array(z.string()).optional().describe("Additional CC recipients"),
      bcc: z.array(z.string()).optional().describe("BCC recipients"),
    })
    .refine((data) => data.text !== undefined || data.html !== undefined, {
      message: "Either text or html body is required",
    }),
  annotations: { title: "Reply to Email", readOnlyHint: false, destructiveHint: false },
};

export const listFoldersTool = {
  name: "listFolders",
  description: "List all available mail folders/mailboxes",
  schema: z.object({}),
  annotations: { title: "List Folders", readOnlyHint: true, destructiveHint: false },
};

export const listEmailsTool = {
  name: "listEmails",
  description: "List emails in a folder with pagination",
  schema: z.object({
    folder: z.string().regex(/^[^\r\n\0]+$/).default("INBOX").describe("Folder to list emails from"),
    page: z.number().default(1).describe("Page number (1-based)"),
    pageSize: z.number().min(1).max(50).default(20).describe("Emails per page"),
  }),
  annotations: { title: "List Emails", readOnlyHint: true, destructiveHint: false },
};

export const readEmailTool = {
  name: "readEmail",
  description: "Read the full content of an email by UID",
  schema: z.object({
    folder: z.string().regex(/^[^\r\n\0]+$/).default("INBOX").describe("Folder containing the email"),
    uid: z.number().describe("Email UID"),
  }),
  annotations: { title: "Read Email", readOnlyHint: true, destructiveHint: false },
};

export const searchEmailsTool = {
  name: "searchEmails",
  description: "Search emails by various criteria",
  schema: z.object({
    folder: z.string().regex(/^[^\r\n\0]+$/).default("INBOX").describe("Folder to search in"),
    from: z.string().optional().describe("Filter by sender"),
    to: z.string().optional().describe("Filter by recipient"),
    subject: z.string().optional().describe("Filter by subject"),
    body: z.string().optional().describe("Filter by body text"),
    since: z.string().optional().describe("Emails since this date (ISO 8601)"),
    before: z.string().optional().describe("Emails before this date (ISO 8601)"),
    seen: z.boolean().optional().describe("Filter by read status"),
    flagged: z.boolean().optional().describe("Filter by flagged status"),
    limit: z.number().max(100).default(50).describe("Maximum results"),
  }),
  annotations: { title: "Search Emails", readOnlyHint: true, destructiveHint: false },
};

export const markReadTool = {
  name: "markRead",
  description: "Mark an email as read",
  schema: z.object({
    folder: z.string().regex(/^[^\r\n\0]+$/).default("INBOX").describe("Folder containing the email"),
    uid: z.number().describe("Email UID"),
  }),
  annotations: { title: "Mark as Read", readOnlyHint: false, destructiveHint: false },
};

export const markUnreadTool = {
  name: "markUnread",
  description: "Mark an email as unread",
  schema: z.object({
    folder: z.string().regex(/^[^\r\n\0]+$/).default("INBOX").describe("Folder containing the email"),
    uid: z.number().describe("Email UID"),
  }),
  annotations: { title: "Mark as Unread", readOnlyHint: false, destructiveHint: false },
};

export const flagEmailTool = {
  name: "flagEmail",
  description: "Flag (star) an email",
  schema: z.object({
    folder: z.string().regex(/^[^\r\n\0]+$/).default("INBOX").describe("Folder containing the email"),
    uid: z.number().describe("Email UID"),
  }),
  annotations: { title: "Flag Email", readOnlyHint: false, destructiveHint: false },
};

export const unflagEmailTool = {
  name: "unflagEmail",
  description: "Remove flag from an email",
  schema: z.object({
    folder: z.string().regex(/^[^\r\n\0]+$/).default("INBOX").describe("Folder containing the email"),
    uid: z.number().describe("Email UID"),
  }),
  annotations: { title: "Unflag Email", readOnlyHint: false, destructiveHint: false },
};

export const moveEmailTool = {
  name: "moveEmail",
  description: "Move an email to another folder",
  schema: z.object({
    folder: z.string().regex(/^[^\r\n\0]+$/).describe("Source folder"),
    uid: z.number().describe("Email UID"),
    destination: z.string().regex(/^[^\r\n\0]+$/).describe("Destination folder"),
  }),
  annotations: { title: "Move Email", readOnlyHint: false, destructiveHint: false },
};

export const deleteEmailTool = {
  name: "deleteEmail",
  description: "Delete an email (moves to Trash)",
  schema: z.object({
    folder: z.string().regex(/^[^\r\n\0]+$/).default("INBOX").describe("Folder containing the email"),
    uid: z.number().describe("Email UID"),
  }),
  annotations: { title: "Delete Email", readOnlyHint: false, destructiveHint: true },
};

export const connectionStatusTool = {
  name: "connectionStatus",
  description: "Check SMTP and IMAP connection status",
  schema: z.object({}),
  annotations: { title: "Connection Status", readOnlyHint: true, destructiveHint: false },
};

export const ALL_TOOLS = [
  sendEmailTool,
  replyEmailTool,
  listFoldersTool,
  listEmailsTool,
  readEmailTool,
  searchEmailsTool,
  markReadTool,
  markUnreadTool,
  flagEmailTool,
  unflagEmailTool,
  moveEmailTool,
  deleteEmailTool,
  connectionStatusTool,
] as const;
