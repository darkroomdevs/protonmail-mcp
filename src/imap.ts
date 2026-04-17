import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import type { ServerConfig } from "./config.js";
import type {
  EmailAddress,
  EmailEnvelope,
  EmailFull,
  MailboxInfo,
  SearchCriteria,
} from "./types.js";

interface ImapAddress {
  address?: string;
  name?: string;
}

function mapAddresses(addresses: ImapAddress[] | undefined): EmailAddress[] {
  if (!addresses) return [];
  return addresses.map((addr) => ({
    name: addr.name ?? "",
    address: addr.address ?? "",
  }));
}

function flagsToArray(flags: Set<string> | undefined): string[] {
  if (!flags) return [];
  return [...flags];
}

function validateFolder(folder: string): void {
  if (!folder || /[\r\n\0]/.test(folder)) {
    throw new Error(`Invalid folder name: "${folder}"`);
  }
}

function parseSearchDate(value: string, field: string): Date {
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) {
    throw new Error(`Invalid ${field} date: "${value}"`);
  }
  return parsed;
}

export class ImapClient {
  private config: ServerConfig["imap"];
  private client: ImapFlow | null = null;
  private connectingPromise: Promise<ImapFlow> | null = null;

  constructor(config: ServerConfig["imap"]) {
    this.config = config;
  }

  private async ensureConnected(): Promise<ImapFlow> {
    if (this.client?.usable) return this.client;
    if (this.connectingPromise) return this.connectingPromise;

    this.connectingPromise = this.createConnection().finally(() => {
      this.connectingPromise = null;
    });
    return this.connectingPromise;
  }

  private async createConnection(): Promise<ImapFlow> {
    this.client = null;
    const client = new ImapFlow({
      host: this.config.host,
      port: this.config.port,
      // Proton Bridge uses self-signed cert on localhost
      secure: this.config.secure,
      auth: {
        user: this.config.username,
        pass: this.config.password,
      },
      tls: {
        rejectUnauthorized: false,
      },
      logger: false,
    });

    await client.connect();
    this.client = client;
    return client;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.logout();
      } catch {
        // ignore errors on disconnect
      }
      this.client = null;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.ensureConnected();
      return true;
    } catch {
      return false;
    }
  }

  async listMailboxes(): Promise<MailboxInfo[]> {
    const client = await this.ensureConnected();
    const mailboxes = await client.list();
    const results: MailboxInfo[] = [];

    for (const mailbox of mailboxes) {
      try {
        const status = await client.status(mailbox.path, {
          messages: true,
          unseen: true,
        });

        results.push({
          path: mailbox.path,
          name: mailbox.name,
          specialUse: mailbox.specialUse ?? null,
          messages: status.messages ?? 0,
          unseen: status.unseen ?? 0,
        });
      } catch {
        results.push({
          path: mailbox.path,
          name: mailbox.name,
          specialUse: mailbox.specialUse ?? null,
          messages: 0,
          unseen: 0,
        });
      }
    }

    return results;
  }

  async listEmails(
    folder: string,
    page: number,
    pageSize: number
  ): Promise<{ emails: EmailEnvelope[]; total: number }> {
    validateFolder(folder);
    const client = await this.ensureConnected();
    const lock = await client.getMailboxLock(folder);

    try {
      const status = await client.status(folder, { messages: true });
      const total = status.messages ?? 0;

      if (total === 0) {
        return { emails: [], total: 0 };
      }

      const start = Math.max(1, total - page * pageSize + 1);
      const end = total - (page - 1) * pageSize;

      if (start > end || end < 1) {
        return { emails: [], total };
      }

      const emails: EmailEnvelope[] = [];

      for await (const message of client.fetch(`${start}:${end}`, {
        uid: true,
        flags: true,
        envelope: true,
        size: true,
      })) {
        const envelope = message.envelope;
        emails.push({
          uid: message.uid,
          messageId: envelope?.messageId ?? "",
          date: envelope?.date ?? new Date(),
          from: mapAddresses(envelope?.from as ImapAddress[] | undefined),
          to: mapAddresses(envelope?.to as ImapAddress[] | undefined),
          cc: mapAddresses(envelope?.cc as ImapAddress[] | undefined),
          subject: envelope?.subject ?? "",
          flags: flagsToArray(message.flags),
          size: message.size,
        });
      }

      // newest first
      emails.reverse();
      return { emails, total };
    } finally {
      lock.release();
    }
  }

  async readEmail(folder: string, uid: number): Promise<EmailFull> {
    validateFolder(folder);
    const client = await this.ensureConnected();
    const lock = await client.getMailboxLock(folder);

    try {
      const message = await client.fetchOne(
        `${uid}`,
        { source: true, uid: true, flags: true, envelope: true },
        { uid: true }
      );

      if (!message) {
        throw new Error(`Message UID ${uid} not found in ${folder}`);
      }

      if (!message.source) {
        throw new Error(`No source data for message UID ${uid}`);
      }
      const parsed = await simpleParser(message.source as Buffer);
      const envelope = message.envelope;

      const toAddresses = parsed.to
        ? Array.isArray(parsed.to)
          ? parsed.to.flatMap((a) =>
              a.value.map((v) => ({ name: v.name ?? "", address: v.address ?? "" }))
            )
          : parsed.to.value.map((v) => ({ name: v.name ?? "", address: v.address ?? "" }))
        : mapAddresses(envelope?.to as ImapAddress[] | undefined);

      const ccAddresses = parsed.cc
        ? Array.isArray(parsed.cc)
          ? parsed.cc.flatMap((a) =>
              a.value.map((v) => ({ name: v.name ?? "", address: v.address ?? "" }))
            )
          : parsed.cc.value.map((v) => ({ name: v.name ?? "", address: v.address ?? "" }))
        : mapAddresses(envelope?.cc as ImapAddress[] | undefined);

      const bccAddresses = parsed.bcc
        ? Array.isArray(parsed.bcc)
          ? parsed.bcc.flatMap((a) =>
              a.value.map((v) => ({ name: v.name ?? "", address: v.address ?? "" }))
            )
          : parsed.bcc.value.map((v) => ({ name: v.name ?? "", address: v.address ?? "" }))
        : [];

      const replyToAddresses = parsed.replyTo
        ? parsed.replyTo.value.map((v) => ({ name: v.name ?? "", address: v.address ?? "" }))
        : [];

      const fromAddresses = parsed.from
        ? parsed.from.value.map((v) => ({ name: v.name ?? "", address: v.address ?? "" }))
        : mapAddresses(envelope?.from as ImapAddress[] | undefined);

      const references = parsed.references
        ? Array.isArray(parsed.references)
          ? parsed.references
          : [parsed.references]
        : [];

      const attachments = parsed.attachments.map((att) => ({
        filename: att.filename ?? "attachment",
        contentType: att.contentType,
        size: att.size,
      }));

      return {
        uid: message.uid,
        messageId: parsed.messageId ?? envelope?.messageId ?? "",
        date: parsed.date ?? envelope?.date ?? new Date(),
        from: fromAddresses,
        to: toAddresses,
        cc: ccAddresses,
        subject: parsed.subject ?? envelope?.subject ?? "",
        flags: flagsToArray(message.flags),
        size: message.size,
        bcc: bccAddresses,
        replyTo: replyToAddresses,
        inReplyTo: parsed.inReplyTo ?? null,
        references,
        text: parsed.text ?? null,
        html: parsed.html !== false ? (parsed.html ?? null) : null,
        attachments,
      };
    } finally {
      lock.release();
    }
  }

  async searchEmails(
    folder: string,
    criteria: SearchCriteria,
    limit = 100
  ): Promise<EmailEnvelope[]> {
    validateFolder(folder);
    const client = await this.ensureConnected();
    const lock = await client.getMailboxLock(folder);

    try {
      const searchQuery: Record<string, unknown> = {};

      if (criteria.from) searchQuery["from"] = criteria.from;
      if (criteria.to) searchQuery["to"] = criteria.to;
      if (criteria.subject) searchQuery["subject"] = criteria.subject;
      if (criteria.body) searchQuery["body"] = criteria.body;
      if (criteria.since) searchQuery["since"] = parseSearchDate(criteria.since, "since");
      if (criteria.before) searchQuery["before"] = parseSearchDate(criteria.before, "before");
      if (criteria.seen === true) searchQuery["seen"] = true;
      if (criteria.seen === false) searchQuery["unseen"] = true;
      if (criteria.flagged === true) searchQuery["flagged"] = true;
      if (criteria.flagged === false) searchQuery["unflagged"] = true;

      const searchResult = await client.search(searchQuery, { uid: true });
      const uids: number[] = searchResult === false ? [] : searchResult;
      const limited = uids.slice(-limit);

      if (limited.length === 0) return [];

      const emails: EmailEnvelope[] = [];

      for await (const message of client.fetch(
        limited.join(","),
        { uid: true, flags: true, envelope: true, size: true },
        { uid: true }
      )) {
        const envelope = message.envelope;
        emails.push({
          uid: message.uid,
          messageId: envelope?.messageId ?? "",
          date: envelope?.date ?? new Date(),
          from: mapAddresses(envelope?.from as ImapAddress[] | undefined),
          to: mapAddresses(envelope?.to as ImapAddress[] | undefined),
          cc: mapAddresses(envelope?.cc as ImapAddress[] | undefined),
          subject: envelope?.subject ?? "",
          flags: flagsToArray(message.flags),
          size: message.size,
        });
      }

      emails.reverse();
      return emails;
    } finally {
      lock.release();
    }
  }

  async setFlags(
    folder: string,
    uid: number,
    flags: string[],
    add: boolean
  ): Promise<void> {
    validateFolder(folder);
    const client = await this.ensureConnected();
    const lock = await client.getMailboxLock(folder);

    try {
      if (add) {
        await client.messageFlagsAdd(`${uid}`, flags, { uid: true });
      } else {
        await client.messageFlagsRemove(`${uid}`, flags, { uid: true });
      }
    } finally {
      lock.release();
    }
  }

  async resolveTrashFolder(): Promise<string> {
    const mailboxes = await this.listMailboxes();
    const trash = mailboxes.find((m) => m.specialUse === "\\Trash");
    return trash?.path ?? "Trash";
  }

  async moveMessage(
    folder: string,
    uid: number,
    destination: string
  ): Promise<void> {
    validateFolder(folder);
    validateFolder(destination);
    const client = await this.ensureConnected();
    const lock = await client.getMailboxLock(folder);

    try {
      await client.messageMove(`${uid}`, destination, { uid: true });
    } finally {
      lock.release();
    }
  }
}
