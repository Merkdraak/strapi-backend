import type { CredentialStatus, EmailProvider } from "./types";

function env(name: string) {
  return String(process.env[name] ?? "").trim();
}

function present(name: string) {
  return Boolean(env(name));
}

const providerMeta: Record<
  EmailProvider,
  { label: string; required: string[]; optionalHint?: string[] }
> = {
  smtp: {
    label: "SMTP / Nodemailer",
    required: ["SMTP_HOST", "SMTP_PORT", "SMTP_USERNAME", "SMTP_PASSWORD"],
  },
  resend: {
    label: "Resend",
    required: ["RESEND_API_KEY"],
  },
  sendgrid: {
    label: "SendGrid",
    required: ["SENDGRID_API_KEY"],
  },
  mailgun: {
    label: "Mailgun",
    required: ["MAILGUN_API_KEY", "MAILGUN_DOMAIN"],
  },
  postmark: {
    label: "Postmark",
    required: ["POSTMARK_API_KEY"],
  },
  ses: {
    label: "Amazon SES",
    required: ["AWS_SES_REGION", "AWS_SES_ACCESS_KEY_ID", "AWS_SES_SECRET_ACCESS_KEY"],
  },
};

export function credentialStatus(provider: EmailProvider): CredentialStatus {
  const meta = providerMeta[provider];
  const missing = meta.required.filter((name) => !present(name));
  return {
    provider,
    configured: missing.length === 0,
    missing,
    label: meta.label,
  };
}

export function allCredentialStatuses(): CredentialStatus[] {
  return (Object.keys(providerMeta) as EmailProvider[]).map((provider) => credentialStatus(provider));
}

export function smtpConfig() {
  return {
    host: env("SMTP_HOST"),
    port: Number(env("SMTP_PORT") || "587"),
    secure: env("SMTP_SECURE") === "true" || env("SMTP_PORT") === "465",
    user: env("SMTP_USERNAME"),
    pass: env("SMTP_PASSWORD"),
  };
}

export function resendApiKey() {
  return env("RESEND_API_KEY");
}

export function sendgridApiKey() {
  return env("SENDGRID_API_KEY");
}

export function mailgunConfig() {
  return {
    apiKey: env("MAILGUN_API_KEY"),
    domain: env("MAILGUN_DOMAIN"),
    baseUrl: env("MAILGUN_BASE_URL") || "https://api.mailgun.net",
  };
}

export function postmarkApiKey() {
  return env("POSTMARK_API_KEY");
}

export function sesConfig() {
  return {
    region: env("AWS_SES_REGION") || "eu-west-1",
    accessKeyId: env("AWS_SES_ACCESS_KEY_ID"),
    secretAccessKey: env("AWS_SES_SECRET_ACCESS_KEY"),
  };
}
