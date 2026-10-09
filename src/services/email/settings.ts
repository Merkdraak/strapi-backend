import type { Core } from "@strapi/strapi";
import { EMAIL_PROVIDERS, type EmailProvider, type EmailSettings } from "./types";

const defaults: EmailSettings = {
  provider: "smtp",
  fromName: "Merkdraak",
  fromEmail: "noreply@merkdraak.nl",
  replyTo: "info@merkdraak.nl",
  defaultRecipient: "info@merkdraak.nl",
  sendVisitorConfirmation: true,
  sendTeamNotification: true,
  teamSubject: "Nieuwe aanvraag: {{type}} – {{name}}",
  teamIntro: "Er is een nieuwe formulierinzending binnengekomen.",
  teamOutro: "Open Strapi om de inzending af te handelen.",
  visitorSubject: "We hebben je bericht ontvangen — {{site}}",
  visitorIntro: "Bedankt voor je bericht. We hebben het ontvangen en nemen contact met je op.",
  visitorOutro: "Met vriendelijke groet,\n{{site}}",
};

function asProvider(value: unknown): EmailProvider {
  const key = String(value ?? "").trim().toLowerCase();
  return (EMAIL_PROVIDERS as readonly string[]).includes(key) ? (key as EmailProvider) : defaults.provider;
}

function text(value: unknown, fallback: string) {
  const next = String(value ?? "").trim();
  return next || fallback;
}

function email(value: unknown, fallback = "") {
  const next = String(value ?? "").trim();
  if (!next) return fallback;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next) ? next : fallback;
}

export function normalizeSettings(row: Record<string, unknown> | null | undefined): EmailSettings {
  if (!row) return { ...defaults };
  return {
    provider: asProvider(row.provider),
    fromName: text(row.fromName, defaults.fromName),
    fromEmail: email(row.fromEmail, defaults.fromEmail),
    replyTo: email(row.replyTo, defaults.replyTo),
    defaultRecipient: email(row.defaultRecipient, ""),
    sendVisitorConfirmation: row.sendVisitorConfirmation !== false,
    sendTeamNotification: row.sendTeamNotification !== false,
    teamSubject: text(row.teamSubject, defaults.teamSubject),
    teamIntro: text(row.teamIntro, defaults.teamIntro),
    teamOutro: text(row.teamOutro, defaults.teamOutro),
    visitorSubject: text(row.visitorSubject, defaults.visitorSubject),
    visitorIntro: text(row.visitorIntro, defaults.visitorIntro),
    visitorOutro: text(row.visitorOutro, defaults.visitorOutro),
  };
}

export async function loadEmailSettings(strapi: Core.Strapi): Promise<EmailSettings> {
  try {
    const row = await strapi.documents("api::email-setting.email-setting").findFirst({});
    return normalizeSettings(row as unknown as Record<string, unknown> | null);
  } catch {
    return { ...defaults };
  }
}

export async function saveEmailSettings(strapi: Core.Strapi, input: Record<string, unknown>) {
  const current = await loadEmailSettings(strapi);
  const next = normalizeSettings({ ...current, ...input });
  const existing = await strapi.documents("api::email-setting.email-setting").findFirst({});
  if (existing?.documentId) {
    await strapi.documents("api::email-setting.email-setting").update({
      documentId: existing.documentId,
      data: next,
    });
  } else {
    await strapi.documents("api::email-setting.email-setting").create({
      data: next,
    });
  }
  return next;
}

export async function ensureEmailSettings(strapi: Core.Strapi) {
  const existing = await strapi.documents("api::email-setting.email-setting").findFirst({});
  if (existing?.documentId) return normalizeSettings(existing as unknown as Record<string, unknown>);
  // Strapi email fields reject empty strings — omit blank optional emails on create.
  const data = Object.fromEntries(
    Object.entries(defaults).filter(([, value]) => value !== ""),
  ) as EmailSettings;
  await strapi.documents("api::email-setting.email-setting").create({
    data,
  });
  return { ...defaults };
}

export { defaults as emailSettingDefaults };
