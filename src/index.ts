#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { SmtpClient } from "./smtp.js";
import { ImapClient } from "./imap.js";
import {
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
} from "./tools/definitions.js";
import { handleSendEmail, handleReplyEmail } from "./tools/send.js";
import {
  handleListFolders,
  handleListEmails,
  handleReadEmail,
  handleSearchEmails,
} from "./tools/read.js";
import {
  handleMarkRead,
  handleMarkUnread,
  handleFlagEmail,
  handleUnflagEmail,
  handleMoveEmail,
  handleDeleteEmail,
  handleBulkAction,
  handleCreateFolder,
  handleDeleteFolder,
  handleRenameFolder,
  handleCreateLabel,
  handleDeleteLabel,
  handleRenameLabel,
} from "./tools/actions.js";
import { handleConnectionStatus } from "./tools/system.js";

let config: ReturnType<typeof loadConfig>;
try {
  config = loadConfig();
} catch (error) {
  process.stderr.write(`Configuration error: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}

const smtp = new SmtpClient(config.smtp);
const imap = new ImapClient(config.imap);

const server = new McpServer({
  name: "protonmail-mcp",
  version: "1.0.0",
});

server.registerTool(
  sendEmailTool.name,
  {
    description: sendEmailTool.description,
    inputSchema: sendEmailTool.schema,
    annotations: sendEmailTool.annotations,
  },
  async (params) => handleSendEmail(smtp, params as Parameters<typeof handleSendEmail>[1])
);

server.registerTool(
  replyEmailTool.name,
  {
    description: replyEmailTool.description,
    inputSchema: replyEmailTool.schema,
    annotations: replyEmailTool.annotations,
  },
  async (params) =>
    handleReplyEmail(
      smtp,
      imap,
      params as Parameters<typeof handleReplyEmail>[2]
    )
);

server.registerTool(
  listFoldersTool.name,
  {
    description: listFoldersTool.description,
    inputSchema: listFoldersTool.schema,
    annotations: listFoldersTool.annotations,
  },
  async () => handleListFolders(imap)
);

server.registerTool(
  listEmailsTool.name,
  {
    description: listEmailsTool.description,
    inputSchema: listEmailsTool.schema,
    annotations: listEmailsTool.annotations,
  },
  async (params) =>
    handleListEmails(
      imap,
      params as Parameters<typeof handleListEmails>[1]
    )
);

server.registerTool(
  readEmailTool.name,
  {
    description: readEmailTool.description,
    inputSchema: readEmailTool.schema,
    annotations: readEmailTool.annotations,
  },
  async (params) =>
    handleReadEmail(imap, params as Parameters<typeof handleReadEmail>[1])
);

server.registerTool(
  searchEmailsTool.name,
  {
    description: searchEmailsTool.description,
    inputSchema: searchEmailsTool.schema,
    annotations: searchEmailsTool.annotations,
  },
  async (params) =>
    handleSearchEmails(
      imap,
      params as Parameters<typeof handleSearchEmails>[1]
    )
);

server.registerTool(
  markReadTool.name,
  {
    description: markReadTool.description,
    inputSchema: markReadTool.schema,
    annotations: markReadTool.annotations,
  },
  async (params) =>
    handleMarkRead(imap, params as Parameters<typeof handleMarkRead>[1])
);

server.registerTool(
  markUnreadTool.name,
  {
    description: markUnreadTool.description,
    inputSchema: markUnreadTool.schema,
    annotations: markUnreadTool.annotations,
  },
  async (params) =>
    handleMarkUnread(imap, params as Parameters<typeof handleMarkUnread>[1])
);

server.registerTool(
  flagEmailTool.name,
  {
    description: flagEmailTool.description,
    inputSchema: flagEmailTool.schema,
    annotations: flagEmailTool.annotations,
  },
  async (params) =>
    handleFlagEmail(imap, params as Parameters<typeof handleFlagEmail>[1])
);

server.registerTool(
  unflagEmailTool.name,
  {
    description: unflagEmailTool.description,
    inputSchema: unflagEmailTool.schema,
    annotations: unflagEmailTool.annotations,
  },
  async (params) =>
    handleUnflagEmail(imap, params as Parameters<typeof handleUnflagEmail>[1])
);

server.registerTool(
  moveEmailTool.name,
  {
    description: moveEmailTool.description,
    inputSchema: moveEmailTool.schema,
    annotations: moveEmailTool.annotations,
  },
  async (params) =>
    handleMoveEmail(imap, params as Parameters<typeof handleMoveEmail>[1])
);

server.registerTool(
  deleteEmailTool.name,
  {
    description: deleteEmailTool.description,
    inputSchema: deleteEmailTool.schema,
    annotations: deleteEmailTool.annotations,
  },
  async (params) =>
    handleDeleteEmail(imap, params as Parameters<typeof handleDeleteEmail>[1])
);

server.registerTool(
  bulkActionTool.name,
  {
    description: bulkActionTool.description,
    inputSchema: bulkActionTool.schema,
    annotations: bulkActionTool.annotations,
  },
  async (params) =>
    handleBulkAction(imap, params as Parameters<typeof handleBulkAction>[1])
);

server.registerTool(
  createFolderTool.name,
  {
    description: createFolderTool.description,
    inputSchema: createFolderTool.schema,
    annotations: createFolderTool.annotations,
  },
  async (params) =>
    handleCreateFolder(imap, params as Parameters<typeof handleCreateFolder>[1])
);

server.registerTool(
  deleteFolderTool.name,
  {
    description: deleteFolderTool.description,
    inputSchema: deleteFolderTool.schema,
    annotations: deleteFolderTool.annotations,
  },
  async (params) =>
    handleDeleteFolder(imap, params as Parameters<typeof handleDeleteFolder>[1])
);

server.registerTool(
  renameFolderTool.name,
  {
    description: renameFolderTool.description,
    inputSchema: renameFolderTool.schema,
    annotations: renameFolderTool.annotations,
  },
  async (params) =>
    handleRenameFolder(imap, params as Parameters<typeof handleRenameFolder>[1])
);

server.registerTool(
  createLabelTool.name,
  {
    description: createLabelTool.description,
    inputSchema: createLabelTool.schema,
    annotations: createLabelTool.annotations,
  },
  async (params) =>
    handleCreateLabel(imap, params as Parameters<typeof handleCreateLabel>[1])
);

server.registerTool(
  deleteLabelTool.name,
  {
    description: deleteLabelTool.description,
    inputSchema: deleteLabelTool.schema,
    annotations: deleteLabelTool.annotations,
  },
  async (params) =>
    handleDeleteLabel(imap, params as Parameters<typeof handleDeleteLabel>[1])
);

server.registerTool(
  renameLabelTool.name,
  {
    description: renameLabelTool.description,
    inputSchema: renameLabelTool.schema,
    annotations: renameLabelTool.annotations,
  },
  async (params) =>
    handleRenameLabel(imap, params as Parameters<typeof handleRenameLabel>[1])
);

server.registerTool(
  connectionStatusTool.name,
  {
    description: connectionStatusTool.description,
    inputSchema: connectionStatusTool.schema,
    annotations: connectionStatusTool.annotations,
  },
  async () => handleConnectionStatus(smtp, imap)
);

const transport = new StdioServerTransport();

process.on("SIGINT", async () => {
  await imap.disconnect();
  smtp.close();
  process.exit(0);
});

await server.connect(transport);
