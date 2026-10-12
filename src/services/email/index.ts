import type { Core } from "@strapi/strapi";
import { allCredentialStatuses, credentialStatus } from "./credentials";
import { safeUserMessage } from "./errors";
import { sendViaMailgun } from "./providers/mailgun";
import { sendViaPostmark } from "./providers/postmark";
import { sendViaResend } from "./providers/resend";
import { sendViaSendgrid } from "./providers/sendgrid";
import { sendViaSes } from "./providers/ses";
import { sendViaSmtp } from "./providers/smtp";
import { loadEmailSettings, saveEmailSettings } from "./settings";
import { emailHtml, renderTeamMail, renderVisitorMail, type TemplateContext } from "./templates";
import type { EmailProvider, MailPayload, SendResult } from "./types";

async function dispatch(provider: EmailProvider, payload: MailPayload): Promise<SendResult> {
  switch (provider) {
    case "smtp":
      return sendViaSmtp(payload);
    case "resend":
      return sendViaResend(payload);
    case "sendgrid":
      return sendViaSendgrid(payload);
    case "mailgun":
      return sendViaMailgun(payload);
    case "postmark":
      return sendViaPostmark(payload);
    case "ses":
      return sendViaSes(payload);
    default:
      return {
        ok: false,
        provider: "smtp",
        code: "invalid_config",
        message: "Onbekende mailprovider.",
      };
  }
}

export async function emailServiceSend(strapi: Core.Strapi, payload: Omit<MailPayload, "from" | "fromName" | "replyTo"> & {
  from?: string;
  fromName?: string;
  replyTo?: string;
  provider?: EmailProvider;
}): Promise<SendResult> {
  const settings = await loadEmailSettings(strapi);
  const provider = payload.provider ?? settings.provider;
  const status = credentialStatus(provider);
  if (!status.configured) {
    return {
      ok: false,
      provider,
      code: "missing_credentials",
      message: status.missing.join(", "),
    };
  }
  if (!payload.to) {
    return {
      ok: false,
      provider,
      code: "invalid_config",
      message: "Ontvanger ontbreekt.",
    };
  }
  return dispatch(provider, {
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
    from: payload.from ?? settings.fromEmail,
    fromName: payload.fromName ?? settings.fromName,
    replyTo: payload.replyTo ?? settings.replyTo,
  });
}

export async function sendFormEmails(
  strapi: Core.Strapi,
  input: {
    staffTo: string;
    visitorTo: string;
    visitorReplyTo?: string;
    ctx: TemplateContext;
  },
) {
  const settings = await loadEmailSettings(strapi);
  const team = settings.sendTeamNotification
    ? await (async () => {
        if (!input.staffTo) {
          return { ok: false as const, skipped: true as const, result: null };
        }
        const mail = renderTeamMail(settings, input.ctx);
        const result = await emailServiceSend(strapi, {
          to: input.staffTo,
          subject: mail.subject,
          text: mail.text,
          html: mail.html,
          replyTo: input.visitorReplyTo || input.visitorTo,
        });
        return { ok: result.ok, skipped: false as const, result };
      })()
    : { ok: true as const, skipped: true as const, result: null };

  const visitor = settings.sendVisitorConfirmation
    ? await (async () => {
        if (!input.visitorTo) {
          return { ok: false as const, skipped: true as const, result: null };
        }
        const mail = renderVisitorMail(settings, input.ctx);
        const result = await emailServiceSend(strapi, {
          to: input.visitorTo,
          subject: mail.subject,
          text: mail.text,
          html: mail.html,
          replyTo: settings.replyTo || settings.fromEmail,
        });
        return { ok: result.ok, skipped: false as const, result };
      })()
    : { ok: true as const, skipped: true as const, result: null };

  const errors: string[] = [];
  if (!team.skipped && team.result && !team.result.ok) {
    errors.push(`Team: ${safeUserMessage(team.result)}`);
    strapi.log.warn(`form team email failed: ${team.result.message}`);
  }
  if (!visitor.skipped && visitor.result && !visitor.result.ok) {
    errors.push(`Bevestiging: ${safeUserMessage(visitor.result)}`);
    strapi.log.warn(`form visitor email failed: ${visitor.result.message}`);
  }

  return {
    teamMailStatus: team.skipped ? ("skipped" as const) : team.ok ? ("sent" as const) : ("failed" as const),
    visitorMailStatus: visitor.skipped ? ("skipped" as const) : visitor.ok ? ("sent" as const) : ("failed" as const),
    mailError: errors.join(" | ").slice(0, 1000),
    provider: settings.provider,
  };
}

export async function sendTestMail(strapi: Core.Strapi, to: string) {
  const settings = await loadEmailSettings(strapi);
  const result = await emailServiceSend(strapi, {
    to,
    subject: `Testmail via ${settings.provider}`,
    text: `Dit is een testmail van Merkdraak Strapi, verstuurd via ${settings.provider}.`,
    html: emailHtml(`Dit is een testmail van Merkdraak Strapi, verstuurd via ${settings.provider}.`, "Merkdraak"),
  });
  if (result.ok) {
    return {
      ok: true as const,
      message: `Testmail succesvol verstuurd via ${credentialStatus(result.provider).label}.`,
      provider: result.provider,
    };
  }
  return {
    ok: false as const,
    message: "Mail kon niet worden verstuurd.",
    detail: safeUserMessage(result),
    provider: result.provider,
    code: result.code,
  };
}

export {
  allCredentialStatuses,
  credentialStatus,
  loadEmailSettings,
  saveEmailSettings,
  safeUserMessage,
};
