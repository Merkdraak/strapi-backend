import type { Core } from "@strapi/strapi";
import {
  EditorSaveError,
  fromStrapiError,
  isBenignUnpublish,
  saveResponse,
  slugify,
  type EditorSaveBody,
} from "./editor-errors";

type SaveInput = {
  documentId?: string;
  siteKey?: string;
  data?: Record<string, unknown>;
};

type PageDocuments = {
  findFirst: (params: Record<string, unknown>) => Promise<{ documentId?: string; slug?: string; siteKey?: string } | null>;
  findOne: (params: Record<string, unknown>) => Promise<{ documentId?: string; slug?: string; siteKey?: string } | null>;
  findMany: (params: Record<string, unknown>) => Promise<{ documentId?: string }[]>;
  update: (params: Record<string, unknown>) => Promise<unknown>;
  create: (params: Record<string, unknown>) => Promise<{ documentId?: string }>;
  publish: (params: Record<string, unknown>) => Promise<unknown>;
  unpublish: (params: Record<string, unknown>) => Promise<unknown>;
};

function pages(strapi: Core.Strapi) {
  return strapi.documents("api::page.page") as unknown as PageDocuments;
}

async function otherPageWithScopeKey(strapi: Core.Strapi, scopeKey: string, documentId?: string) {
  const statuses = ["draft", "published"] as const;
  for (const status of statuses) {
    const found = await pages(strapi).findMany({
      filters: { scopeKey },
      status,
      fields: ["scopeKey"],
      pagination: { pageSize: 20 },
    });
    const other = found.find((page) => page.documentId && page.documentId !== documentId);
    if (other) return other;
  }
  return null;
}

export async function saveEditorPage(
  strapi: Core.Strapi,
  input: SaveInput,
  helpers: {
    knownSite: (siteKey: string) => Promise<{ articlePrefix?: string | null } | null>;
    applyKnowledgeSlug: (data: Record<string, unknown>, prefix: unknown) => void;
    normalizePrefix: (value: unknown) => string;
    rememberRedirect: (cms: Core.Strapi, siteKey: string, from: string, to: string) => Promise<void>;
  },
): Promise<{ status: number; body: EditorSaveBody }> {
  const data = input.data;
  if (!data || typeof data !== "object") {
    throw new EditorSaveError(400, "VALIDATION_ERROR", "De pagina bevat ongeldige gegevens. Controleer de gemarkeerde velden.");
  }

  const siteKey = String(input.siteKey ?? data.siteKey ?? "");
  const site = await helpers.knownSite(siteKey);
  if (!site) throw new EditorSaveError(404, "NOT_FOUND", "Deze website is niet gevonden.");
  data.siteKey = siteKey;

  let previousSlug = "";
  if (input.documentId) {
    const current = await pages(strapi).findOne({
      documentId: input.documentId,
      status: "draft",
      fields: ["slug", "siteKey"],
    });
    if (!current || current.siteKey !== siteKey) {
      throw new EditorSaveError(404, "NOT_FOUND", "Deze pagina bestaat niet meer.");
    }
    previousSlug = current.slug ?? "";
  }

  helpers.applyKnowledgeSlug(data, helpers.normalizePrefix(site.articlePrefix));
  if (!data.publishedOn) data.publishedOn = null;
  data.showInMenu = data.showInMenu === true || data.showInMenu === "true";
  const nextSlug = typeof data.slug === "string" ? data.slug : "";
  if (previousSlug && nextSlug && previousSlug !== nextSlug) {
    await helpers.rememberRedirect(strapi, siteKey, `/${previousSlug}`, `/${nextSlug}`);
  }

  const parentKey = typeof data.parentKey === "string" ? data.parentKey : "";
  const relatedKeys = Array.isArray(data.relatedKeys) ? data.relatedKeys.filter((item) => typeof item === "string") : [];
  delete data.parentKey;
  delete data.relatedKeys;
  if (parentKey) {
    const parent = await pages(strapi).findFirst({
      filters: { entryKey: parentKey, siteKey },
      status: "draft",
    });
    if (parent?.documentId) data.parent = parent.documentId;
  }
  if (relatedKeys.length) {
    const related = await pages(strapi).findMany({
      filters: { entryKey: { $in: relatedKeys }, siteKey },
      status: "draft",
      fields: ["entryKey"],
      pagination: { pageSize: 50 },
    });
    data.related = related.map((item) => item.documentId);
  }

  const publishAt = typeof data.publishAt === "string" ? Date.parse(data.publishAt) : Number.NaN;
  const scheduled = Number.isFinite(publishAt) && publishAt > Date.now();
  if (!data.publishAt) data.publishAt = null;
  if (scheduled) data.visibility = "planned";

  if (!String(data.entryKey ?? "").trim()) {
    const source = typeof data.slug === "string" && data.slug ? data.slug : String(data.title ?? "pagina");
    data.entryKey = slugify(source) || `pagina-${Date.now()}`;
  }
  data.scopeKey = `${siteKey}:${String(data.entryKey).trim()}`;

  const existing = await otherPageWithScopeKey(strapi, String(data.scopeKey), input.documentId);
  if (existing) {
    throw new EditorSaveError(409, "DUPLICATE_SCOPE_KEY", "Er bestaat al een pagina met dezelfde sleutel. Kies een andere slug of entryKey.", {
      field: "scopeKey",
      details: { scopeKey: data.scopeKey },
    });
  }

  const visibility = String(data.visibility ?? "planned");
  let documentId = input.documentId;
  try {
    if (documentId) {
      await pages(strapi).update({ documentId, data, status: "draft" });
    } else {
      const created = await pages(strapi).create({ data, status: "draft" });
      documentId = created.documentId;
    }
  } catch (error) {
    strapi.log.error(`editorSave draft failed documentId=${documentId ?? ""} scopeKey=${String(data.scopeKey)}`, error);
    throw fromStrapiError(error, data.sections);
  }

  if (!documentId) {
    throw new EditorSaveError(500, "DRAFT_SAVE_FAILED", "Opslaan is mislukt door een onverwachte fout.");
  }

  // Draft & Publish blijven aparte stappen: een geslaagde draft mag niet rollbacken als publish faalt.
  const wantPublished = visibility !== "planned";
  try {
    if (wantPublished) {
      await pages(strapi).publish({ documentId });
    } else {
      try {
        await pages(strapi).unpublish({ documentId });
      } catch (error) {
        if (!isBenignUnpublish(error)) throw error;
      }
    }
  } catch (error) {
    strapi.log.warn(
      `editorSave ${wantPublished ? "publish" : "unpublish"} failed documentId=${documentId} scopeKey=${String(data.scopeKey)}`,
      error,
    );
    const mapped = fromStrapiError(error, data.sections);
    const code = wantPublished ? "PUBLISH_FAILED" : "UNPUBLISH_FAILED";
    const message = wantPublished
      ? "De wijzigingen zijn opgeslagen als concept, maar publiceren is mislukt."
      : "De wijzigingen zijn opgeslagen, maar het offline halen van de pagina is mislukt.";
    return {
      status: 200,
      body: saveResponse({
        ok: true,
        success: false,
        draftSaved: true,
        published: false,
        unpublished: false,
        documentId,
        warning: { code, message, details: mapped.details },
        error: { code, message, details: mapped.details },
      }),
    };
  }

  return {
    status: 200,
    body: saveResponse({
      ok: true,
      success: true,
      draftSaved: true,
      published: wantPublished,
      unpublished: !wantPublished,
      documentId,
    }),
  };
}
