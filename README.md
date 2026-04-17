# protonmail-mcp

MCP server for ProtonMail via Proton Bridge (SMTP + IMAP).

## Requirements

- [Proton Bridge](https://proton.me/mail/bridge) running locally
- Node.js 18+

## Installation

```bash
npm install -g @darkroomhq/protonmail-mcp
# or run without installing
npx @darkroomhq/protonmail-mcp
```

## Configuration

Add to your AI client config:

```json
{
  "mcpServers": {
    "protonmail": {
      "command": "@darkroomhq/protonmail-mcp",
      "env": {
        "BRIDGE_HOST": "127.0.0.1",
        "BRIDGE_IMAP_PORT": "1143",
        "BRIDGE_SMTP_PORT": "1025",
        "BRIDGE_EMAIL": "your@protonmail.com",
        "BRIDGE_PASSWORD": "bridge-password"
      }
    }
  }
}
```

Or with `npx` (no install needed):

```json
{
  "mcpServers": {
    "protonmail": {
      "command": "npx",
      "args": ["@darkroomhq/protonmail-mcp"],
      "env": {
        "BRIDGE_HOST": "127.0.0.1",
        "BRIDGE_IMAP_PORT": "1143",
        "BRIDGE_SMTP_PORT": "1025",
        "BRIDGE_EMAIL": "your@protonmail.com",
        "BRIDGE_PASSWORD": "bridge-password"
      }
    }
  }
}
```

## Development

```bash
npm run dev   # watch mode
npm start     # run server
```
