import { factories } from "@strapi/strapi";
import { applyKnowledgeSlug, normalizePrefix, rememberRedirect } from "../../../knowledge";
import { EditorSaveError, errorPayload, saveResponse } from "../editor-errors";
import { saveEditorPage } from "../editor-save";

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
    if (!authorized(ctx)) {
      ctx.status = 401;
      ctx.body = saveResponse({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Je hebt geen toestemming om op te slaan." },
      });
      return;
    }
    try {
      const result = await saveEditorPage(strapi, ctx.request.body as { documentId?: string; siteKey?: string; data?: Record<string, unknown> }, {
        knownSite,
        applyKnowledgeSlug,
        normalizePrefix,
        rememberRedirect,
      });
      ctx.status = result.status;
      ctx.body = result.body;
    } catch (error) {
      const mapped =
        error instanceof EditorSaveError || (error instanceof Error && error.name === "EditorSaveError" && "status" in error)
          ? (error as EditorSaveError)
          : null;
      if (mapped) {
        ctx.status = mapped.status;
        ctx.body = saveResponse({
          success: false,
          error: errorPayload(mapped),
        });
        return;
      }
      strapi.log.error("editorSave unexpected error", error);
      ctx.status = 500;
      ctx.body = saveResponse({
        success: false,
        error: { code: "UNKNOWN_ERROR", message: "Opslaan is mislukt door een onverwachte fout." },
      });
    }
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
