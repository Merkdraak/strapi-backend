import { factories } from "@strapi/strapi";

function authorized(ctx: { request: { header: { authorization?: string } } }) {
  const secret = process.env.EDITOR_SECRET;
  return Boolean(secret) && ctx.request.header.authorization === `Bearer ${secret}`;
}

const sectionPopulate = {
  on: {
    "sections.hero": { populate: ["stats", "image"] },
    "sections.client-logos": { populate: { clients: { populate: ["image"] } } },
    "sections.results": { populate: ["stats"] },
    "sections.process": { populate: ["steps"] },
    "sections.why-us": { populate: ["pillars"] },
    "sections.team": { populate: { members: { populate: ["image"] } } },
    "sections.bullet-list": { populate: ["items"] },
    "sections.numbered-steps": { populate: ["steps"] },
    "sections.faq": { populate: ["items"] },
    "sections.price-factors": { populate: ["items"] },
    "sections.service-cards": { populate: { cards: { populate: ["items"] } } },
    "sections.case-story": { populate: ["approach", "metrics", "image"] },
    "sections.prose": { populate: "*" },
    "sections.notice": { populate: "*" },
    "sections.testimonial": { populate: "*" },
    "sections.contact-cta": { populate: "*" },
    "sections.case-grid": { populate: "*" },
    "sections.page-index": { populate: ["articleTypes"] },
    "sections.link-list": { populate: ["items"] },
    "sections.image-slider": { populate: { slides: { populate: ["image"] } } },
    "sections.image": { populate: ["image"] },
    "sections.video": { populate: "*" },
    "sections.heading": { populate: "*" },
    "sections.button": { populate: "*" },
    "sections.divider": { populate: "*" },
    "sections.split": { populate: ["image"] },
    "sections.takeaways": { populate: ["items"] },
    "sections.table": { populate: ["rows"] },
    "sections.columns": { populate: "*" },
    "sections.cards": { populate: { cards: { populate: ["image"] } } },
    "sections.accordion": { populate: ["items"] },
    "sections.expert": { populate: ["image"] },
    "sections.sources": { populate: ["items"] },
    "sections.gallery": { populate: { items: { populate: ["image"] } } },
    "sections.before-after": { populate: ["before", "after"] },
    "sections.reviews": { populate: ["items"] },
    "sections.location": { populate: "*" },
    "sections.document": { populate: ["file"] },
    "sections.button-row": { populate: "*" },
  },
};

async function knownSite(siteKey: string) {
  if (!siteKey) return null;
  return strapi.documents("api::site.site").findFirst({
    filters: { key: siteKey },
    status: "published",
  });
}

export default factories.createCoreController("api::page.page", ({ strapi }) => ({
  async editorList(ctx) {
    if (!authorized(ctx)) return ctx.unauthorized();
    const siteKey = String(ctx.query.siteKey ?? "");
    if (!(await knownSite(siteKey))) return ctx.notFound();
    const pages = await strapi.documents("api::page.page").findMany({
      status: "draft",
      filters: { siteKey },
      fields: ["title", "slug", "visibility", "navLabel", "entryKey", "pageType"],
      sort: ["title:asc"],
      pagination: { pageSize: 200 },
    });
    ctx.body = { pages };
  },

  async editorRead(ctx) {
    if (!authorized(ctx)) return ctx.unauthorized();
    const siteKey = String(ctx.query.siteKey ?? "");
    const documentId = String(ctx.query.documentId ?? "");
    if (!documentId || !(await knownSite(siteKey))) return ctx.badRequest("documentId of siteKey ontbreekt");
    const page = await strapi.documents("api::page.page").findOne({
      documentId,
      status: "draft",
      populate: {
        sections: sectionPopulate,
        parent: { fields: ["entryKey"] },
        related: { fields: ["entryKey"] },
        ogImage: true,
      },
    });
    if (!page || page.siteKey !== siteKey) return ctx.notFound();
    ctx.body = { page };
  },

  async editorSave(ctx) {
    if (!authorized(ctx)) return ctx.unauthorized();
    const body = ctx.request.body as {
      documentId?: string;
      siteKey?: string;
      data?: Record<string, unknown>;
    };
    const data = body.data;
    if (!data || typeof data !== "object") return ctx.badRequest("data ontbreekt");
    const siteKey = String(body.siteKey ?? data.siteKey ?? "");
    if (!(await knownSite(siteKey))) return ctx.notFound();
    data.siteKey = siteKey;

    const parentKey = typeof data.parentKey === "string" ? data.parentKey : "";
    const relatedKeys = Array.isArray(data.relatedKeys) ? data.relatedKeys.filter((item) => typeof item === "string") : [];
    delete data.parentKey;
    delete data.relatedKeys;
    if (parentKey) {
      const parent = await strapi.documents("api::page.page").findFirst({
        filters: { entryKey: parentKey, siteKey },
        status: "draft",
      });
      if (parent?.documentId) data.parent = parent.documentId;
    }
    if (relatedKeys.length) {
      const related = await strapi.documents("api::page.page").findMany({
        filters: { entryKey: { $in: relatedKeys }, siteKey },
        status: "draft",
        fields: ["entryKey"],
        pagination: { pageSize: 50 },
      });
      data.related = related.map((item) => item.documentId);
    }

    const pageData = data as never;
    const visibility = String(data.visibility ?? "planned");
    let documentId = body.documentId;
    if (documentId) {
      await strapi.documents("api::page.page").update({ documentId, data: pageData, status: "draft" });
    } else {
      const created = await strapi.documents("api::page.page").create({ data: pageData, status: "draft" });
      documentId = created.documentId;
    }
    if (!documentId) return ctx.badRequest("opslaan mislukt");
    if (visibility === "planned") {
      await strapi.documents("api::page.page").unpublish({ documentId });
    } else {
      await strapi.documents("api::page.page").publish({ documentId });
    }
    ctx.body = { ok: true, documentId };
  },

  async editorMedia(ctx) {
    if (!authorized(ctx)) return ctx.unauthorized();
    if (ctx.method === "POST") {
      const uploaded = ctx.request.files?.files ?? ctx.request.files?.file;
      if (!uploaded) return ctx.badRequest("Geen bestand");
      const created = await strapi.plugin("upload").service("upload").upload({
        data: {},
        files: uploaded,
      });
      const file = Array.isArray(created) ? created[0] : created;
      ctx.body = { file: file ? { id: file.id, url: file.url, name: file.name } : null };
      return;
    }
    const files = await strapi.db.query("plugin::upload.file").findMany({
      where: { mime: { $startsWith: "image/" } },
      orderBy: { name: "asc" },
    });
    ctx.body = {
      files: files.map((file) => ({ id: file.id, url: file.url, name: file.name })),
    };
  },
}));
