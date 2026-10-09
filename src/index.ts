import type { Core } from "@strapi/strapi";
import { registerMailAdminRoutes } from "./admin-routes/mail";
import { clearEditorRequiredFieldsCache } from "./editor-required-fields";
import { backfillMenu, normalizePrefix, syncArticlePrefix } from "./knowledge";
import { registerPageBlocksTool } from "./page-blocks-mcp";
import { publishScheduledPages } from "./publish-scheduled";
import { syncComposedPages } from "./sync-composed-pages";
import { syncContactPageBuilder } from "./sync-contact-page";
import { syncEditorUrl } from "./sync-editor-url";
import { syncScanRequestForms } from "./sync-scan-forms";
import { ensureEmailSettings } from "./services/email/settings";

// Webhook events that refresh the public site when content is saved.
const events = ["entry.create", "entry.update", "entry.delete", "entry.publish", "entry.unpublish"];
let scheduledTimer: ReturnType<typeof setInterval> | undefined;

function siteKeyFrom(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function withId(value: Record<string, unknown>) {
  const id = Number(value.id);
  return Number.isInteger(id) && id > 0 ? { id } : {};
}

function textOf(value: unknown) {
  return String(value ?? "");
}

function mediaFile(value: unknown) {
  const row = asRecord(value);
  const id = Number(row.id);
  const url = textOf(row.url).trim();
  if (!Number.isInteger(id) || id <= 0 || !url) return null;
  return {
    id,
    url,
    name: textOf(row.name).trim() || "favicon",
  };
}

function faviconUpdate(value: unknown) {
  if (value === null) return null;
  if (value === undefined) return undefined;
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) return undefined;
  return id;
}

async function pageDocumentId(strapi: Core.Strapi, siteKey: string, value: unknown) {
  if (!value) return undefined;
  if (typeof value === "string" && value.trim()) return value.trim();
  const row = asRecord(value);
  if (typeof row.documentId === "string" && row.documentId) return row.documentId;
  const entryKey = textOf(row.entryKey).trim();
  if (!entryKey) return undefined;
  const page = await strapi.documents("api::page.page").findFirst({
    filters: { siteKey, entryKey },
    fields: ["entryKey"],
  });
  return page?.documentId;
}

function footerRows(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((row) => {
    const item = asRecord(row);
    return {
      label: textOf(item.label).trim() || "-",
      href: textOf(item.href).trim() || "/",
    };
  });
}

async function navItems(strapi: Core.Strapi, siteKey: string, value: unknown) {
  if (!Array.isArray(value)) return [];
  const items = [];
  for (const row of value) {
    const item = asRecord(row);
    const component = textOf(item.__component);
    if (component === "nav.link") {
      items.push({
        __component: "nav.link",
        ...withId(item),
        label: textOf(item.label).trim() || "Link",
        page: await pageDocumentId(strapi, siteKey, item.page),
      });
      continue;
    }
    if (component === "nav.dropdown") {
      const links = Array.isArray(item.links) ? item.links : [];
      items.push({
        __component: "nav.dropdown",
        ...withId(item),
        label: textOf(item.label).trim() || "Menu",
        links: await Promise.all(
          links.map(async (link) => {
            const entry = asRecord(link);
            return {
              ...withId(entry),
              label: textOf(entry.label),
              page: await pageDocumentId(strapi, siteKey, entry.page),
            };
          }),
        ),
      });
      continue;
    }
    if (component !== "nav.mega") continue;
    const columns = Array.isArray(item.columns) ? item.columns : [];
    const feature = asRecord(item.feature);
    const title = textOf(feature.title).trim();
    const body = textOf(feature.body).trim();
    const href = textOf(feature.href).trim();
    const cta = textOf(feature.cta).trim();
    items.push({
      __component: "nav.mega",
      ...withId(item),
      menuId: textOf(item.menuId).trim() || textOf(item.label).trim() || "menu",
      label: textOf(item.label).trim() || "Menu",
      description: textOf(item.description),
      columns: await Promise.all(
        columns.map(async (column) => {
          const col = asRecord(column);
          const groups = Array.isArray(col.groups) ? col.groups : [];
          return {
            ...withId(col),
            label: textOf(col.label).trim() || "Kolom",
            groups: await Promise.all(
              groups.map(async (group) => {
                const grp = asRecord(group);
                const links = Array.isArray(grp.links) ? grp.links : [];
                return {
                  ...withId(grp),
                  links: await Promise.all(
                    links.map(async (link) => {
                      const entry = asRecord(link);
                      return {
                        ...withId(entry),
                        label: textOf(entry.label),
                        page: await pageDocumentId(strapi, siteKey, entry.page),
                      };
                    }),
                  ),
                };
              }),
            ),
          };
        }),
      ),
      feature: title && body && href && cta ? { ...withId(feature), title, body, href, cta } : undefined,
    });
  }
  return items;
}

function saveError(error: unknown) {
  if (!error || typeof error !== "object") return "De site kon niet worden opgeslagen.";
  const err = error as { message?: string; details?: { errors?: { path?: string[]; message?: string }[] } };
  const details = err.details?.errors
    ?.map((item) => [item.path?.join("."), item.message].filter(Boolean).join(": "))
    .filter(Boolean);
  if (details?.length) return details.join(" ");
  return err.message || "De site kon niet worden opgeslagen.";
}



export default {
  register({ strapi }: { strapi: Core.Strapi }) {
    registerPageBlocksTool(strapi);
    const routes = strapi.admin.routes.admin.routes as unknown[];
    const adminOnly = { policies: ["admin::isAuthenticatedAdmin"] };
    registerMailAdminRoutes(strapi, routes, adminOnly);
    routes.push({
      method: "GET",
      path: "/merkdraak-editor/sites",
      handler: async (ctx: { body: unknown }) => {
        const sites = await strapi.documents("api::site.site").findMany({
          status: "published",
          fields: ["name", "key", "domain", "editorUrl"],
          sort: ["name:asc"],
        });
        ctx.body = {
          sites: sites
            .filter((site) => site.key)
            .map((site) => ({
              key: site.key,
              name: site.name,
              domain: site.domain ?? "",
              editorUrl: site.editorUrl ?? "",
            })),
        };
      },
      config: adminOnly,
    });
    routes.push({
      method: "POST",
      path: "/merkdraak-editor/sites",
      handler: async (ctx: { request: { body: Record<string, unknown> }; body: unknown; status: number }) => {
        const body = ctx.request.body ?? {};
        const name = String(body.name ?? "").trim();
        const key = siteKeyFrom(String(body.key ?? "") || name);
        const domain = String(body.domain ?? "")
          .trim()
          .replace(/^https?:\/\//i, "")
          .replace(/\/$/, "");
        if (!name || !key) {
          ctx.status = 400;
          ctx.body = { error: "Vul een naam en een key in." };
          return;
        }
        const existing = await strapi.documents("api::site.site").findFirst({
          filters: { key },
        });
        if (existing) {
          ctx.status = 409;
          ctx.body = { error: "Deze key bestaat al." };
          return;
        }
        const site = await strapi.documents("api::site.site").create({
          data: { name, key, domain },
          status: "published",
        });
        await strapi.documents("api::navigation.navigation").create({
          data: {
            site: site.documentId,
            siteKey: key,
            items: [],
            footerServices: [],
            footerOrganization: [],
          },
          status: "published",
        });
        ctx.body = {
          site: {
            key,
            name: site.name ?? name,
            domain: site.domain ?? domain,
            editorUrl: site.editorUrl ?? "",
          },
        };
      },
      config: adminOnly,
    });
    routes.push({
      method: "GET",
      path: "/merkdraak-editor/pages",
      handler: async (ctx: { query: { siteKey?: string }; body: unknown }) => {
        const siteKey = String(ctx.query.siteKey ?? "");
        const site = await strapi.documents("api::site.site").findFirst({
          filters: { key: siteKey },
          status: "published",
        });
        if (!site) {
          ctx.body = { pages: [] };
          return;
        }
        const pages = await strapi.documents("api::page.page").findMany({
          status: "draft",
          filters: { siteKey, pageType: { $ne: "case" } },
          fields: ["title", "slug", "visibility", "pageType"],
          sort: ["title:asc"],
          pagination: { pageSize: 200 },
        });
        const cases = await strapi.documents("api::case.case").findMany({
          status: "draft",
          filters: { siteKey },
          fields: ["title", "slug", "visibility"],
          sort: ["title:asc"],
          pagination: { pageSize: 200 },
        });
        ctx.body = {
          pages: pages.map((page) => ({
            documentId: page.documentId,
            title: page.title ?? "",
            slug: page.slug ?? "",
            visibility: page.visibility ?? "",
            pageType: page.pageType ?? "",
            kind: "page",
          })),
          cases: cases.map((item) => ({
            documentId: item.documentId,
            title: item.title ?? "",
            slug: item.slug ?? "",
            visibility: item.visibility ?? "",
            pageType: "case",
            kind: "case",
          })),
        };
      },
      config: adminOnly,
    });
    routes.push({
      method: "GET",
      path: "/merkdraak-editor/navigation",
      handler: async (ctx: { query: { siteKey?: string }; body: unknown }) => {
        const siteKey = String(ctx.query.siteKey ?? "");
        const site = await strapi.documents("api::site.site").findFirst({
          filters: { key: siteKey },
          status: "published",
          populate: { favicon: true },
        });
        const navigation = await strapi.documents("api::navigation.navigation").findFirst({
          filters: { siteKey },
          status: "published",
          populate: {
            footerServices: true,
            footerOrganization: true,
            items: {
              on: {
                "nav.link": { populate: { page: { fields: ["entryKey"] } } },
                "nav.dropdown": { populate: { links: { populate: { page: { fields: ["entryKey"] } } } } },
                "nav.mega": {
                  populate: {
                    columns: { populate: { groups: { populate: { links: { populate: { page: { fields: ["entryKey"] } } } } } } },
                    feature: true,
                  },
                },
              },
            },
          },
        });
        ctx.body = {
          documentId: navigation?.documentId ?? null,
          contact: {
            phoneDisplay: site?.phoneDisplay ?? "",
            email: site?.email ?? "",
            address: site?.address ?? "",
            kvk: site?.kvk ?? "",
            btw: site?.btw ?? "",
            hours: site?.hours ?? "",
            footerText: site?.footerText ?? "",
            footerDisclaimer: site?.footerDisclaimer ?? "",
          },
          settings: {
            articlePrefix: site?.articlePrefix || "kennisbank",
            googlePlaceId: site?.googlePlaceId ?? "",
            formWebhook: site?.formWebhook ?? "",
            favicon: mediaFile((site as { favicon?: unknown } | null)?.favicon),
          },
          footerServices: navigation?.footerServices ?? [],
          footerOrganization: navigation?.footerOrganization ?? [],
          items: navigation?.items ?? [],
        };
      },
      config: adminOnly,
    });
    routes.push({
      method: "POST",
      path: "/merkdraak-editor/navigation",
      handler: async (ctx: { request: { body: Record<string, unknown> }; body: unknown; status: number }) => {
        try {
          const raw = ctx.request.body ?? {};
          const body = textOf(asRecord(raw.data).siteKey) || asRecord(raw.data).contact ? asRecord(raw.data) : raw;
          const siteKey = String(body.siteKey ?? "");
          const site = await strapi.documents("api::site.site").findFirst({
            filters: { key: siteKey },
            status: "published",
            populate: { favicon: true },
          });
          if (!site?.documentId) {
            ctx.body = { ok: false, error: "Website niet gevonden." };
            return;
          }
          const contact = asRecord(body.contact);
          const settings = asRecord(body.settings);
          const previousPrefix = site.articlePrefix || "kennisbank";
          const nextPrefix = normalizePrefix(settings.articlePrefix ?? previousPrefix);
          const nextFavicon = Object.prototype.hasOwnProperty.call(settings, "faviconId")
            ? faviconUpdate(settings.faviconId)
            : undefined;
          await strapi.documents("api::site.site").update({
            documentId: site.documentId,
            data: {
              name: site.name ?? undefined,
              key: site.key ?? undefined,
              phoneDisplay: textOf(contact.phoneDisplay ?? site.phoneDisplay),
              email: textOf(contact.email ?? site.email),
              address: textOf(contact.address ?? site.address),
              kvk: textOf(contact.kvk ?? site.kvk),
              btw: textOf(contact.btw ?? site.btw),
              hours: textOf(contact.hours ?? site.hours),
              footerText: textOf(contact.footerText ?? site.footerText),
              footerDisclaimer: textOf(contact.footerDisclaimer ?? site.footerDisclaimer),
              articlePrefix: nextPrefix,
              googlePlaceId: textOf(settings.googlePlaceId ?? site.googlePlaceId).trim(),
              formWebhook: textOf(settings.formWebhook ?? site.formWebhook).trim(),
              ...(nextFavicon !== undefined ? { favicon: nextFavicon } : {}),
            },
            status: "published",
          });
          try {
            await syncArticlePrefix(strapi, siteKey, previousPrefix, nextPrefix);
          } catch (error) {
            strapi.log.error(error);
          }
          const navigation = await strapi.documents("api::navigation.navigation").findFirst({
            filters: { siteKey },
            status: "draft",
          });
          if (navigation?.documentId) {
            try {
              await strapi.documents("api::navigation.navigation").update({
                documentId: navigation.documentId,
                data: {
                  footerServices: footerRows(body.footerServices),
                  footerOrganization: footerRows(body.footerOrganization),
                } as never,
                status: "published",
              });
            } catch (error) {
              strapi.log.error(error);
            }
          }
          ctx.body = { ok: true };
        } catch (error) {
          strapi.log.error(error);
          ctx.body = { ok: false, error: saveError(error) };
        }
      },
      config: adminOnly,
    });
    routes.push({
      method: "GET",
      path: "/merkdraak-editor/open",
      handler: async (ctx: { query: { next?: string; siteKey?: string }; body: unknown }) => {
        const secret = process.env.EDITOR_SECRET;
        const siteKey = String(ctx.query.siteKey ?? "");
        const site = await strapi.documents("api::site.site").findFirst({
          filters: { key: siteKey },
          status: "published",
        });
        const origin = site?.editorUrl;
        const next = typeof ctx.query.next === "string" && ctx.query.next.startsWith("/editor") ? ctx.query.next : "/editor";
        if (!secret || !origin) {
          ctx.body = { url: null };
          return;
        }
        const url = new URL("/api/editor/session", origin);
        url.searchParams.set("token", secret);
        url.searchParams.set("next", next);
        ctx.body = { url: url.toString() };
      },
      config: adminOnly,
    });
  },
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    clearEditorRequiredFieldsCache();
    await ensureEmailSettings(strapi).catch((error: unknown) => {
      strapi.log.error(error);
    });
    await syncEditorUrl(strapi).catch((error: unknown) => {
      strapi.log.error(error);
    });
    const merkdraak = await strapi.documents("api::site.site").findFirst({
      filters: { key: "merkdraak" },
      status: "published",
    });
    if (merkdraak?.documentId && !merkdraak.editorUrl) {
      await strapi.documents("api::site.site").update({
        documentId: merkdraak.documentId,
        data: { editorUrl: "http://localhost:3000" },
        status: "published",
      });
    }
    const url = process.env.REVALIDATE_URL;
    const secret = process.env.REVALIDATE_SECRET;
    if (url && secret) {
      const store = strapi.get("webhookStore") as {
        findWebhooks: () => Promise<{ url: string }[]>;
        createWebhook: (data: {
          name: string;
          url: string;
          headers: Record<string, string>;
          events: string[];
        }) => Promise<unknown>;
      };
      const existing = await store.findWebhooks();
      if (!existing.some((hook) => hook.url === url)) {
        await store.createWebhook({
          name: "frontend-revalidate",
          url,
          headers: { Authorization: `Bearer ${secret}` },
          events,
        });
      }
    }
    if (scheduledTimer) clearInterval(scheduledTimer);
    scheduledTimer = setInterval(() => {
      publishScheduledPages(strapi).catch((error: unknown) => {
        if (error instanceof ReferenceError || error instanceof TypeError) return;
        strapi.log.error(error);
      });
    }, 60_000);
    scheduledTimer.unref();
    void publishScheduledPages(strapi).catch((error: unknown) => {
      if (error instanceof ReferenceError || error instanceof TypeError) return;
      strapi.log.error(error);
    });
    void backfillMenu(strapi).catch((error: unknown) => {
      strapi.log.error(error);
    });
    void syncContactPageBuilder(strapi).catch((error: unknown) => {
      strapi.log.error(error);
    });
    void syncScanRequestForms(strapi).catch((error: unknown) => {
      strapi.log.error(error);
    });
    void syncComposedPages(strapi).catch((error: unknown) => {
      strapi.log.error(error);
    });
  },
  destroy() {
    if (scheduledTimer) {
      clearInterval(scheduledTimer);
      scheduledTimer = undefined;
    }
  },
};

