import type { Core } from "@strapi/strapi";
import {
  acquireEditorLock,
  adminDisplayName,
  adminUserId,
  heartbeatEditorLock,
  listEditorLocks,
  releaseEditorLock,
} from "../services/editor-locks";

type AdminUser = {
  id?: number | string;
  firstname?: string;
  lastname?: string;
  username?: string;
  email?: string;
};

type AdminCtx = {
  state: { user?: AdminUser };
  query: Record<string, unknown>;
  request: { body?: Record<string, unknown> };
  body: unknown;
  status: number;
  badRequest: (message?: string) => unknown;
};

function clip(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

function requireUser(ctx: AdminCtx) {
  const user = ctx.state.user;
  const userId = adminUserId(user);
  if (!userId) {
    ctx.status = 401;
    ctx.body = { error: "Niet ingelogd." };
    return null;
  }
  return {
    userId,
    userName: adminDisplayName(user),
  };
}

export function registerEditorLockRoutes(
  strapi: Core.Strapi,
  routes: unknown[],
  adminOnly: { policies: string[] },
) {
  routes.push({
    method: "GET",
    path: "/merkdraak-editor/locks",
    handler: async (ctx: AdminCtx) => {
      const siteKey = clip(ctx.query.siteKey, 80);
      if (!siteKey) return ctx.badRequest("siteKey ontbreekt");
      const viewer = requireUser(ctx);
      if (!viewer) return;
      ctx.body = { locks: listEditorLocks(siteKey, viewer.userId) };
    },
    config: adminOnly,
  });

  routes.push({
    method: "POST",
    path: "/merkdraak-editor/lock",
    handler: async (ctx: AdminCtx) => {
      const viewer = requireUser(ctx);
      if (!viewer) return;
      const siteKey = clip(ctx.request.body?.siteKey, 80);
      const documentId = clip(ctx.request.body?.documentId, 120);
      if (!siteKey || !documentId) return ctx.badRequest("siteKey of documentId ontbreekt");
      const result = acquireEditorLock({
        siteKey,
        documentId,
        userId: viewer.userId,
        userName: viewer.userName,
      });
      if (!result.ok) {
        ctx.status = 409;
        ctx.body = {
          ok: false,
          lockedBy: result.lock.userName,
          message: `${result.lock.userName} is hier aan het werk`,
        };
        return;
      }
      ctx.body = {
        ok: true,
        lock: {
          userId: result.lock.userId,
          userName: result.lock.userName,
          mine: true,
        },
      };
    },
    config: adminOnly,
  });

  routes.push({
    method: "POST",
    path: "/merkdraak-editor/lock/heartbeat",
    handler: async (ctx: AdminCtx) => {
      const viewer = requireUser(ctx);
      if (!viewer) return;
      const siteKey = clip(ctx.request.body?.siteKey, 80);
      const documentId = clip(ctx.request.body?.documentId, 120);
      if (!siteKey || !documentId) return ctx.badRequest("siteKey of documentId ontbreekt");
      const result = heartbeatEditorLock({
        siteKey,
        documentId,
        userId: viewer.userId,
        userName: viewer.userName,
      });
      if (!result.ok) {
        ctx.status = 409;
        ctx.body = {
          ok: false,
          lockedBy: result.lock.userName,
          message: `${result.lock.userName} is hier aan het werk`,
        };
        return;
      }
      ctx.body = { ok: true };
    },
    config: adminOnly,
  });

  routes.push({
    method: "POST",
    path: "/merkdraak-editor/lock/release",
    handler: async (ctx: AdminCtx) => {
      const viewer = requireUser(ctx);
      if (!viewer) return;
      const siteKey = clip(ctx.request.body?.siteKey, 80);
      const documentId = clip(ctx.request.body?.documentId, 120);
      if (!siteKey || !documentId) return ctx.badRequest("siteKey of documentId ontbreekt");
      const result = releaseEditorLock({
        siteKey,
        documentId,
        userId: viewer.userId,
      });
      if (!result.ok) {
        ctx.status = 409;
        ctx.body = { ok: false, lockedBy: result.lock.userName };
        return;
      }
      ctx.body = { ok: true, released: result.released };
    },
    config: adminOnly,
  });

  void strapi;
}
