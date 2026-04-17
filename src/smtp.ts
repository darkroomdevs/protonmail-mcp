import nodemailer from "nodemailer";
import type { ServerConfig } from "./config.js";
import type { SendEmailParams, SendResult } from "./types.js";

const PRIORITY_MAP: Record<string, string> = {
  high: "high",
  normal: "normal",
  low: "low",
};

export class SmtpClient {
  private transporter: nodemailer.Transporter;

  constructor(config: ServerConfig["smtp"]) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.username,
        pass: config.password,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  async send(params: SendEmailParams): Promise<SendResult> {
    const attachments = params.attachments?.map((attachment) => ({
      filename: attachment.filename,
      content: Buffer.from(attachment.content, "base64"),
      contentType: attachment.contentType,
    }));

    const extraHeaders: Record<string, string> = {};
    if (params.inReplyTo) {
      extraHeaders["In-Reply-To"] = params.inReplyTo;
    }
    if (params.references && params.references.length > 0) {
      extraHeaders["References"] = params.references.join(" ");
    }

    const mailOptions: nodemailer.SendMailOptions = {
      from: this.getFromAddress(),
      to: params.to,
      cc: params.cc,
      bcc: params.bcc,
      subject: params.subject,
      text: params.text,
      html: params.html,
      replyTo: params.replyTo,
      priority: params.priority ? PRIORITY_MAP[params.priority] as "high" | "normal" | "low" : undefined,
      attachments,
      headers: extraHeaders,
    };

    const info = await this.transporter.sendMail(mailOptions);

    return {
      messageId: info.messageId ?? "",
      accepted: Array.isArray(info.accepted)
        ? info.accepted.map((a: string | { address: string }) =>
            typeof a === "string" ? a : a.address
          )
        : [],
      rejected: Array.isArray(info.rejected)
        ? info.rejected.map((r: string | { address: string }) =>
            typeof r === "string" ? r : r.address
          )
        : [],
    };
  }

  private getFromAddress(): string {
    const auth = (this.transporter.options as { auth?: { user?: string } }).auth;
    return auth?.user ?? "";
  }

  async verify(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }

  close(): void {
    this.transporter.close();
  }
}
