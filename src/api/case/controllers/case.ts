import { factories } from "@strapi/strapi";
import { sectionPopulate } from "../../../editor-populate";

function authorized(ctx: { request: { header: { authorization?: string } } }) {
  const secret = process.env.EDITOR_SECRET;
  return Boolean(secret) && ctx.request.header.authorization === `Bearer ${secret}`;
}

async function knownSite(siteKey: string) {
  if (!siteKey) return null;
  return strapi.documents("api::site.site").findFirst({
    filters: { key: siteKey },
    status: "published",
  });
}

export default factories.createCoreController("api::case.case", ({ strapi }) => ({
  async editorList(ctx) {
    if (!authorized(ctx)) return ctx.unauthorized();
    const siteKey = String(ctx.query.siteKey ?? "");
    if (!(await knownSite(siteKey))) return ctx.notFound();
    const cases = await strapi.documents("api::case.case").findMany({
      status: "draft",
      filters: { siteKey },
      fields: ["title", "slug", "visibility", "navLabel", "entryKey"],
      sort: ["title:asc"],
      pagination: { pageSize: 200 },
    });
    ctx.body = { cases };
  },

  async editorRead(ctx) {
    if (!authorized(ctx)) return ctx.unauthorized();
    const siteKey = String(ctx.query.siteKey ?? "");
    const documentId = String(ctx.query.documentId ?? "");
    if (!documentId || !(await knownSite(siteKey))) return ctx.badRequest("documentId of siteKey ontbreekt");
    const entry = await strapi.documents("api::case.case").findOne({
      documentId,
      status: "draft",
      populate: {
        sections: sectionPopulate,
        parent: { fields: ["entryKey"] },
        related: { fields: ["entryKey"] },
        ogImage: true,
      },
    });
    if (!entry || entry.siteKey !== siteKey) return ctx.notFound();
    ctx.body = { page: { ...entry, pageType: "case", composed: true } };
  },
}));
