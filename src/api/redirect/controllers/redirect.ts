import { factories } from "@strapi/strapi";
import { safeInternalPath } from "../../../knowledge";

export default factories.createCoreController("api::redirect.redirect", ({ strapi }) => ({
  async active(ctx) {
    const siteKey = String(ctx.query.siteKey ?? "");
    if (!siteKey) return ctx.badRequest("siteKey ontbreekt");
    const rows = await strapi.documents("api::redirect.redirect").findMany({
      filters: { siteKey, enabled: true },
      fields: ["fromPath", "toPath", "statusCode"],
      pagination: { pageSize: 500 },
    });
    ctx.body = {
      redirects: rows.flatMap((row) => {
        const fromPath = safeInternalPath(row.fromPath);
        const toPath = safeInternalPath(row.toPath);
        if (!fromPath || !toPath || fromPath === toPath) return [];
        return [{ fromPath, toPath, statusCode: row.statusCode === "302" ? 302 : 301 }];
      }),
    };
  },
}));
