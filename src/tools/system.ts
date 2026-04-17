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

  const status = {
    smtp: {
      connected: smtpConnected,
      error:
        smtpResult.status === "rejected"
          ? String(smtpResult.reason)
          : undefined,
    },
    imap: {
      connected: imapConnected,
      error:
        imapResult.status === "rejected"
          ? String(imapResult.reason)
          : undefined,
    },
  };

  return {
    content: [{ type: "text", text: JSON.stringify(status) }],
  };
}
