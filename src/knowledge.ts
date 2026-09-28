import type { Core } from "@strapi/strapi";

type PageData = Record<string, unknown>;

export function normalizePrefix(value: unknown) {
  const prefix = String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return prefix || "kennisbank";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function tailOf(slug: string) {
  const parts = slug.split("/").map((part) => part.trim()).filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

export function applyKnowledgeSlug(data: PageData, prefixValue: unknown) {
  if (data.pageType !== "knowledge") return;
  const prefix = normalizePrefix(prefixValue);
  const entryKey = typeof data.entryKey === "string" ? data.entryKey : "";
  const current = typeof data.slug === "string" ? data.slug : "";
  if (entryKey === "kennisbank" || (entryKey && current === prefix)) {
    data.slug = prefix;
    return;
  }
  const tail = slugify(tailOf(current) || String(data.title ?? "artikel"));
  const safeTail = tail && tail !== prefix ? tail : slugify(String(data.title ?? "artikel")) || "artikel";
  data.slug = `${prefix}/${safeTail}`;
}

export function safeInternalPath(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("://") || raw.includes("\\") || raw.includes("..")) return null;
  const path = raw.split("?")[0]?.split("#")[0] ?? "";
  if (!path.startsWith("/")) return null;
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

export async function rememberRedirect(strapi: Core.Strapi, siteKey: string, fromValue: string, toValue: string) {
  const fromPath = safeInternalPath(fromValue);
  const toPath = safeInternalPath(toValue);
  if (!fromPath || !toPath || fromPath === toPath) return;
  const reverse = await strapi.documents("api::redirect.redirect").findFirst({
    filters: { siteKey, fromPath: toPath, toPath: fromPath },
  });
  if (reverse?.documentId) {
    await strapi.documents("api::redirect.redirect").update({
      documentId: reverse.documentId,
      data: { enabled: false },
    });
  }
  const existing = await strapi.documents("api::redirect.redirect").findFirst({
    filters: { siteKey, fromPath },
  });
  const data = { siteKey, fromPath, toPath, statusCode: "permanent" as const, enabled: true };
  if (existing?.documentId) {
    await strapi.documents("api::redirect.redirect").update({ documentId: existing.documentId, data });
    return;
  }
  await strapi.documents("api::redirect.redirect").create({ data });
}

function collectKeys(value: unknown, keys: Set<string>) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, keys);
    return;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.entryKey === "string" && record.entryKey) keys.add(record.entryKey);
  for (const child of Object.values(record)) collectKeys(child, keys);
}

export async function syncArticlePrefix(strapi: Core.Strapi, siteKey: string, previous: unknown, next: unknown) {
  const from = normalizePrefix(previous);
  const to = normalizePrefix(next);
  if (from === to) return;
  for (let page = 1; page <= 20; page += 1) {
    const batch = await strapi.documents("api::page.page").findMany({
      filters: { siteKey, pageType: "knowledge" },
      status: "draft",
      fields: ["slug", "entryKey", "documentId", "visibility"],
      pagination: { page, pageSize: 100 },
    });
    for (const item of batch) {
      if (!item.documentId) continue;
      const oldSlug = item.slug ?? "";
      let newSlug = oldSlug;
      if (item.entryKey === "kennisbank" || oldSlug === from) newSlug = to;
      else if (oldSlug.startsWith(`${from}/`)) newSlug = `${to}/${oldSlug.slice(from.length + 1)}`;
      if (!oldSlug || !newSlug || newSlug === oldSlug) continue;
      await rememberRedirect(strapi, siteKey, `/${oldSlug}`, `/${newSlug}`);
      await strapi.documents("api::page.page").update({
        documentId: item.documentId,
        data: { slug: newSlug },
        status: "draft",
      });
      if (item.visibility === "published" || item.visibility === "concept") {
        const live = await strapi.documents("api::page.page").findOne({
          documentId: item.documentId,
          status: "published",
          fields: ["documentId"],
        });
        if (live) await strapi.documents("api::page.page").publish({ documentId: item.documentId });
      }
    }
    if (batch.length < 100) break;
  }
}

export async function backfillMenu(strapi: Core.Strapi) {
  const sites = await strapi.documents("api::site.site").findMany({ status: "published" });
  for (const site of sites) {
    if (site.menuBackfilled || !site.key || !site.documentId) continue;
    const navigation = await strapi.documents("api::navigation.navigation").findFirst({
      filters: { siteKey: site.key },
      status: "published",
      populate: {
        mobileTopics: { fields: ["entryKey"] },
        items: {
          on: {
            "nav.link": { populate: { page: { fields: ["entryKey"] } } },
            "nav.dropdown": { populate: { links: { populate: { page: { fields: ["entryKey"] } } } } },
            "nav.mega": {
              populate: {
                columns: { populate: { groups: { populate: { links: { populate: { page: { fields: ["entryKey"] } } } } } } },
              },
            },
          },
        },
      },
    });
    if (!navigation) continue;
    const keys = new Set<string>();
    collectKeys(navigation.items, keys);
    collectKeys(navigation.mobileTopics, keys);
    for (let page = 1; page <= 20; page += 1) {
      const batch = await strapi.documents("api::page.page").findMany({
        filters: { siteKey: site.key },
        status: "draft",
        fields: ["entryKey", "documentId", "visibility", "showInMenu"],
        pagination: { page, pageSize: 100 },
      });
      for (const item of batch) {
        if (!item.documentId || !item.entryKey || !keys.has(item.entryKey) || item.showInMenu) continue;
        await strapi.documents("api::page.page").update({
          documentId: item.documentId,
          data: { showInMenu: true },
          status: "draft",
        });
        if (item.visibility === "published" || item.visibility === "concept") {
          await strapi.documents("api::page.page").publish({ documentId: item.documentId });
        }
      }
      if (batch.length < 100) break;
    }
    await strapi.documents("api::site.site").update({
      documentId: site.documentId,
      data: site.articlePrefix ? { menuBackfilled: true } : { menuBackfilled: true, articlePrefix: "kennisbank" },
      status: "published",
    });
  }
}
