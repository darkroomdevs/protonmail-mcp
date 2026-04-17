declare module "mailparser" {
  export interface AddressObject {
    value: Array<{ address?: string; name?: string }>;
    text: string;
  }

  export interface Attachment {
    filename?: string;
    contentType: string;
    size: number;
    content: Buffer;
  }

  export interface ParsedMail {
    messageId?: string;
    date?: Date;
    from?: AddressObject;
    to?: AddressObject | AddressObject[];
    cc?: AddressObject | AddressObject[];
    bcc?: AddressObject | AddressObject[];
    replyTo?: AddressObject;
    inReplyTo?: string;
    references?: string | string[];
    subject?: string;
    text?: string;
    html?: string | false;
    attachments: Attachment[];
    flags?: Set<string>;
  }

  export function simpleParser(
    source: Buffer | string | NodeJS.ReadableStream,
    options?: Record<string, unknown>
  ): Promise<ParsedMail>;
}
