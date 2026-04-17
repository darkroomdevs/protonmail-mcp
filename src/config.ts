export interface ServerConfig {
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
  };
  imap: {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
  };
  debug: boolean;
}

function parsePort(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined) return fallback;
  const port = parseInt(value, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`${name} must be a number between 1 and 65535, got "${value}"`);
  }
  return port;
}

export function loadConfig(): ServerConfig {
  const username = process.env.PROTONMAIL_USERNAME;
  const password = process.env.PROTONMAIL_PASSWORD;

  if (!username) {
    throw new Error("PROTONMAIL_USERNAME environment variable is required");
  }
  if (!password) {
    throw new Error("PROTONMAIL_PASSWORD environment variable is required");
  }

  const smtpHost = process.env.SMTP_HOST ?? "127.0.0.1";
  const smtpPort = parsePort(process.env.SMTP_PORT, 1025, "SMTP_PORT");
  const imapHost = process.env.IMAP_HOST ?? "127.0.0.1";
  const imapPort = parsePort(process.env.IMAP_PORT, 1143, "IMAP_PORT");
  const debug = process.env.DEBUG === "true";

  const config: ServerConfig = {
    smtp: {
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      username,
      password,
    },
    imap: {
      host: imapHost,
      port: imapPort,
      secure: false,
      username,
      password,
    },
    debug,
  };

  return Object.freeze(config);
}
