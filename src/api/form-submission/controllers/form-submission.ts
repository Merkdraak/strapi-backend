import { factories } from "@strapi/strapi";

const scanRequests = {
  seo: { label: "SEO-scan", pageLabel: "SEO", path: "/online-marketing/seo" },
  sea: { label: "SEA-scan", pageLabel: "SEA", path: "/online-marketing/sea" },
  cro: { label: "CRO-scan", pageLabel: "CRO", path: "/online-marketing/conversieoptimalisatie" },
} as const;

type ScanType = keyof typeof scanRequests;

function clip(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

function authorized(ctx: { request: { header: { authorization?: string } } }) {
  const secret = process.env.EDITOR_SECRET;
  return Boolean(secret) && ctx.request.header.authorization === `Bearer ${secret}`;
}

function notifyAddress(value: unknown) {
  const email = clip(value, 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "";
  return email;
}

function normalizeScanType(value: unknown): ScanType | null {
  const key = clip(value, 20).toLowerCase();
  return key in scanRequests ? (key as ScanType) : null;
}

function publicOrigin() {
  const raw = String(process.env.FRONTEND_URL ?? process.env.EDITOR_PUBLIC_URL ?? "https://test.merkdraak.nl").trim();
  return raw.replace(/\/+$/, "") || "https://test.merkdraak.nl";
}

export default factories.createCoreController("api::form-submission.form-submission", ({ strapi }) => ({
  async submit(ctx) {
    if (!authorized(ctx)) return ctx.unauthorized();
    const body = (ctx.request.body ?? {}) as Record<string, unknown>;
    const siteKey = clip(body.siteKey, 80);
    const name = clip(body.name, 120);
    const email = clip(body.email, 200);
    const phone = clip(body.phone, 40);
    const message = clip(body.message, 4000);
    const scanType = normalizeScanType(body.scanType);
    const scan = scanType ? scanRequests[scanType] : null;
    // Labels/paths come from the server map when scanType is valid — never trust free-form client copy.
    const interest = scan ? scan.label : clip(body.interest, 120);
    const to = notifyAddress(body.to) || "mike@merkdraak.nl";
    if (!siteKey || !name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return ctx.badRequest("Vul naam, een geldig e-mailadres en een bericht in.");
    }
    if (body.scanType != null && body.scanType !== "" && !scan) {
      return ctx.badRequest("Ongeldig scantype.");
    }
    const site = await strapi.documents("api::site.site").findFirst({
      filters: { key: siteKey },
      status: "published",
    });
    if (!site) return ctx.notFound();
    await strapi.documents("api::form-submission.form-submission").create({
      data: { siteKey, name, email, phone, message, interest },
    });
    const sourceUrl = scan ? `${publicOrigin()}${scan.path}` : "";
    try {
      await strapi.plugin("email").service("email").send({
        to,
        subject: scan ? `Nieuwe aanvraag ${scan.label} – Merkdraak` : interest ? `Contactformulier: ${interest}` : "Nieuw contactformulier",
        text: scan
          ? [
              `Type aanvraag: ${scan.label}`,
              `Pagina: ${scan.pageLabel}`,
              `Bron-URL: ${sourceUrl}`,
              "",
              `Naam: ${name}`,
              `E-mail: ${email}`,
              phone ? `Telefoon: ${phone}` : "",
              "",
              "Bericht:",
              message,
            ]
              .filter(Boolean)
              .join("\n")
          : [
              `Naam: ${name}`,
              `E-mail: ${email}`,
              phone ? `Telefoon: ${phone}` : "",
              interest ? `Interesse: ${interest}` : "",
              "",
              message,
            ]
              .filter(Boolean)
              .join("\n"),
        replyTo: email,
      });
    } catch (error) {
      strapi.log.error(error);
    }
    ctx.body = { ok: true };
  },
}));
