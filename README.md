# @darkroomhq/protonmail-mcp

MCP server that gives AI assistants full access to your ProtonMail account via [Proton Bridge](https://proton.me/mail/bridge). Read, send, search, and manage email through any MCP-compatible client.

## Requirements

- [Proton Bridge](https://proton.me/mail/bridge) running locally and signed in
- Node.js 18+

## Installation

```bash
npm install -g @darkroomhq/protonmail-mcp
```

Or use without installing:

```bash
npx @darkroomhq/protonmail-mcp
```

## Configuration

Add to your MCP client config (e.g. `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "protonmail": {
      "command": "protonmail-mcp",
      "env": {
        "PROTONMAIL_USERNAME": "your@protonmail.com",
        "PROTONMAIL_PASSWORD": "bridge-app-password"
      }
    }
  }
}
```

With `npx` (no global install needed):

```json
{
  "mcpServers": {
    "protonmail": {
      "command": "npx",
      "args": ["-y", "@darkroomhq/protonmail-mcp"],
      "env": {
        "PROTONMAIL_USERNAME": "your@protonmail.com",
        "PROTONMAIL_PASSWORD": "bridge-app-password"
      }
    }
  }
}
```

> **Note:** `PROTONMAIL_PASSWORD` is the Bridge app password shown in Proton Bridge, not your ProtonMail account password.

### All environment variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `PROTONMAIL_USERNAME` | Yes | — | Your ProtonMail email address |
| `PROTONMAIL_PASSWORD` | Yes | — | Proton Bridge app password |
| `SMTP_HOST` | No | `127.0.0.1` | Bridge SMTP host |
| `SMTP_PORT` | No | `1025` | Bridge SMTP port |
| `IMAP_HOST` | No | `127.0.0.1` | Bridge IMAP host |
| `IMAP_PORT` | No | `1143` | Bridge IMAP port |
| `DEBUG` | No | `false` | Enable debug logging |

## Tools

| Tool | Description |
| --- | --- |
| `sendEmail` | Send an email with optional CC, BCC, HTML body, attachments, and priority |
| `replyEmail` | Reply to an existing email by UID |
| `listFolders` | List all mailboxes and folders |
| `listEmails` | List emails with pagination (page-based or stable cursor via `beforeUid`) |
| `readEmail` | Read email by UID (supports `headersOnly` and `maxBodyLength` for efficiency) |
| `searchEmails` | Search by sender, subject, body, date range, read/flagged status (with cursor pagination) |
| `bulkAction` | Bulk delete, move, mark read/unread, flag/unflag by criteria or UIDs (dry run by default) |
| `markRead` | Mark an email as read |
| `markUnread` | Mark an email as unread |
| `flagEmail` | Star/flag an email |
| `unflagEmail` | Remove star/flag from an email |
| `moveEmail` | Move an email to another folder |
| `deleteEmail` | Move an email to Trash |
| `createFolder` | Create a new mail folder |
| `deleteFolder` | Delete a mail folder |
| `renameFolder` | Rename a mail folder |
| `createLabel` | Create a new mail label |
| `deleteLabel` | Delete a mail label |
| `renameLabel` | Rename a mail label |
| `connectionStatus` | Check SMTP and IMAP connection health |

## Example prompts

### Read & summarize

- "Summarize my unread emails from this week."
- "Read the latest email from alice and tell me what she's asking for."

### Search

- "Find all emails about the Q2 report from the last 30 days."
- "Search for any flagged emails in my Sent folder."

### Send & reply

- "Send an email to bob letting him know the meeting is moved to Thursday at 3pm."
- "Reply to the last email from the design team and ask for the updated mockups."

### Bulk operations

- "Delete all emails from IGN in my inbox."
- "Mark all unread newsletters as read."
- "Move all emails from noreply@github.com to the GitHub folder."
- "How many flagged emails do I have from the last month?" (uses dry run)

### Organize

- "Move all newsletters from my inbox to the Newsletters folder."
- "Flag the three most recent emails from my manager."
- "Delete all emails in the Spam folder."
- "Create a folder called 'Receipts' and move all purchase confirmations there."
- "Create a label called 'Urgent' for emails that need immediate attention."
- "Rename the 'Old Projects' folder to 'Archive'."

### Status

- "Check if Proton Bridge is connected."

## Performance tips

- **Cursor pagination**: Use `beforeUid` (returned as `nextCursor`) instead of `page` for stable pagination that isn't affected by new emails arriving between requests.
- **Headers only**: Use `headersOnly: true` on `readEmail` to skip downloading the full message body — useful when you only need metadata.
- **Body truncation**: Use `maxBodyLength` on `readEmail` to cap body size (e.g. `2000` chars) and avoid large responses from email-heavy messages.
- **Bulk actions**: Use `bulkAction` with search `criteria` instead of looping over individual emails. It runs a single IMAP SEARCH + a single bulk command, regardless of how many emails match.
- **Dry run**: `bulkAction` defaults to `dryRun: true` — preview affected emails before committing destructive operations.

## Development

```bash
npm install
npm run build   # compile TypeScript
npm run dev     # watch mode
```
