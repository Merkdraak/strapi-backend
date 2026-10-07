import type { Core } from "@strapi/strapi";
import { applyCaseSlug } from "../../cases";
import {
  EditorSaveError,
  fromStrapiError,
  isBenignUnpublish,
  saveResponse,
  slugify,
  type EditorSaveBody,
} from "./editor-errors";
import { refreshFrontend } from "../../refresh-frontend";

type SaveInput = {
  documentId?: string;
  siteKey?: string;
  kind?: string;
  data?: Record<string, unknown>;
};

type Documents = {
  findFirst: (params: Record<string, unknown>) => Promise<{ documentId?: string; slug?: string; siteKey?: string } | null>;
  findOne: (params: Record<string, unknown>) => Promise<{ documentId?: string; slug?: string; siteKey?: string } | null>;
  findMany: (params: Record<string, unknown>) => Promise<{ documentId?: string }[]>;
  update: (params: Record<string, unknown>) => Promise<unknown>;
  create: (params: Record<string, unknown>) => Promise<{ documentId?: string }>;
  publish: (params: Record<string, unknown>) => Promise<unknown>;
  unpublish: (params: Record<string, unknown>) => Promise<unknown>;
};

function docs(strapi: Core.Strapi, uid: "api::page.page" | "api::case.case") {
  return strapi.documents(uid) as unknown as Documents;
}

async function otherWithScopeKey(strapi: Core.Strapi, scopeKey: string, documentId?: string) {
  const uids = ["api::page.page", "api::case.case"] as const;
  const statuses = ["draft", "published"] as const;
  for (const uid of uids) {
    for (const status of statuses) {
      const found = await docs(strapi, uid).findMany({
        filters: { scopeKey },
        status,
        fields: ["scopeKey"],
        pagination: { pageSize: 20 },
      });
      const other = found.find((item) => item.documentId && item.documentId !== documentId);
      if (other) return other;
    }
  }
  return null;
}

export async function saveEditorPage(
  strapi: Core.Strapi,
  input: SaveInput,
  helpers: {
    knownSite: (siteKey: string) => Promise<{ id?: number | string; documentId?: string; articlePrefix?: string | null } | null>;
    applyKnowledgeSlug: (data: Record<string, unknown>, prefix: unknown) => void;
    normalizePrefix: (value: unknown) => string;
    rememberRedirect: (cms: Core.Strapi, siteKey: string, from: string, to: string) => Promise<void>;
  },
): Promise<{ status: number; body: EditorSaveBody }> {
  const data = input.data;
  if (!data || typeof data !== "object") {
    throw new EditorSaveError(400, "VALIDATION_ERROR", "De pagina bevat ongeldige gegevens. Controleer de gemarkeerde velden.");
  }

  const isCase = input.kind === "case" || (input.kind !== "page" && data.pageType === "case");
  const uid = isCase ? "api::case.case" : "api::page.page";
  const store = docs(strapi, uid);

  const siteKey = String(input.siteKey ?? data.siteKey ?? "");
  const site = await helpers.knownSite(siteKey);
  if (!site) throw new EditorSaveError(404, "NOT_FOUND", "Deze website is niet gevonden.");
  data.siteKey = siteKey;
  data.site = site.id ?? site.documentId;

  let previousSlug = "";
  if (input.documentId) {
    const current = await store.findOne({
      documentId: input.documentId,
      status: "draft",
      fields: ["slug", "siteKey"],
    });
    if (!current || current.siteKey !== siteKey) {
      throw new EditorSaveError(404, "NOT_FOUND", "Deze pagina bestaat niet meer.");
    }
    previousSlug = current.slug ?? "";
  }

  if (isCase) {
    applyCaseSlug(data);
    data.composed = true;
    delete data.pageType;
    delete data.showInMenu;
    delete data.authorName;
    delete data.publishedOn;
    delete data.formEmail;
    delete data.formThanks;
    delete data.formRedirect;
    if (!data.parentKey) data.parentKey = "cases";
  } else {
    helpers.applyKnowledgeSlug(data, helpers.normalizePrefix(site.articlePrefix));
    data.showInMenu = data.showInMenu === true || data.showInMenu === "true";
    if (!data.publishedOn) data.publishedOn = null;
    if (String(data.pageType) !== "home" && !String(data.slug ?? "").trim()) {
      data.slug = slugify(String(data.title ?? data.entryKey ?? "pagina"));
    }
    if (String(data.pageType) !== "home" && !String(data.slug ?? "").trim()) {
      throw new EditorSaveError(400, "VALIDATION_ERROR", "Vul een geldige URL-slug in voordat je opslaat.", { field: "slug" });
    }
  }
  const nextSlug = typeof data.slug === "string" ? data.slug : "";
  if (previousSlug && nextSlug && previousSlug !== nextSlug) {
    await helpers.rememberRedirect(strapi, siteKey, `/${previousSlug}`, `/${nextSlug}`);
  }

  const parentKey = typeof data.parentKey === "string" ? data.parentKey : "";
  const relatedKeys = Array.isArray(data.relatedKeys) ? data.relatedKeys.filter((item) => typeof item === "string") : [];
  delete data.parentKey;
  delete data.relatedKeys;
  const pages = docs(strapi, "api::page.page");
  if (parentKey) {
    const parent = await pages.findFirst({
      filters: { entryKey: parentKey, siteKey },
      status: "draft",
    });
    if (parent?.documentId) data.parent = parent.documentId;
  }
  if (relatedKeys.length) {
    const related = await pages.findMany({
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
    const source = isCase
      ? String(data.slug ?? "").split("/").filter(Boolean).pop() || String(data.title ?? "case")
      : typeof data.slug === "string" && data.slug
        ? data.slug
        : String(data.title ?? "pagina");
    data.entryKey = isCase ? slugify(`case-${source}`) || `case-${Date.now()}` : slugify(source) || `pagina-${Date.now()}`;
  }
  data.scopeKey = `${siteKey}:${String(data.entryKey).trim()}`;

  // Contact always uses the pagebuilder. Other pages keep the editor "Opbouw" choice,
  // but never leave composed unset when blocks are present (defaults to pagebuilder).
  if (String(data.entryKey) === "contact") {
    data.composed = true;
  } else if (data.composed == null && Array.isArray(data.sections) && data.sections.length > 0) {
    data.composed = true;
  } else if (typeof data.composed === "string") {
    data.composed = data.composed === "true";
  }

  const existing = await otherWithScopeKey(strapi, String(data.scopeKey), input.documentId);
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
      await store.update({ documentId, data, status: "draft" });
    } else {
      const created = await store.create({ data, status: "draft" });
      documentId = created.documentId;
    }
  } catch (error) {
    strapi.log.error(`editorSave draft failed documentId=${documentId ?? ""} scopeKey=${String(data.scopeKey)}`, error);
    throw fromStrapiError(error, data.sections);
  }

  if (!documentId) {
    throw new EditorSaveError(500, "DRAFT_SAVE_FAILED", "Opslaan is mislukt door een onverwachte fout.");
  }

  const wantPublished = visibility !== "planned";
  try {
    if (wantPublished) {
      await store.publish({ documentId });
    } else {
      try {
        await store.unpublish({ documentId });
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
    void refreshFrontend({ slug: nextSlug, siteKey }).catch((revalidateError: unknown) => {
      strapi.log.warn("editorSave frontend revalidate failed", revalidateError);
    });
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

  void refreshFrontend({ slug: nextSlug, siteKey }).catch((error: unknown) => {
    strapi.log.warn("editorSave frontend revalidate failed", error);
  });

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
