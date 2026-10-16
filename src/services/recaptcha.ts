import type { Core } from "@strapi/strapi";

export type RecaptchaSettings = {
  enabled: boolean;
  cloudProjectId: string;
  siteKey: string;
  secretKey: string;
  minScore: number;
};

const DEFAULT_SITE_KEY = "merkdraak";

function clip(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

function asScore(value: unknown, fallback = 0.5) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

function settingsFromSite(site: {
  recaptchaEnabled?: boolean | null;
  recaptchaCloudProjectId?: string | null;
  recaptchaSiteKey?: string | null;
  recaptchaSecretKey?: string | null;
  recaptchaMinScore?: number | string | null;
} | null): RecaptchaSettings {
  return {
    enabled: site?.recaptchaEnabled !== false,
    cloudProjectId: clip(site?.recaptchaCloudProjectId, 120),
    siteKey: clip(site?.recaptchaSiteKey, 200),
    secretKey: clip(site?.recaptchaSecretKey, 200),
    minScore: asScore(site?.recaptchaMinScore, 0.5),
  };
}

export async function loadRecaptchaSettings(strapi: Core.Strapi, siteKey = DEFAULT_SITE_KEY): Promise<RecaptchaSettings> {
  const site = await strapi.documents("api::site.site").findFirst({
    filters: { key: siteKey },
    status: "published",
  });
  return settingsFromSite(site);
}

/** Fill Site reCAPTCHA fields from env when still empty (keys stay out of git via .env). */
export async function ensureRecaptchaSettings(strapi: Core.Strapi, siteKey = DEFAULT_SITE_KEY) {
  const site = await strapi.documents("api::site.site").findFirst({
    filters: { key: siteKey },
    status: "published",
  });
  if (!site?.documentId) return settingsFromSite(null);

  const current = settingsFromSite(site);
  const fromEnvSite = clip(process.env.RECAPTCHA_SITE_KEY, 200);
  const fromEnvSecret = clip(process.env.RECAPTCHA_SECRET_KEY, 200);
  if (!fromEnvSite && !fromEnvSecret) return current;
  if (current.siteKey && current.secretKey) return current;

  const next: RecaptchaSettings = {
    enabled: true,
    cloudProjectId: current.cloudProjectId,
    siteKey: current.siteKey || fromEnvSite,
    secretKey: current.secretKey || fromEnvSecret,
    minScore: current.minScore || 0.5,
  };
  await strapi.documents("api::site.site").update({
    documentId: site.documentId,
    data: {
      recaptchaEnabled: next.enabled,
      recaptchaCloudProjectId: next.cloudProjectId,
      recaptchaSiteKey: next.siteKey,
      recaptchaSecretKey: next.secretKey,
      recaptchaMinScore: next.minScore,
    },
    status: "published",
  });
  strapi.log.info("reCAPTCHA keys overgenomen uit environment naar Site-instellingen.");
  return next;
}

export async function saveRecaptchaSettings(
  strapi: Core.Strapi,
  body: Record<string, unknown>,
  siteKey = DEFAULT_SITE_KEY,
): Promise<RecaptchaSettings> {
  const site = await strapi.documents("api::site.site").findFirst({
    filters: { key: siteKey },
    status: "published",
  });
  if (!site?.documentId) {
    throw new Error("Website niet gevonden.");
  }
  const next: RecaptchaSettings = {
    enabled: body.enabled === false || body.enabled === "false" ? false : true,
    cloudProjectId: clip(body.cloudProjectId, 120),
    siteKey: clip(body.siteKey, 200),
    secretKey: clip(body.secretKey, 200),
    minScore: asScore(body.minScore, 0.5),
  };
  await strapi.documents("api::site.site").update({
    documentId: site.documentId,
    data: {
      recaptchaEnabled: next.enabled,
      recaptchaCloudProjectId: next.cloudProjectId,
      recaptchaSiteKey: next.siteKey,
      recaptchaSecretKey: next.secretKey,
      recaptchaMinScore: next.minScore,
    },
    status: "published",
  });
  return next;
}

type VerifyResult =
  | { ok: true; skipped?: boolean; score?: number }
  | { ok: false; error: string };

export async function verifyRecaptchaToken(
  strapi: Core.Strapi,
  site: {
    key?: string | null;
    recaptchaEnabled?: boolean | null;
    recaptchaSiteKey?: string | null;
    recaptchaSecretKey?: string | null;
    recaptchaMinScore?: number | string | null;
  },
  token: unknown,
  action: string,
): Promise<VerifyResult> {
  const enabled = site.recaptchaEnabled !== false;
  const siteKey = clip(site.recaptchaSiteKey, 200);
  const secret = clip(site.recaptchaSecretKey, 200);
  const minScore = asScore(site.recaptchaMinScore, 0.5);
  if (!enabled || !siteKey || !secret) {
    return { ok: true, skipped: true };
  }
  const responseToken = clip(token, 4000);
  if (!responseToken) {
    return { ok: false, error: "Beveiligingscontrole mislukt. Vernieuw de pagina en probeer opnieuw." };
  }
  try {
    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret,
        response: responseToken,
      }),
      signal: AbortSignal.timeout(8000),
    });
    const data = (await response.json()) as {
      success?: boolean;
      score?: number;
      action?: string;
      "error-codes"?: string[];
    };
    if (!data.success) {
      strapi.log.warn(`reCAPTCHA rejected: ${(data["error-codes"] ?? []).join(", ") || "unknown"}`);
      return { ok: false, error: "Beveiligingscontrole mislukt. Vernieuw de pagina en probeer opnieuw." };
    }
    if (action && data.action && data.action !== action) {
      strapi.log.warn(`reCAPTCHA action mismatch: expected ${action}, got ${data.action}`);
      return { ok: false, error: "Beveiligingscontrole mislukt. Vernieuw de pagina en probeer opnieuw." };
    }
    const score = typeof data.score === "number" ? data.score : 0;
    if (score < minScore) {
      strapi.log.warn(`reCAPTCHA score too low: ${score} < ${minScore}`);
      return { ok: false, error: "Je inzending kon niet worden geverifieerd. Probeer het later opnieuw of bel ons." };
    }
    return { ok: true, score };
  } catch (error) {
    strapi.log.warn("reCAPTCHA verify failed");
    strapi.log.warn(error);
    return { ok: false, error: "Beveiligingscontrole tijdelijk niet beschikbaar. Probeer het zo opnieuw." };
  }
}
