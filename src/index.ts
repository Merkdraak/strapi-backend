import type { Core } from "@strapi/strapi";

const events = ["entry.create", "entry.update", "entry.delete", "entry.publish", "entry.unpublish"];

export default {
  register() {},
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
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
