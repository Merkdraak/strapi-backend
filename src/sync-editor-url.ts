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
  const isLocal = !origin || /localhost|127\.0\.0\.1/i.test(origin);
  // On koekje/cms, never point the pagebuilder iframe at the editor's laptop.
  if (isLocal && process.env.NODE_ENV === "production") {
    return "https://test.merkdraak.nl";
  }
  return origin || "http://localhost:3000";
}

/**
 * Pagebuilder in cms.merkdraak.nl is an iframe of FRONTEND_URL (test.merkdraak.nl).
 * Keep Site.editorUrl in sync so editor UI deploys show up inside the CMS after main → koekje.
 */
export async function syncEditorUrl(strapi: Core.Strapi) {
  const next = publicFrontendUrl();
  if (!next) return;

  const site = await strapi.documents("api::site.site").findFirst({
    filters: { key: "merkdraak" },
    status: "published",
    fields: ["editorUrl"],
  });
  if (!site?.documentId) return;

  const current = String(site.editorUrl ?? "").trim().replace(/\/$/, "");
  if (current === next) return;

  await strapi.documents("api::site.site").update({
    documentId: site.documentId,
    data: { editorUrl: next },
    status: "published",
  });
  strapi.log.info(`syncEditorUrl: editorUrl ${current || "(empty)"} → ${next}`);
}
