import { factories } from "@strapi/strapi";

const SITE_KEY = "merkdraak";

function authorized(ctx: { request: { header: { authorization?: string } } }) {
  const secret = process.env.EDITOR_SECRET;
  return Boolean(secret) && ctx.request.header.authorization === `Bearer ${secret}`;
}

const sectionPopulate = {
  on: {
    "sections.hero": { populate: ["stats"] },
    "sections.client-logos": { populate: ["clients"] },
    "sections.results": { populate: ["stats"] },
    "sections.process": { populate: ["steps"] },
    "sections.why-us": { populate: ["pillars"] },
    "sections.team": { populate: ["members"] },
    "sections.bullet-list": { populate: ["items"] },
    "sections.numbered-steps": { populate: ["steps"] },
    "sections.faq": { populate: ["items"] },
    "sections.price-factors": { populate: ["items"] },
    "sections.service-cards": { populate: { cards: { populate: ["items"] } } },
    "sections.case-story": { populate: ["approach", "metrics"] },
    "sections.prose": { populate: "*" },
    "sections.notice": { populate: "*" },
    "sections.testimonial": { populate: "*" },
    "sections.contact-cta": { populate: "*" },
    "sections.case-grid": { populate: "*" },
    "sections.page-index": { populate: ["articleTypes"] },
    "sections.link-list": { populate: ["items"] },
  },
};

export default factories.createCoreController("api::page.page", ({ strapi }) => ({
  async editorList(ctx) {
    if (!authorized(ctx)) return ctx.unauthorized();
    const pages = await strapi.documents("api::page.page").findMany({
      status: "draft",
      filters: { siteKey: SITE_KEY },
      fields: ["title", "slug", "visibility", "navLabel", "entryKey", "pageType"],
      sort: ["title:asc"],
      pagination: { pageSize: 200 },
    });
    ctx.body = { pages };
  },

  async editorRead(ctx) {
    if (!authorized(ctx)) return ctx.unauthorized();
    const documentId = String(ctx.query.documentId ?? "");
    if (!documentId) return ctx.badRequest("documentId ontbreekt");
    const page = await strapi.documents("api::page.page").findOne({
      documentId,
      status: "draft",
      populate: {
        sections: sectionPopulate,
        parent: { fields: ["entryKey"] },
        related: { fields: ["entryKey"] },
      },
    });
    if (!page || page.siteKey !== SITE_KEY) return ctx.notFound();
    ctx.body = { page };
  },

  async editorSave(ctx) {
    if (!authorized(ctx)) return ctx.unauthorized();
    const body = ctx.request.body as {
      documentId?: string;
      data?: Record<string, unknown>;
    };
    const data = body.data;
    if (!data || typeof data !== "object") return ctx.badRequest("data ontbreekt");
    data.siteKey = SITE_KEY;

    const parentKey = typeof data.parentKey === "string" ? data.parentKey : "";
    const relatedKeys = Array.isArray(data.relatedKeys) ? data.relatedKeys.filter((item) => typeof item === "string") : [];
    delete data.parentKey;
    delete data.relatedKeys;
    if (parentKey) {
      const parent = await strapi.documents("api::page.page").findFirst({
        filters: { entryKey: parentKey, siteKey: SITE_KEY },
        status: "draft",
      });
      if (parent?.documentId) data.parent = parent.documentId;
    }
    if (relatedKeys.length) {
      const related = await strapi.documents("api::page.page").findMany({
        filters: { entryKey: { $in: relatedKeys }, siteKey: SITE_KEY },
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
}));
