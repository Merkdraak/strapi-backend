import type { Core } from "@strapi/strapi";

// Webhook events that refresh the public site when content is saved.
const events = ["entry.create", "entry.update", "entry.delete", "entry.publish", "entry.unpublish"];



export default {
  register({ strapi }: { strapi: Core.Strapi }) {
    const routes = strapi.admin.routes.admin.routes as unknown[];
    const adminOnly = { policies: ["admin::isAuthenticatedAdmin"] };
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
          filters: { siteKey },
          fields: ["title", "slug", "visibility", "pageType"],
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
        const site = await strapi.documents("api::site.site").findFirst({ filters: { key: siteKey }, status: "published" });
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
      handler: async (ctx: { request: { body: Record<string, unknown> }; body: unknown }) => {
        const body = ctx.request.body ?? {};
        const siteKey = String(body.siteKey ?? "");
        const site = await strapi.documents("api::site.site").findFirst({ filters: { key: siteKey }, status: "published" });
        if (!site?.documentId) {
          ctx.body = { ok: false };
          return;
        }
        const contact = (body.contact ?? {}) as { phoneDisplay?: string; email?: string; address?: string };
        await strapi.documents("api::site.site").update({
          documentId: site.documentId,
          data: {
            phoneDisplay: contact.phoneDisplay ?? site.phoneDisplay ?? "",
            email: contact.email ?? site.email ?? "",
            address: contact.address ?? site.address ?? "",
          },
          status: "published",
        });
        const navigation = await strapi.documents("api::navigation.navigation").findFirst({
          filters: { siteKey },
          status: "draft",
        });
        if (navigation?.documentId) {
          await strapi.documents("api::navigation.navigation").update({
            documentId: navigation.documentId,
            data: {
              footerServices: body.footerServices,
              footerOrganization: body.footerOrganization,
              items: body.items,
            } as never,
            status: "published",
          });
        }
        ctx.body = { ok: true };
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
    if (!url || !secret) return;
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
    if (existing.some((hook) => hook.url === url)) return;
    await store.createWebhook({
      name: "frontend-revalidate",
      url,
      headers: { Authorization: `Bearer ${secret}` },
      events,
    });
  },
};

