import type { SmtpClient } from "../smtp.js";
import type { ImapClient } from "../imap.js";

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

export async function handleConnectionStatus(
  smtp: SmtpClient,
  imap: ImapClient
): Promise<ToolResult> {
  const [smtpResult, imapResult] = await Promise.allSettled([
    smtp.verify(),
    imap.isAvailable(),
  ]);

  const smtpConnected =
    smtpResult.status === "fulfilled" ? smtpResult.value : false;
  const imapConnected =
    imapResult.status === "fulfilled" ? imapResult.value : false;

  const smtpLine = smtpConnected
    ? "SMTP: connected"
    : `SMTP: disconnected${smtpResult.status === "rejected" ? ` (${smtpResult.reason})` : ""}`;
  const imapLine = imapConnected
    ? "IMAP: connected"
    : `IMAP: disconnected${imapResult.status === "rejected" ? ` (${imapResult.reason})` : ""}`;

  return {
    content: [{ type: "text", text: `${smtpLine}\n${imapLine}` }],
  };
}
