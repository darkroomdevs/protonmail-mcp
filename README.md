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
|---|---|---|---|
| `PROTONMAIL_USERNAME` | Yes | — | Your ProtonMail email address |
| `PROTONMAIL_PASSWORD` | Yes | — | Proton Bridge app password |
| `SMTP_HOST` | No | `127.0.0.1` | Bridge SMTP host |
| `SMTP_PORT` | No | `1025` | Bridge SMTP port |
| `IMAP_HOST` | No | `127.0.0.1` | Bridge IMAP host |
| `IMAP_PORT` | No | `1143` | Bridge IMAP port |
| `DEBUG` | No | `false` | Enable debug logging |

## Tools

| Tool | Description |
|---|---|
| `sendEmail` | Send an email with optional CC, BCC, HTML body, attachments, and priority |
| `replyEmail` | Reply to an existing email by UID |
| `listFolders` | List all mailboxes and folders |
| `listEmails` | List emails in a folder with pagination |
| `readEmail` | Read the full content of an email by UID |
| `searchEmails` | Search by sender, subject, body, date range, read/flagged status |
| `markRead` | Mark an email as read |
| `markUnread` | Mark an email as unread |
| `flagEmail` | Star/flag an email |
| `unflagEmail` | Remove star/flag from an email |
| `moveEmail` | Move an email to another folder |
| `deleteEmail` | Move an email to Trash |
| `connectionStatus` | Check SMTP and IMAP connection health |

## Example prompts

**Read & summarize**
> "Summarize my unread emails from this week."

> "Read the latest email from alice@example.com and tell me what she's asking for."

**Search**
> "Find all emails about the Q2 report from the last 30 days."

> "Search for any flagged emails in my Sent folder."

**Send & reply**
> "Send an email to bob@example.com letting him know the meeting is moved to Thursday at 3pm."

> "Reply to the last email from the design team and ask for the updated mockups."

**Organize**
> "Move all newsletters from my inbox to the Newsletters folder."

> "Flag the three most recent emails from my manager."

> "Delete all emails in the Spam folder."

**Status**
> "Check if Proton Bridge is connected."

## Development

```bash
npm install
npm run build   # compile TypeScript
npm run dev     # watch mode
```
