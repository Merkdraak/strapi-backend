import { factories } from "@strapi/strapi";

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

function notifyAddress(value: string) {
  const email = value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "";
  return email;
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

async function sendMail(strapi: { plugin: (name: string) => { service: (name: string) => { send: (payload: Record<string, string>) => Promise<unknown> } } }, payload: { to: string; subject: string; text: string }) {
  if (!payload.to) return;
  await strapi.plugin("email").service("email").send({
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
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
    const interest = clip(body.interest, 120);
    if (!siteKey || !name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return ctx.badRequest("Vul naam, een geldig e-mailadres en een bericht in.");
    }
    if (!validStarted(body.started)) {
      return ctx.badRequest("Het formulier kon niet worden verzonden. Probeer het opnieuw.");
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

    const staff = notifyAddress(String(body.notifyEmail ?? "")) || notifyAddress(String(site.email ?? ""));
    const topic = interest || "contact";
    try {
      if (staff) {
        await sendMail(strapi, {
          to: staff,
          subject: `Nieuw bericht via ${site.name ?? siteKey}: ${plain(topic)}`,
          text: `Naam: ${name}\nE-mail: ${email}\nTelefoon: ${phone || "-"}\nInteresse: ${topic}\n\n${message}`,
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
