import { factories } from "@strapi/strapi";

const scanRequests = {
  seo: { label: "SEO-scan", pageLabel: "SEO", path: "/online-marketing/seo" },
  sea: { label: "SEA-scan", pageLabel: "SEA", path: "/online-marketing/sea" },
  cro: { label: "CRO-scan", pageLabel: "CRO", path: "/online-marketing/conversieoptimalisatie" },
} as const;

type ScanType = keyof typeof scanRequests;

const hourly = new Map<string, number[]>();

function clip(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

function authorized(ctx: { request: { header: { authorization?: string } } }) {
  const secret = process.env.EDITOR_SECRET;
  return Boolean(secret) && ctx.request.header.authorization === `Bearer ${secret}`;
}

function tooMany(key: string) {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const stamps = (hourly.get(key) ?? []).filter((stamp) => now - stamp < windowMs);
  if (stamps.length >= 5) {
    hourly.set(key, stamps);
    return true;
  }
  stamps.push(now);
  hourly.set(key, stamps);
  return false;
}

function clientKey(ip: unknown, forwarded: unknown, email: string) {
  const fromHeader = String(Array.isArray(forwarded) ? forwarded[0] : forwarded ?? "").split(",")[0].trim();
  const resolved = fromHeader || String(ip ?? "unknown");
  return `${resolved}:${email.toLowerCase()}`;
}

function validStarted(value: unknown) {
  const started = Number(value);
  if (!Number.isFinite(started) || started <= 0) return false;
  const wait = Date.now() - started;
  return wait >= 2500 && wait <= 48 * 60 * 60 * 1000;
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

function validPhone(value: string) {
  const phone = value.trim();
  if (!phone) return true;
  if (!/^[+\d(][\d\s()./-]*$/.test(phone)) return false;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return false;
  if (digits.startsWith("06") && digits.length !== 10) return false;
  if (digits.startsWith("316") && digits.length !== 11) return false;
  return true;
}

function toE164(value: string) {
  const raw = value.replace(/[^\d+]/g, "");
  if (raw.startsWith("+") && raw.length >= 11 && raw.length <= 16) return raw;
  if (raw.startsWith("00") && raw.length >= 12) return `+${raw.slice(2)}`;
  if (raw.startsWith("0") && raw.length === 10) return `+31${raw.slice(1)}`;
  return "";
}

function plain(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

async function sendMail(
  strapi: {
    plugin: (name: string) => { service: (name: string) => { send: (payload: Record<string, string>) => Promise<unknown> } };
  },
  payload: { to: string; subject: string; text: string; replyTo?: string },
) {
  if (!payload.to) return;
  await strapi.plugin("email").service("email").send({
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    ...(payload.replyTo ? { replyTo: payload.replyTo } : {}),
  });
}

async function sendSms(to: string, body: string) {
  const sid = String(process.env.TWILIO_ACCOUNT_SID ?? "").trim();
  const token = String(process.env.TWILIO_AUTH_TOKEN ?? "").trim();
  const from = String(process.env.TWILIO_FROM ?? "").trim();
  if (!sid || !token || !from || !to) return;
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body.slice(0, 320) }),
  });
}

export default factories.createCoreController("api::form-submission.form-submission", ({ strapi }) => ({
  async submit(ctx) {
    if (!authorized(ctx)) return ctx.unauthorized();
    const body = (ctx.request.body ?? {}) as Record<string, unknown>;
    if (clip(body.company, 200)) {
      ctx.body = { ok: true };
      return;
    }
    const siteKey = clip(body.siteKey, 80);
    const name = clip(body.name, 120);
    const email = clip(body.email, 200);
    const phone = clip(body.phone, 40);
    const message = clip(body.message, 4000);
    const scanType = normalizeScanType(body.scanType);
    const scan = scanType ? scanRequests[scanType] : null;
    // Labels/paths come from the server map when scanType is valid — never trust free-form client copy.
    const interest = scan ? scan.label : clip(body.interest, 120);
    if (!siteKey || !name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return ctx.badRequest("Vul naam, een geldig e-mailadres en een bericht in.");
    }
    if (body.scanType != null && body.scanType !== "" && !scan) {
      return ctx.badRequest("Ongeldig scantype.");
    }
    if (!validPhone(phone)) {
      return ctx.badRequest("Vul een geldig telefoonnummer in.");
    }
    // Contact forms always send `started`. Scan forms may omit it until the frontend catches up.
    const hasStarted = body.started != null && String(body.started).trim() !== "";
    if ((!scan && !validStarted(body.started)) || (scan && hasStarted && !validStarted(body.started))) {
      return ctx.badRequest("Even geduld. Wacht een paar seconden en verstuur het formulier opnieuw.");
    }
    if (tooMany(clientKey(ctx.request.ip, ctx.request.header["x-forwarded-for"], email))) {
      ctx.status = 429;
      ctx.body = { error: { message: "Je hebt dit formulier te vaak verzonden. Probeer het later opnieuw." } };
      return;
    }
    const site = await strapi.documents("api::site.site").findFirst({
      filters: { key: siteKey },
      status: "published",
    });
    if (!site) return ctx.notFound();
    await strapi.documents("api::form-submission.form-submission").create({
      data: { siteKey, name, email, phone, message, interest },
    });

    const staff =
      notifyAddress(body.notifyEmail) ||
      notifyAddress(body.to) ||
      notifyAddress(site.email);
    const topic = interest || "contact";
    const sourceUrl = scan ? `${publicOrigin()}${scan.path}` : "";
    try {
      if (staff) {
        await sendMail(strapi, {
          to: staff,
          subject: scan
            ? `Nieuwe aanvraag ${scan.label} – ${site.name ?? siteKey}`
            : `Nieuw bericht via ${site.name ?? siteKey}: ${plain(topic)}`,
          text: scan
            ? [
                `Type aanvraag: ${scan.label}`,
                `Pagina: ${scan.pageLabel}`,
                `Bron-URL: ${sourceUrl}`,
                "",
                `Naam: ${name}`,
                `E-mail: ${email}`,
                `Telefoon: ${phone || "-"}`,
                "",
                "Bericht:",
                message,
              ].join("\n")
            : `Naam: ${name}\nE-mail: ${email}\nTelefoon: ${phone || "-"}\nInteresse: ${topic}\n\n${message}`,
          replyTo: email,
        });
      }
      await sendMail(strapi, {
        to: email,
        subject: `We hebben je bericht ontvangen${site.name ? ` — ${site.name}` : ""}`,
        text: `Hallo ${name},\n\nBedankt voor je bericht${interest ? ` over ${interest}` : ""}. We hebben het ontvangen en nemen contact met je op.\n\nMet vriendelijke groet,\n${site.name ?? "Merkdraak"}`,
      });
    } catch (error) {
      strapi.log.warn("form confirmation email failed");
      strapi.log.warn(error);
    }

    const mobile = toE164(phone);
    if (mobile) {
      try {
        await sendSms(
          mobile,
          `Bedankt ${name}, we hebben je bericht ontvangen${site.name ? ` bij ${site.name}` : ""} en nemen contact op.`,
        );
      } catch (error) {
        strapi.log.warn("form confirmation sms failed");
        strapi.log.warn(error);
      }
    }

    ctx.body = { ok: true };
  },
}));
