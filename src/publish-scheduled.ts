import type { Core } from "@strapi/strapi";
import { refreshFrontend } from "./refresh-frontend";

let running = false;

type ScheduledUid = "api::page.page" | "api::case.case";

async function publishDue(strapi: Core.Strapi, uid: ScheduledUid) {
  const due = await strapi.documents(uid).findMany({
    status: "draft",
    filters: {
      visibility: "planned",
      publishAt: { $notNull: true, $lte: new Date().toISOString() },
    },
    fields: ["documentId", "siteKey", "slug"],
    pagination: { pageSize: 50 },
  });
  let changed = false;
  for (const item of due) {
    if (!item.documentId) continue;
    await strapi.documents(uid).update({
      documentId: item.documentId,
      data: { visibility: "published" },
      status: "draft",
    });
    await strapi.documents(uid).publish({ documentId: item.documentId });
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
    await refreshFrontend();
  } catch (error) {
    if (error instanceof ReferenceError) return;
    throw error;
  } finally {
    running = false;
  }
}
