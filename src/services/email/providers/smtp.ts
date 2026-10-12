import nodemailer from "nodemailer";
import { credentialStatus, smtpConfig } from "../credentials";
import { failed } from "../errors";
import type { MailPayload, SendResult } from "../types";

function formatFrom(payload: MailPayload) {
  const email = payload.from || "";
  const name = payload.fromName?.trim();
  if (!email) return "";
  return name ? `${name} <${email}>` : email;
}

export async function sendViaSmtp(payload: MailPayload): Promise<SendResult> {
  const status = credentialStatus("smtp");
  if (!status.configured) {
    return failed("smtp", "missing_credentials", status.missing.join(", "));
  }
  const config = smtpConfig();
  if (!Number.isFinite(config.port) || config.port <= 0) {
    return failed("smtp", "invalid_config", "SMTP_PORT is ongeldig.");
  }
  const from = formatFrom(payload);
  if (!from) {
    return failed("smtp", "invalid_config", "Afzender e-mail ontbreekt.");
  }
  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
    });
    await transporter.sendMail({
      from,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
      replyTo: payload.replyTo || undefined,
    });
    return { ok: true, provider: "smtp" };
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("auth") || message.includes("invalid login") || message.includes("credentials")) {
      return failed("smtp", "auth_failed", "Authenticatie mislukt. Controleer SMTP-gebruiker en wachtwoord.");
    }
    if (message.includes("enotfound") || message.includes("econnrefused") || message.includes("etimedout")) {
      return failed("smtp", "unreachable", "SMTP-server is niet bereikbaar.");
    }
    return failed("smtp", "unknown", "Mail kon niet worden verstuurd via SMTP.");
  }
}
