const { createStrapi, compileStrapi } = require("@strapi/strapi");

async function main() {
  const appContext = await compileStrapi();
  const app = createStrapi(appContext);
  await app.load();

  const pages = await app.documents("api::page.page").findMany({
    status: "draft",
    filters: { pageType: "case" },
    populate: {
      sections: true,
      parent: { fields: ["entryKey"] },
      related: { fields: ["entryKey"] },
      ogImage: true,
      site: true,
    },
    pagination: { pageSize: 100 },
  });

  let moved = 0;
  for (const page of pages) {
    if (!page.documentId || !page.siteKey || !page.entryKey) continue;
    const existing = await app.documents("api::case.case").findFirst({
      filters: { scopeKey: page.scopeKey || `${page.siteKey}:${page.entryKey}` },
      status: "draft",
    });
    if (existing) {
      await app.documents("api::page.page").delete({ documentId: page.documentId });
      moved += 1;
      continue;
    }
    const related = Array.isArray(page.related) ? page.related.map((item) => item.documentId).filter(Boolean) : [];
    const created = await app.documents("api::case.case").create({
      data: {
        site: page.site?.documentId ?? page.site,
        siteKey: page.siteKey,
        entryKey: page.entryKey,
        scopeKey: page.scopeKey || `${page.siteKey}:${page.entryKey}`,
        title: page.title,
        navLabel: page.navLabel,
        slug: page.slug,
        cluster: page.cluster,
        phase: page.phase,
        visibility: page.visibility,
        publishAt: page.publishAt,
        composed: true,
        seoTitle: page.seoTitle,
        description: page.description,
        canonicalUrl: page.canonicalUrl,
        ogTitle: page.ogTitle,
        ogDescription: page.ogDescription,
        ogImage: page.ogImage?.id ?? null,
        nofollow: page.nofollow,
        intro: page.intro,
        eyebrow: page.eyebrow,
        cta: page.cta,
        parent: page.parent?.documentId ?? null,
        related,
        sections: page.sections,
      },
      status: "draft",
    });
    if (page.visibility !== "planned" && created.documentId) {
      await app.documents("api::case.case").publish({ documentId: created.documentId });
    }
    await app.documents("api::page.page").delete({ documentId: page.documentId });
    moved += 1;
  }

  try {
    const tokens = await app.db.query("admin::api-token").findMany();
    for (const token of tokens) {
      if (token.name !== "merkdraak-frontend" || !token.id) continue;
      const service = app.service("admin::api-token");
      await service.update(token.id, {
        permissions: [
          "api::page.page.find",
          "api::page.page.findOne",
          "api::case.case.find",
          "api::case.case.findOne",
          "api::site.site.find",
          "api::site.site.findOne",
          "api::navigation.navigation.find",
          "api::navigation.navigation.findOne",
        ],
      });
    }
  } catch (error) {
    console.warn("API-token rechten voor cases konden niet worden bijgewerkt.", error);
  }

  console.log(`Cases gemigreerd: ${moved}`);
  await app.destroy();
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
