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
  private mailboxCache: { data: MailboxInfo[]; expiry: number } | null = null;
  private trashFolderPath: string | null = null;

  private static MAILBOX_CACHE_TTL = 30_000;

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

    client.on("close", () => { this.client = null; });
    client.on("error", () => { this.client = null; });

    await client.connect();
    this.client = client;
    return client;
  }

  private mapEnvelope(message: { uid: number; envelope?: any; flags?: Set<string>; size?: number }): EmailEnvelope {
    const envelope = message.envelope;
    return {
      uid: message.uid,
      messageId: envelope?.messageId ?? "",
      date: envelope?.date ?? new Date(),
      from: mapAddresses(envelope?.from as ImapAddress[] | undefined),
      to: mapAddresses(envelope?.to as ImapAddress[] | undefined),
      cc: mapAddresses(envelope?.cc as ImapAddress[] | undefined),
      subject: envelope?.subject ?? "",
      flags: flagsToArray(message.flags),
      size: message.size,
    };
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
    if (this.mailboxCache && Date.now() < this.mailboxCache.expiry) {
      return this.mailboxCache.data;
    }

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

    this.mailboxCache = { data: results, expiry: Date.now() + ImapClient.MAILBOX_CACHE_TTL };
    return results;
  }

  async listEmails(
    folder: string,
    pageSize: number,
    options?: { page?: number; beforeUid?: number }
  ): Promise<{ emails: EmailEnvelope[]; total: number; nextCursor: number | null }> {
    validateFolder(folder);
    const client = await this.ensureConnected();
    const lock = await client.getMailboxLock(folder);

    try {
      const status = await client.status(folder, { messages: true });
      const total = status.messages ?? 0;

      if (total === 0) {
        return { emails: [], total: 0, nextCursor: null };
      }

      if (options?.beforeUid !== undefined) {
        return this.listEmailsByCursor(client, folder, pageSize, total, options.beforeUid);
      }

      const page = options?.page ?? 1;
      return this.listEmailsByPage(client, folder, pageSize, total, page);
    } finally {
      lock.release();
    }
  }

  private async listEmailsByPage(
    client: ImapFlow,
    folder: string,
    pageSize: number,
    total: number,
    page: number
  ): Promise<{ emails: EmailEnvelope[]; total: number; nextCursor: number | null }> {
    const searchResult = await client.search({}, { uid: true });
    const allUids: number[] = searchResult === false ? [] : searchResult;

    if (allUids.length === 0) {
      return { emails: [], total, nextCursor: null };
    }

    const offset = (page - 1) * pageSize;
    const selected = allUids.slice(-(offset + pageSize), allUids.length - offset || undefined);

    if (selected.length === 0) {
      return { emails: [], total, nextCursor: null };
    }

    const emails: EmailEnvelope[] = [];
    for await (const message of client.fetch(selected.join(","), {
      uid: true, flags: true, envelope: true, size: true,
    }, { uid: true })) {
      emails.push(this.mapEnvelope(message));
    }

    emails.reverse();
    const nextCursor = emails.length > 0 ? Math.min(...emails.map((e) => e.uid)) : null;
    return { emails, total, nextCursor };
  }

  private async listEmailsByCursor(
    client: ImapFlow,
    folder: string,
    pageSize: number,
    total: number,
    beforeUid: number
  ): Promise<{ emails: EmailEnvelope[]; total: number; nextCursor: number | null }> {
    const searchResult = await client.search({ uid: `1:${beforeUid - 1}` }, { uid: true });
    const uids: number[] = searchResult === false ? [] : searchResult;

    if (uids.length === 0) {
      return { emails: [], total, nextCursor: null };
    }

    const selected = uids.slice(-pageSize);
    const emails: EmailEnvelope[] = [];
    for await (const message of client.fetch(selected.join(","), {
      uid: true, flags: true, envelope: true, size: true,
    }, { uid: true })) {
      emails.push(this.mapEnvelope(message));
    }

    emails.reverse();
    const nextCursor = emails.length > 0 ? Math.min(...emails.map((e) => e.uid)) : null;
    return { emails, total, nextCursor };
  }

  async readEmail(folder: string, uid: number, headersOnly = false): Promise<EmailFull> {
    validateFolder(folder);
    const client = await this.ensureConnected();
    const lock = await client.getMailboxLock(folder);

    try {
      if (headersOnly) {
        const message = await client.fetchOne(
          `${uid}`,
          { uid: true, flags: true, envelope: true, size: true },
          { uid: true }
        );
        if (!message) throw new Error(`Message UID ${uid} not found in ${folder}`);
        const base = this.mapEnvelope(message);
        return {
          ...base,
          bcc: [],
          replyTo: [],
          inReplyTo: null,
          references: [],
          text: null,
          html: null,
          attachments: [],
        };
      }

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

  private buildSearchQuery(criteria: SearchCriteria): Record<string, unknown> {
    const query: Record<string, unknown> = {};
    if (criteria.from) query["from"] = criteria.from;
    if (criteria.to) query["to"] = criteria.to;
    if (criteria.subject) query["subject"] = criteria.subject;
    if (criteria.body) query["body"] = criteria.body;
    if (criteria.since) query["since"] = parseSearchDate(criteria.since, "since");
    if (criteria.before) query["before"] = parseSearchDate(criteria.before, "before");
    if (criteria.seen === true) query["seen"] = true;
    if (criteria.seen === false) query["unseen"] = true;
    if (criteria.flagged === true) query["flagged"] = true;
    if (criteria.flagged === false) query["unflagged"] = true;
    return query;
  }

  async searchEmails(
    folder: string,
    criteria: SearchCriteria,
    pageSize = 50,
    beforeUid?: number
  ): Promise<{ emails: EmailEnvelope[]; totalMatches: number; nextCursor: number | null }> {
    validateFolder(folder);
    const client = await this.ensureConnected();
    const lock = await client.getMailboxLock(folder);

    try {
      const searchQuery = this.buildSearchQuery(criteria);
      const searchResult = await client.search(searchQuery, { uid: true });
      const allUids: number[] = searchResult === false ? [] : searchResult;
      const totalMatches = allUids.length;

      const filtered = beforeUid !== undefined
        ? allUids.filter((uid) => uid < beforeUid)
        : allUids;
      const selected = filtered.slice(-pageSize);

      if (selected.length === 0) {
        return { emails: [], totalMatches, nextCursor: null };
      }

      const emails: EmailEnvelope[] = [];
      for await (const message of client.fetch(
        selected.join(","),
        { uid: true, flags: true, envelope: true, size: true },
        { uid: true }
      )) {
        emails.push(this.mapEnvelope(message));
      }

      emails.reverse();
      const nextCursor = emails.length > 0 ? Math.min(...emails.map((e) => e.uid)) : null;
      return { emails, totalMatches, nextCursor };
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
    if (this.trashFolderPath) return this.trashFolderPath;
    const mailboxes = await this.listMailboxes();
    const trash = mailboxes.find((m) => m.specialUse === "\\Trash");
    this.trashFolderPath = trash?.path ?? "Trash";
    return this.trashFolderPath;
  }

  async createMailbox(path: string): Promise<void> {
    validateFolder(path);
    const client = await this.ensureConnected();
    await client.mailboxCreate(path);
  }

  async deleteMailbox(path: string): Promise<void> {
    validateFolder(path);
    const client = await this.ensureConnected();
    await client.mailboxDelete(path);
  }

  async renameMailbox(oldPath: string, newPath: string): Promise<void> {
    validateFolder(oldPath);
    validateFolder(newPath);
    const client = await this.ensureConnected();
    await client.mailboxRename(oldPath, newPath);
  }

  async searchByQuery(folder: string, criteria: SearchCriteria): Promise<number[]> {
    validateFolder(folder);
    const client = await this.ensureConnected();
    const lock = await client.getMailboxLock(folder);
    try {
      const query = this.buildSearchQuery(criteria);
      const result = await client.search(query, { uid: true });
      return result === false ? [] : result;
    } finally {
      lock.release();
    }
  }

  async bulkAction(
    folder: string,
    action: "delete" | "move" | "markRead" | "markUnread" | "flag" | "unflag",
    uids: number[],
    options?: { destination?: string; dryRun?: boolean }
  ): Promise<{ affected: number; uids: number[] }> {
    validateFolder(folder);
    const dryRun = options?.dryRun ?? true;

    if (dryRun) {
      return { affected: uids.length, uids };
    }

    if (uids.length === 0) {
      return { affected: 0, uids: [] };
    }

    const client = await this.ensureConnected();
    const lock = await client.getMailboxLock(folder);
    const uidSet = uids.join(",");

    try {
      switch (action) {
        case "delete": {
          const trashFolder = await this.resolveTrashFolder();
          await client.messageMove(uidSet, trashFolder, { uid: true });
          break;
        }
        case "move":
          if (!options?.destination) throw new Error("destination required for move action");
          validateFolder(options.destination);
          await client.messageMove(uidSet, options.destination, { uid: true });
          break;
        case "markRead":
          await client.messageFlagsAdd(uidSet, ["\\Seen"], { uid: true });
          break;
        case "markUnread":
          await client.messageFlagsRemove(uidSet, ["\\Seen"], { uid: true });
          break;
        case "flag":
          await client.messageFlagsAdd(uidSet, ["\\Flagged"], { uid: true });
          break;
        case "unflag":
          await client.messageFlagsRemove(uidSet, ["\\Flagged"], { uid: true });
          break;
      }
    } finally {
      lock.release();
    }

    return { affected: uids.length, uids };
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
