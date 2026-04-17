export interface EmailAddress {
  name: string;
  address: string;
}

export interface EmailEnvelope {
  uid: number;
  messageId: string;
  date: Date;
  from: EmailAddress[];
  to: EmailAddress[];
  cc: EmailAddress[];
  subject: string;
  flags: string[];
  size?: number;
}

export interface AttachmentMeta {
  filename: string;
  contentType: string;
  size: number;
}

export interface EmailFull extends EmailEnvelope {
  bcc: EmailAddress[];
  replyTo: EmailAddress[];
  inReplyTo: string | null;
  references: string[];
  text: string | null;
  html: string | null;
  attachments: AttachmentMeta[];
}

export interface MailboxInfo {
  path: string;
  name: string;
  specialUse: string | null;
  messages: number;
  unseen: number;
}

export interface SendEmailParams {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
  priority?: "high" | "normal" | "low";
  inReplyTo?: string;
  references?: string[];
  attachments?: Array<{
    filename: string;
    content: string;
    contentType?: string;
  }>;
}

export interface SendResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
}

export interface SearchCriteria {
  from?: string;
  to?: string;
  subject?: string;
  body?: string;
  since?: string;
  before?: string;
  seen?: boolean;
  flagged?: boolean;
}
