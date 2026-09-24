const { readFileSync, writeFileSync } = require("node:fs");
const path = require("node:path");
const { createStrapi, compileStrapi } = require("@strapi/strapi");

const seed = JSON.parse(readFileSync(path.join(__dirname, "../data/merkdraak-seed.json"), "utf8"));

function clean(value) {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === "object") {
    const next = {};
    for (const [key, item] of Object.entries(value)) {
      if (item === null || item === undefined) continue;
      if (key === "parentKey" || key === "relatedKeys" || key === "pageKey" || key === "aboutKeys" || key === "mobileTopicKeys" || key === "menus") {
        continue;
      }
      next[key] = clean(item);
    }
    return next;
  }
  return value;
}

function mapLinks(links, ids) {
  return (links ?? []).flatMap((link) => {
    const documentId = ids.get(link.pageKey);
    if (!documentId) return [];
    const item = { page: documentId };
    if (link.label) item.label = link.label;
    return [item];
  });
}

function mapNavItems(items, ids) {
  return items.map((item) => {
    if (item.__component === "nav.link") {
      return { __component: "nav.link", label: item.label, page: ids.get(item.pageKey) };
    }
    if (item.__component === "nav.dropdown") {
      return { __component: "nav.dropdown", label: item.label, links: mapLinks(item.links, ids) };
    }
    return {
      __component: "nav.mega",
      menuId: item.menuId,
      label: item.label,
      description: item.description,
      columns: (item.columns ?? []).map((column) => ({
        label: column.label,
        groups: (column.groups ?? []).map((group) => ({ links: mapLinks(group.links, ids) })),
      })),
      ...(item.feature ? { feature: item.feature } : {}),
    };
  });
}

async function main() {
  const appContext = await compileStrapi();
  const app = createStrapi(appContext);
  await app.load();

  const siteKey = seed.site.key;
  const existing = await app.documents("api::site.site").findFirst({
    filters: { key: siteKey },
    status: "draft",
  });

  if (existing) {
    console.log(`Site ${siteKey} bestaat al, seed overgeslagen.`);
    await app.destroy();
    return;
  }

  const site = await app.documents("api::site.site").create({
    data: seed.site,
    status: "published",
  });

  const ids = new Map();
  for (const page of seed.pages) {
    const created = await app.documents("api::page.page").create({
      data: {
        ...clean(page),
        site: site.documentId,
        siteKey,
        scopeKey: `${siteKey}:${page.entryKey}`,
        sections: clean(page.sections),
      },
      status: "draft",
    });
    ids.set(page.entryKey, created.documentId);
  }

  for (const page of seed.pages) {
    const data = {};
    if (page.parentKey && ids.has(page.parentKey)) data.parent = ids.get(page.parentKey);
    if (page.relatedKeys?.length) {
      data.related = page.relatedKeys.map((key) => ids.get(key)).filter(Boolean);
    }
    if (Object.keys(data).length) {
      await app.documents("api::page.page").update({
        documentId: ids.get(page.entryKey),
        data,
        status: "draft",
      });
    }
    if (page.visibility !== "planned") {
      await app.documents("api::page.page").publish({ documentId: ids.get(page.entryKey) });
    }
  }

  await app.documents("api::navigation.navigation").create({
    data: {
      site: site.documentId,
      siteKey,
      items: mapNavItems(seed.navigation.items, ids),
      footerServices: seed.navigation.footerServices,
      footerOrganization: seed.navigation.footerOrganization,
      mobileTopics: seed.navigation.mobileTopicKeys.map((key) => ids.get(key)).filter(Boolean),
    },
    status: "published",
  });

  const tokenName = "merkdraak-frontend";
  const createdToken = await app.service("admin::api-token").create({
    name: tokenName,
    description: "Server-side leestoegang voor de Merkdraak frontend",
    type: "custom",
    kind: "content-api",
    lifespan: null,
    permissions: [
      "api::page.page.find",
      "api::page.page.findOne",
      "api::site.site.find",
      "api::site.site.findOne",
      "api::navigation.navigation.find",
      "api::navigation.navigation.findOne",
    ],
  });
  writeFileSync(path.join(__dirname, "../.frontend-token"), `${createdToken.accessKey}\n`);
  console.log("Seed klaar. API-token staat in .frontend-token");
  await app.destroy();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
