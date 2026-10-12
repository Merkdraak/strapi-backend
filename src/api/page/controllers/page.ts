import { factories } from "@strapi/strapi";
import { applyKnowledgeSlug, normalizePrefix, rememberRedirect } from "../../../knowledge";
import { sectionPopulate } from "../../../editor-populate";
import { buildEditorRequiredFields } from "../../../editor-required-fields";
import { EditorSaveError, errorPayload, saveResponse } from "../editor-errors";
import { saveEditorPage } from "../editor-save";

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

export default factories.createCoreController("api::page.page", ({ strapi }) => ({
  async editorList(ctx) {
    if (!authorized(ctx)) return ctx.unauthorized();
    const siteKey = String(ctx.query.siteKey ?? "");
    if (!(await knownSite(siteKey))) return ctx.notFound();
    const pages = await strapi.documents("api::page.page").findMany({
      status: "draft",
      filters: { siteKey, pageType: { $ne: "case" } },
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
        cardImage: true,
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
      const result = await saveEditorPage(strapi, ctx.request.body as { documentId?: string; siteKey?: string; kind?: string; data?: Record<string, unknown> }, {
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

  async editorRequiredFields(ctx) {
    if (!authorized(ctx)) return ctx.unauthorized();
    ctx.body = buildEditorRequiredFields(strapi);
  },

  async editorMedia(ctx) {
    if (!authorized(ctx)) return ctx.unauthorized();
    if (ctx.method === "POST") {
      const uploaded = ctx.request.files?.files ?? ctx.request.files?.file;
      if (!uploaded) return ctx.badRequest("Geen bestand");
      try {
        const created = await strapi.plugin("upload").service("upload").upload({
          data: {},
          files: uploaded,
        });
        const file = Array.isArray(created) ? created[0] : created;
        ctx.body = {
          file: file
            ? {
                id: file.id,
                url: file.url,
                name: file.name,
                width: file.width ?? null,
                height: file.height ?? null,
              }
            : null,
        };
      } catch (error) {
        strapi.log.error(error);
        return ctx.badRequest("Upload mislukt");
      }
      return;
    }
    const files = await strapi.db.query("plugin::upload.file").findMany({
      where: { mime: { $startsWith: "image/" } },
      orderBy: { name: "asc" },
    });
    ctx.body = {
      files: files.map((file) => ({
        id: file.id,
        url: file.url,
        name: file.name,
        width: file.width ?? null,
        height: file.height ?? null,
      })),
    };
  },

  async editorPresets(ctx) {
    if (!authorized(ctx)) return ctx.unauthorized();
    const siteKey = String(ctx.query.siteKey ?? ctx.request.body?.siteKey ?? "").trim();
    if (!(await knownSite(siteKey))) return ctx.notFound();
    const uid = "api::editor-preset.editor-preset" as const;

    try {
      if (ctx.method === "GET") {
        const rows = await strapi.documents(uid).findMany({
          filters: { siteKey },
          fields: ["name", "puckType", "payload"],
          sort: ["updatedAt:desc"],
          pagination: { pageSize: 200 },
        });
        ctx.body = {
          presets: rows.map((row) => ({
            documentId: row.documentId,
            name: row.name,
            puckType: row.puckType,
            payload: row.payload && typeof row.payload === "object" && !Array.isArray(row.payload) ? row.payload : {},
          })),
        };
        return;
      }

      if (ctx.method === "DELETE") {
        const documentId = String(ctx.query.documentId ?? ctx.request.body?.documentId ?? "").trim();
        if (!documentId) return ctx.badRequest("documentId ontbreekt");
        const existing = await strapi.documents(uid).findOne({ documentId });
        if (!existing || existing.siteKey !== siteKey) return ctx.notFound();
        await strapi.documents(uid).delete({ documentId });
        ctx.body = { ok: true };
        return;
      }

      const body = (ctx.request.body ?? {}) as Record<string, unknown>;
      const name = String(body.name ?? "").trim().slice(0, 120);
      const puckType = String(body.puckType ?? "").trim();
      const payload = body.payload;
      if (!name || !/^[A-Za-z][A-Za-z0-9]{0,79}$/.test(puckType)) {
        return ctx.badRequest("Naam of bloktype ontbreekt");
      }
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return ctx.badRequest("Inhoud ontbreekt");
      }
      if (JSON.stringify(payload).length > 500000) return ctx.badRequest("Blok is te groot om te bewaren");
      const created = await strapi.documents(uid).create({
        data: {
          siteKey,
          name,
          puckType,
          payload: JSON.parse(JSON.stringify(payload)) as never,
        },
      });
      ctx.body = {
        preset: {
          documentId: created.documentId,
          name: created.name,
          puckType: created.puckType,
          payload: created.payload,
        },
      };
    } catch (error) {
      strapi.log.error(error);
      return ctx.badRequest("Favoriet opslaan of laden is mislukt.");
    }
  },
}));
