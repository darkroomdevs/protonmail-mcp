import type { SmtpClient } from "../smtp.js";
import type { ImapClient } from "../imap.js";
import type { SendEmailParams, SendResult } from "../types.js";

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

export async function handleSendEmail(
  smtp: SmtpClient,
  params: SendEmailParams
): Promise<ToolResult> {
  try {
    const result: SendResult = await smtp.send(params);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Failed to send email: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
}

export async function handleReplyEmail(
  smtp: SmtpClient,
  imap: ImapClient,
  params: {
    folder: string;
    uid: number;
    text?: string;
    html?: string;
    cc?: string[];
    bcc?: string[];
  }
): Promise<ToolResult> {
  if (!(await imap.isAvailable())) {
    return {
      content: [{ type: "text", text: "IMAP unavailable — Proton Bridge may not be running. Use sendEmail with manual headers instead." }],
      isError: true,
    };
  }

  try {
    const original = await imap.readEmail(params.folder, params.uid);

    const replyTarget = original.replyTo.length > 0 ? original.replyTo : original.from;
    const toAddresses = replyTarget.map((addr) =>
      addr.name ? `${addr.name} <${addr.address}>` : addr.address
    );

    const subject = original.subject.startsWith("Re:")
      ? original.subject
      : `Re: ${original.subject}`;

    const references = [...original.references, original.messageId].filter(Boolean);

    const sendParams: SendEmailParams = {
      to: toAddresses,
      cc: params.cc,
      bcc: params.bcc,
      subject,
      text: params.text,
      html: params.html,
      inReplyTo: original.messageId || undefined,
      references: references.length > 0 ? references : undefined,
    };

    const result = await smtp.send(sendParams);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Failed to reply: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
}
