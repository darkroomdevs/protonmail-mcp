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
  description: "List emails in a folder with pagination. Supports stable cursor-based pagination via beforeUid (preferred) or classic page numbers",
  schema: z.object({
    folder: z.string().regex(/^[^\r\n\0]+$/).default("INBOX").describe("Folder to list emails from"),
    page: z.number().optional().describe("Page number (1-based). Ignored when beforeUid is set"),
    pageSize: z.number().min(1).max(100).default(20).describe("Emails per page"),
    beforeUid: z.number().optional().describe("Cursor: return emails with UID less than this value. Use nextCursor from previous response to paginate"),
  }),
  annotations: { title: "List Emails", readOnlyHint: true, destructiveHint: false },
};

export const readEmailTool = {
  name: "readEmail",
  description: "Read an email by UID. Use headersOnly=true for metadata without downloading the full message body",
  schema: z.object({
    folder: z.string().regex(/^[^\r\n\0]+$/).default("INBOX").describe("Folder containing the email"),
    uid: z.number().describe("Email UID"),
    headersOnly: z.boolean().optional().default(false).describe("If true, return only headers/envelope without body content"),
    maxBodyLength: z.number().optional().describe("Truncate text/html body to this many characters. Omit for full body"),
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
    limit: z.number().max(200).default(50).describe("Results per page"),
    beforeUid: z.number().optional().describe("Cursor: return matches with UID less than this value. Use nextCursor from previous response to paginate"),
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

export const createFolderTool = {
  name: "createFolder",
  description: "Create a new mail folder (auto-prefixed under Folders/). An email can only be in one folder",
  schema: z.object({
    name: z.string().regex(/^[^\r\n\0/]+$/).describe("Folder name (e.g. 'Projects'). Nested paths use '/' (e.g. 'Work/Clients')"),
  }),
  annotations: { title: "Create Folder", readOnlyHint: false, destructiveHint: false },
};

export const deleteFolderTool = {
  name: "deleteFolder",
  description: "Delete a mail folder. The folder must be empty. Automatically looks under Folders/",
  schema: z.object({
    name: z.string().regex(/^[^\r\n\0/]+$/).describe("Folder name to delete"),
  }),
  annotations: { title: "Delete Folder", readOnlyHint: false, destructiveHint: true },
};

export const renameFolderTool = {
  name: "renameFolder",
  description: "Rename a mail folder. Automatically looks under Folders/",
  schema: z.object({
    oldName: z.string().regex(/^[^\r\n\0/]+$/).describe("Current folder name"),
    newName: z.string().regex(/^[^\r\n\0/]+$/).describe("New folder name"),
  }),
  annotations: { title: "Rename Folder", readOnlyHint: false, destructiveHint: false },
};

export const createLabelTool = {
  name: "createLabel",
  description: "Create a new mail label (auto-prefixed under Labels/). An email can have multiple labels",
  schema: z.object({
    name: z.string().regex(/^[^\r\n\0/]+$/).describe("Label name (e.g. 'Important')"),
  }),
  annotations: { title: "Create Label", readOnlyHint: false, destructiveHint: false },
};

export const deleteLabelTool = {
  name: "deleteLabel",
  description: "Delete a mail label. Automatically looks under Labels/",
  schema: z.object({
    name: z.string().regex(/^[^\r\n\0/]+$/).describe("Label name to delete"),
  }),
  annotations: { title: "Delete Label", readOnlyHint: false, destructiveHint: true },
};

export const renameLabelTool = {
  name: "renameLabel",
  description: "Rename a mail label. Automatically looks under Labels/",
  schema: z.object({
    oldName: z.string().regex(/^[^\r\n\0/]+$/).describe("Current label name"),
    newName: z.string().regex(/^[^\r\n\0/]+$/).describe("New label name"),
  }),
  annotations: { title: "Rename Label", readOnlyHint: false, destructiveHint: false },
};

export const bulkActionTool = {
  name: "bulkAction",
  description: "Perform bulk operations on emails matching criteria or explicit UIDs. Defaults to dry run (preview only). Use dryRun=false to execute",
  schema: z.object({
    folder: z.string().regex(/^[^\r\n\0]+$/).default("INBOX").describe("Folder to operate on"),
    action: z.enum(["delete", "move", "markRead", "markUnread", "flag", "unflag"]).describe("Action to perform"),
    criteria: z.object({
      from: z.string().optional(),
      to: z.string().optional(),
      subject: z.string().optional(),
      body: z.string().optional(),
      since: z.string().optional(),
      before: z.string().optional(),
      seen: z.boolean().optional(),
      flagged: z.boolean().optional(),
    }).optional().describe("Search criteria to match emails"),
    uids: z.array(z.number()).optional().describe("Explicit UIDs to operate on (alternative to criteria)"),
    destination: z.string().regex(/^[^\r\n\0]+$/).optional().describe("Destination folder (required for move action)"),
    dryRun: z.boolean().default(true).describe("Preview affected emails without executing. Set to false to execute"),
  }),
  annotations: { title: "Bulk Action", readOnlyHint: false, destructiveHint: true },
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
  bulkActionTool,
  createFolderTool,
  deleteFolderTool,
  renameFolderTool,
  createLabelTool,
  deleteLabelTool,
  renameLabelTool,
  connectionStatusTool,
] as const;
