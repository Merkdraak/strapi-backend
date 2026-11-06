import type { Core } from "@strapi/strapi";

function publicFrontendUrl() {
  const raw = String(process.env.FRONTEND_URL ?? process.env.EDITOR_PUBLIC_URL ?? "")
    .trim()
    .replace(/\/$/, "");
  let origin = "";
  try {
    if (raw) {
      const url = new URL(raw);
      if (url.protocol === "http:" || url.protocol === "https:") origin = url.origin;
    }
  } catch {
    origin = "";
  }
  if (origin && /(?:^|\.)test\.merkdraak\.nl$/i.test(new URL(origin).hostname)) {
    return "https://merkdraak.nl";
  }
  const isLocal = !origin || /localhost|127\.0\.0\.1/i.test(origin);
  // On koekje/cms, never point the pagebuilder iframe at the editor's laptop.
  if (isLocal && process.env.NODE_ENV === "production") {
    return "https://merkdraak.nl";
  }
  return origin || "http://localhost:3000";
}

function velucciFrontendUrl() {
  const fromEnv = String(process.env.VELUCCI_EDITOR_URL ?? "")
    .trim()
    .replace(/\/$/, "");
  if (fromEnv) {
    try {
      return new URL(fromEnv).origin;
    } catch {
      return fromEnv;
    }
  }
  if (process.env.NODE_ENV === "production") return "https://velucci.nl";
  return "http://localhost:3010";
}

function shouldReplaceEditorUrl(key: string, current: string, next: string) {
  if (!next || current === next) return false;
  if (!current) return true;
  if (key !== "velucci") return true;
  return /localhost|127\.0\.0\.1|merkdraak\.nl/i.test(current) || Boolean(process.env.VELUCCI_EDITOR_URL);
}

async function syncSiteEditorUrl(strapi: Core.Strapi, key: string, next: string) {
  if (!next) return;

  const site = await strapi.documents("api::site.site").findFirst({
    filters: { key },
    status: "published",
    fields: ["editorUrl"],
  });
  if (!site?.documentId) return;

  const current = String(site.editorUrl ?? "").trim().replace(/\/$/, "");
  if (!shouldReplaceEditorUrl(key, current, next)) return;

  await strapi.documents("api::site.site").update({
    documentId: site.documentId,
    data: { editorUrl: next },
    status: "published",
  });
  strapi.log.info(`syncEditorUrl(${key}): editorUrl ${current || "(empty)"} → ${next}`);
}

/**
 * Pagebuilder iframes Site.editorUrl. Merkdraak → FRONTEND_URL; Velucci → VELUCCI_EDITOR_URL / velucci.nl.
 */
export async function syncEditorUrl(strapi: Core.Strapi) {
  await syncSiteEditorUrl(strapi, "merkdraak", publicFrontendUrl());
  await syncSiteEditorUrl(strapi, "velucci", velucciFrontendUrl());
}
