import type { Core } from "@strapi/strapi";

let running = false;

type ScheduledUid = "api::page.page" | "api::case.case";

async function publishDue(strapi: Core.Strapi, uid: ScheduledUid) {
  const due = await strapi.db.query(uid).findMany({
    where: {
      visibility: "planned",
      publishAt: { $notNull: true, $lte: new Date() },
    },
    limit: 50,
  });
  let changed = false;
  for (const item of due) {
    const documentId = (item as { documentId?: string }).documentId;
    if (!documentId) continue;
    await strapi.documents(uid).update({
      documentId,
      data: { visibility: "published" },
      status: "draft",
    });
    await strapi.documents(uid).publish({ documentId });
    changed = true;
  }
  return changed;
}

export async function publishScheduledPages(strapi: Core.Strapi) {
  if (running) return;
  running = true;
  try {
    const pagesChanged = await publishDue(strapi, "api::page.page");
    const casesChanged = await publishDue(strapi, "api::case.case");
    if (!pagesChanged && !casesChanged) return;
    const url = process.env.REVALIDATE_URL;
    const secret = process.env.REVALIDATE_SECRET;
    if (!url || !secret) return;
    await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: pagesChanged && casesChanged ? "page" : casesChanged ? "case" : "page" }),
    });
  } catch (error) {
    if (error instanceof ReferenceError) return;
    throw error;
  } finally {
    running = false;
  }
}
