import type { Core } from "@strapi/strapi";
import {
  allCredentialStatuses,
  credentialStatus,
  loadEmailSettings,
  saveEmailSettings,
  sendTestMail,
} from "../services/email";
import { EMAIL_PROVIDERS } from "../services/email/types";

type AdminCtx = {
  query: Record<string, unknown>;
  params: Record<string, string>;
  request: { body?: Record<string, unknown> };
  body: unknown;
  status: number;
  badRequest: (message?: string) => unknown;
  notFound: (message?: string) => unknown;
};

const requestTypeLabels: Record<string, string> = {
  contact: "Contact",
  seo: "SEO-scan",
  sea: "SEA-scan",
  cro: "CRO-scan",
  general: "Algemene scan",
  social: "Social media scan",
};

function clip(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

function asRequestType(value: unknown) {
  const key = clip(value, 20).toLowerCase();
  return key === "contact" || key === "seo" || key === "sea" || key === "cro" || key === "general" || key === "social"
    ? key
    : "";
}

function asStatus(value: unknown) {
  const key = clip(value, 20).toLowerCase();
  return key === "nieuw" || key === "gelezen" || key === "afgehandeld" ? key : "";
}

function mapRow(row: Record<string, unknown>) {
  const requestType = String(row.requestType ?? "contact");
  return {
    documentId: String(row.documentId ?? ""),
    name: String(row.name ?? ""),
    email: String(row.email ?? ""),
    phone: String(row.phone ?? ""),
    companyName: String(row.companyName ?? ""),
    companyUrl: String(row.companyUrl ?? ""),
    socialMedia: String(row.socialMedia ?? ""),
    message: String(row.message ?? ""),
    interest: String(row.interest ?? ""),
    requestType,
    requestTypeLabel: requestTypeLabels[requestType] ?? requestType,
    sourcePath: String(row.sourcePath ?? ""),
    status: String(row.status ?? "nieuw"),
    teamMailStatus: String(row.teamMailStatus ?? "pending"),
    visitorMailStatus: String(row.visitorMailStatus ?? "pending"),
    mailError: String(row.mailError ?? ""),
    createdAt: String(row.createdAt ?? ""),
    updatedAt: String(row.updatedAt ?? ""),
  };
}

export function registerMailAdminRoutes(
  strapi: Core.Strapi,
  routes: unknown[],
  adminOnly: { policies: string[] },
) {
  routes.push({
    method: "GET",
    path: "/merkdraak-mail/inbox",
    handler: async (ctx: AdminCtx) => {
      const requestType = asRequestType(ctx.query.requestType);
      const status = asStatus(ctx.query.status);
      const page = Math.max(1, Number(ctx.query.page ?? 1) || 1);
      const pageSize = Math.min(50, Math.max(1, Number(ctx.query.pageSize ?? 20) || 20));
      const filters: Record<string, unknown> = {};
      if (requestType) filters.requestType = requestType;
      if (status) filters.status = status;
      const [rows, total, newCount] = await Promise.all([
        strapi.documents("api::form-submission.form-submission").findMany({
          filters,
          sort: ["createdAt:desc"],
          pagination: { page, pageSize },
        }),
        strapi.documents("api::form-submission.form-submission").count({ filters }),
        strapi.documents("api::form-submission.form-submission").count({ filters: { status: "nieuw" } }),
      ]);
      ctx.body = {
        newCount,
        total,
        page,
        pageSize,
        items: rows.map((row) => mapRow(row as unknown as Record<string, unknown>)),
      };
    },
    config: adminOnly,
  });

  routes.push({
    method: "GET",
    path: "/merkdraak-mail/inbox/:documentId",
    handler: async (ctx: AdminCtx) => {
      const documentId = clip(ctx.params.documentId, 120);
      if (!documentId) return ctx.badRequest("documentId ontbreekt");
      const row = await strapi.documents("api::form-submission.form-submission").findOne({ documentId });
      if (!row) return ctx.notFound("Inzending niet gevonden");
      if (row.status === "nieuw") {
        const updated = await strapi.documents("api::form-submission.form-submission").update({
          documentId,
          data: { status: "gelezen" },
        });
        ctx.body = { item: mapRow((updated ?? row) as unknown as Record<string, unknown>) };
        return;
      }
      ctx.body = { item: mapRow(row as unknown as Record<string, unknown>) };
    },
    config: adminOnly,
  });

  routes.push({
    method: "POST",
    path: "/merkdraak-mail/inbox/:documentId/status",
    handler: async (ctx: AdminCtx) => {
      const documentId = clip(ctx.params.documentId, 120);
      const status = asStatus(ctx.request.body?.status);
      if (!documentId || !status) return ctx.badRequest("Ongeldige status");
      const existing = await strapi.documents("api::form-submission.form-submission").findOne({ documentId });
      if (!existing) return ctx.notFound("Inzending niet gevonden");
      const updated = await strapi.documents("api::form-submission.form-submission").update({
        documentId,
        data: { status },
      });
      ctx.body = { item: mapRow((updated ?? existing) as unknown as Record<string, unknown>) };
    },
    config: adminOnly,
  });

  routes.push({
    method: "GET",
    path: "/merkdraak-mail/settings",
    handler: async (ctx: AdminCtx) => {
      const settings = await loadEmailSettings(strapi);
      const credentials = allCredentialStatuses();
      const active = credentialStatus(settings.provider);
      ctx.body = {
        settings,
        providers: EMAIL_PROVIDERS.map((provider) => {
          const item = credentials.find((row) => row.provider === provider)!;
          return {
            id: provider,
            label: item.label,
            configured: item.configured,
            missing: item.missing,
          };
        }),
        activeProvider: {
          id: active.provider,
          label: active.label,
          configured: active.configured,
          missing: active.missing,
          warning: active.configured
            ? ""
            : `${active.label} is nog niet volledig geconfigureerd. Ontbrekende env-vars: ${active.missing.join(", ")}`,
        },
      };
    },
    config: adminOnly,
  });

  routes.push({
    method: "PUT",
    path: "/merkdraak-mail/settings",
    handler: async (ctx: AdminCtx) => {
      const body = ctx.request.body ?? {};
      const provider = clip(body.provider, 20).toLowerCase();
      if (provider && !(EMAIL_PROVIDERS as readonly string[]).includes(provider)) {
        return ctx.badRequest("Ongeldige provider");
      }
      const settings = await saveEmailSettings(strapi, body);
      const active = credentialStatus(settings.provider);
      ctx.body = {
        settings,
        activeProvider: {
          id: active.provider,
          label: active.label,
          configured: active.configured,
          missing: active.missing,
          warning: active.configured
            ? ""
            : `${active.label} is nog niet volledig geconfigureerd. Ontbrekende env-vars: ${active.missing.join(", ")}`,
        },
      };
    },
    config: adminOnly,
  });

  routes.push({
    method: "POST",
    path: "/merkdraak-mail/test",
    handler: async (ctx: AdminCtx) => {
      const to = clip(ctx.request.body?.to, 200);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
        return ctx.badRequest("Vul een geldig e-mailadres in.");
      }
      const result = await sendTestMail(strapi, to);
      if (!result.ok) {
        ctx.status = 400;
        ctx.body = result;
        return;
      }
      ctx.body = result;
    },
    config: adminOnly,
  });
}
