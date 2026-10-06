import type { Core } from "@strapi/strapi";
import { refreshFrontend } from "./refresh-frontend";

let running = false;

type ScheduledUid = "api::page.page" | "api::case.case";

function modelReady(strapi: Core.Strapi, uid: ScheduledUid) {
  try {
    return Boolean(strapi.getModel(uid));
  } catch {
    return false;
  }
}

async function publishDue(strapi: Core.Strapi, uid: ScheduledUid) {
  if (!modelReady(strapi, uid)) return false;
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
    await refreshFrontend();
  } catch (error) {
    if (error instanceof ReferenceError || error instanceof TypeError) return;
    throw error;
  } finally {
    running = false;
  }
}
