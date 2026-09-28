import type { Core } from "@strapi/strapi";

let running = false;

export async function publishScheduledPages(strapi: Core.Strapi) {
  if (running) return;
  running = true;
  try {
    const due = await strapi.documents("api::page.page").findMany({
      status: "draft",
      filters: {
        visibility: "planned",
        publishAt: { $notNull: true, $lte: new Date().toISOString() },
      },
      fields: ["documentId", "siteKey", "slug"],
      pagination: { pageSize: 50 },
    });
    let changed = false;
    for (const page of due) {
      if (!page.documentId) continue;
      await strapi.documents("api::page.page").update({
        documentId: page.documentId,
        data: { visibility: "published" },
        status: "draft",
      });
      await strapi.documents("api::page.page").publish({ documentId: page.documentId });
      changed = true;
    }
    if (!changed) return;
    const url = process.env.REVALIDATE_URL;
    const secret = process.env.REVALIDATE_SECRET;
    if (!url || !secret) return;
    await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "page" }),
    });
  } finally {
    running = false;
  }
}
