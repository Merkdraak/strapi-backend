import type { Core } from "@strapi/strapi";
import { loadRecaptchaSettings, saveRecaptchaSettings } from "../services/recaptcha";

type AdminCtx = {
  request: { body?: Record<string, unknown> };
  body: unknown;
  status: number;
  badRequest: (message?: string) => unknown;
};

export function registerRecaptchaAdminRoutes(
  strapi: Core.Strapi,
  routes: unknown[],
  adminOnly: { policies: string[] },
) {
  routes.push({
    method: "GET",
    path: "/merkdraak-recaptcha/settings",
    handler: async (ctx: AdminCtx) => {
      const settings = await loadRecaptchaSettings(strapi);
      ctx.body = {
        settings: {
          enabled: settings.enabled,
          cloudProjectId: settings.cloudProjectId,
          siteKey: settings.siteKey,
          secretKey: settings.secretKey,
          minScore: settings.minScore,
        },
        configured: Boolean(settings.siteKey && settings.secretKey),
      };
    },
    config: adminOnly,
  });

  routes.push({
    method: "PUT",
    path: "/merkdraak-recaptcha/settings",
    handler: async (ctx: AdminCtx) => {
      try {
        const settings = await saveRecaptchaSettings(strapi, ctx.request.body ?? {});
        ctx.body = {
          settings,
          configured: Boolean(settings.siteKey && settings.secretKey),
        };
      } catch (error) {
        strapi.log.error(error);
        return ctx.badRequest(error instanceof Error ? error.message : "Opslaan mislukt.");
      }
    },
    config: adminOnly,
  });
}
