import type { Core } from "@strapi/strapi";

/**
 * Company pages with CMS sections stay on the legacy template until `composed` is true.
 * Home already renders builder blocks by page type; over-ons must opt in via Opbouw.
 * Flip known pagebuilder pages that still have composed=false so editor changes go live.
 */
export async function syncComposedPages(strapi: Core.Strapi) {
  const siteKey = "merkdraak";
  const entryKeys = ["over-ons", "contact"];

  for (const entryKey of entryKeys) {
    const page = await strapi.documents("api::page.page").findFirst({
      filters: { siteKey, entryKey },
      status: "draft",
      fields: ["composed", "visibility", "entryKey"],
    });
    if (!page?.documentId) continue;
    if (page.composed === true) continue;

    await strapi.documents("api::page.page").update({
      documentId: page.documentId,
      status: "draft",
      data: { composed: true },
    });

    if (page.visibility === "published" || page.visibility === "concept") {
      await strapi.documents("api::page.page").publish({ documentId: page.documentId });
    }

    strapi.log.info(`syncComposedPages: ${entryKey} documentId=${page.documentId} composed=true`);
  }
}
