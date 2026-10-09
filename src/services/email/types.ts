export const EMAIL_PROVIDERS = ["smtp", "resend", "sendgrid", "mailgun", "postmark", "ses"] as const;

export type EmailProvider = (typeof EMAIL_PROVIDERS)[number];

export type MailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  from?: string;
  fromName?: string;
  replyTo?: string;
};

export type SendResult = {
  ok: true;
  provider: EmailProvider;
} | {
  ok: false;
  provider: EmailProvider;
  code: "missing_credentials" | "auth_failed" | "sender_unverified" | "unreachable" | "invalid_config" | "unknown";
  message: string;
};

export type EmailSettings = {
  provider: EmailProvider;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  defaultRecipient: string;
  sendVisitorConfirmation: boolean;
  sendTeamNotification: boolean;
  teamSubject: string;
  teamIntro: string;
  teamOutro: string;
  visitorSubject: string;
  visitorIntro: string;
  visitorOutro: string;
};

export type CredentialStatus = {
  provider: EmailProvider;
  configured: boolean;
  missing: string[];
  label: string;
};
