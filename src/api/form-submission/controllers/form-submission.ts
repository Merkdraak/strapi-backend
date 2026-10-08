import { factories } from "@strapi/strapi";
import fs from "fs";
import path from "path";

const scanRequests = {
  seo: { label: "SEO-scan", pageLabel: "SEO", path: "/online-marketing/seo" },
  sea: { label: "SEA-scan", pageLabel: "SEA", path: "/online-marketing/sea" },
  cro: { label: "CRO-scan", pageLabel: "CRO", path: "/online-marketing/conversieoptimalisatie" },
} as const;

type ScanType = keyof typeof scanRequests;

const hourly = new Map<string, number[]>();

const CV_MAX_BYTES = 5 * 1024 * 1024;
const CV_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const CV_EXT = new Set([".pdf", ".doc", ".docx"]);

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

function validUrl(value: string) {
  const raw = value.trim();
  if (!raw) return true;
  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
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

function truthy(value: unknown) {
  return value === true || value === "true" || value === "1" || value === "on" || value === "ja";
}

type UploadFile = {
  filepath?: string;
  path?: string;
  originalFilename?: string;
  name?: string;
  mimetype?: string;
  type?: string;
  size?: number;
};

function firstFile(value: unknown): UploadFile | null {
  if (!value) return null;
  if (Array.isArray(value)) return (value[0] as UploadFile) ?? null;
  return value as UploadFile;
}

function cvFilePath(file: UploadFile) {
  return String(file.filepath || file.path || "").trim();
}

function cvFileName(file: UploadFile) {
  return String(file.originalFilename || file.name || "cv").trim() || "cv";
}

function cvMime(file: UploadFile) {
  return String(file.mimetype || file.type || "").trim().toLowerCase();
}

function validateCv(file: UploadFile | null, required: boolean) {
  if (!file || !cvFilePath(file)) {
    return required ? "Upload een geldig CV-bestand." : "";
  }
  const size = Number(file.size ?? 0);
  if (!Number.isFinite(size) || size <= 0) return "Upload een geldig CV-bestand.";
  if (size > CV_MAX_BYTES) return "Het bestand is te groot.";
  const mime = cvMime(file);
  const ext = path.extname(cvFileName(file)).toLowerCase();
  if (!CV_MIME.has(mime) || !CV_EXT.has(ext)) return "Upload een geldig CV-bestand.";
  return "";
}

async function sendMail(
  strapi: {
    plugin: (name: string) => {
      service: (name: string) => { send: (payload: Record<string, unknown>) => Promise<unknown> };
    };
  },
  payload: {
    to: string;
    subject: string;
    text: string;
    replyTo?: string;
    attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>;
  },
) {
  if (!payload.to) return;
  await strapi.plugin("email").service("email").send({
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    ...(payload.replyTo ? { replyTo: payload.replyTo } : {}),
    ...(payload.attachments?.length ? { attachments: payload.attachments } : {}),
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
      data: {
        siteKey,
        submissionType: scan ? "scan" : "contact",
        name,
        email,
        phone,
        message,
        interest,
      },
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

  async apply(ctx) {
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
    const motivation = clip(body.motivation ?? body.message, 4000);
    const notes = clip(body.notes, 4000);
    const linkedinUrl = clip(body.linkedinUrl, 500);
    const portfolioUrl = clip(body.portfolioUrl, 500);
    const vacancyTitle = clip(body.vacancyTitle, 200);
    const vacancySlug = clip(body.vacancySlug, 200);
    const pageUrl = clip(body.pageUrl, 500);
    const consentRequired = truthy(body.consentRequired);
    const consent = truthy(body.consent);
    const cvRequired = body.cvRequired == null ? true : truthy(body.cvRequired);
    const sendConfirmation = body.sendConfirmation == null ? true : truthy(body.sendConfirmation);
    const confirmationSubject =
      clip(body.confirmationSubject, 200) ||
      `We hebben je sollicitatie ontvangen${vacancyTitle ? ` — ${vacancyTitle}` : ""}`;
    const confirmationText =
      clip(body.confirmationText, 4000) ||
      `Hallo ${name || "sollicitant"},\n\nBedankt voor je sollicitatie${vacancyTitle ? ` voor ${vacancyTitle}` : ""}. We hebben je gegevens ontvangen en nemen contact met je op.\n\nMet vriendelijke groet,\nMerkdraak`;

    const files = (ctx.request.files ?? {}) as Record<string, unknown>;
    const cvUpload = firstFile(files.cv ?? files.file ?? files.files);
    const cvError = validateCv(cvUpload, cvRequired);
    if (cvError) return ctx.badRequest(cvError);

    if (!siteKey || !name || !motivation || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return ctx.badRequest("Vul naam, een geldig e-mailadres en je motivatie in.");
    }
    if (!validPhone(phone)) {
      return ctx.badRequest("Vul een geldig telefoonnummer in.");
    }
    if (!validUrl(linkedinUrl) || !validUrl(portfolioUrl)) {
      return ctx.badRequest("Vul een geldige URL in.");
    }
    if (consentRequired && !consent) {
      return ctx.badRequest("Dit veld is verplicht.");
    }
    if (!validStarted(body.started)) {
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

    let cvId: number | null = null;
    let cvAttachment: { filename: string; content: Buffer; contentType?: string } | null = null;
    if (cvUpload) {
      try {
        const created = await strapi.plugin("upload").service("upload").upload({
          data: {
            fileInfo: {
              name: cvFileName(cvUpload),
              alternativeText: `CV van ${name}`,
              caption: vacancyTitle ? `Sollicitatie: ${vacancyTitle}` : "Sollicitatie",
            },
          },
          files: cvUpload,
        });
        const file = Array.isArray(created) ? created[0] : created;
        cvId = typeof file?.id === "number" ? file.id : Number(file?.id) || null;
        const diskPath = cvFilePath(cvUpload);
        if (diskPath && fs.existsSync(diskPath)) {
          cvAttachment = {
            filename: cvFileName(cvUpload),
            content: fs.readFileSync(diskPath),
            contentType: cvMime(cvUpload) || undefined,
          };
        }
      } catch (error) {
        strapi.log.warn("application cv upload failed");
        strapi.log.warn(error);
        return ctx.badRequest("Upload een geldig CV-bestand.");
      }
    }

    const messageParts = [motivation];
    if (notes) messageParts.push(`Extra toelichting:\n${notes}`);
    if (linkedinUrl) messageParts.push(`LinkedIn: ${linkedinUrl}`);
    if (portfolioUrl) messageParts.push(`Portfolio: ${portfolioUrl}`);
    if (consentRequired || consent) messageParts.push(`Privacy/toestemming: ${consent ? "Ja" : "Nee"}`);
    const message = messageParts.join("\n\n").slice(0, 4000);

    await strapi.documents("api::form-submission.form-submission").create({
      data: {
        siteKey,
        submissionType: "application",
        name,
        email,
        phone,
        message,
        interest: vacancyTitle || "Sollicitatie",
        vacancyTitle,
        vacancySlug,
        pageUrl,
        linkedinUrl,
        portfolioUrl,
        consent,
        ...(cvId ? { cv: cvId } : {}),
      },
    });

    const staff =
      notifyAddress(body.notifyEmail) ||
      notifyAddress(body.recipientEmail) ||
      notifyAddress(body.to) ||
      notifyAddress(site.email);
    const vacancyLine = vacancyTitle || "onbekende vacature";

    try {
      if (staff) {
        await sendMail(strapi, {
          to: staff,
          subject: `Sollicitatie voor: ${vacancyLine} – ${site.name ?? siteKey}`,
          text: [
            `Sollicitatie voor: ${vacancyLine}`,
            vacancySlug ? `Vacature-slug/id: ${vacancySlug}` : "",
            pageUrl ? `Pagina-URL: ${pageUrl}` : "",
            "",
            `Naam: ${name}`,
            `E-mail: ${email}`,
            `Telefoon: ${phone || "-"}`,
            linkedinUrl ? `LinkedIn: ${linkedinUrl}` : "",
            portfolioUrl ? `Portfolio: ${portfolioUrl}` : "",
            consentRequired || consent ? `Toestemming: ${consent ? "Ja" : "Nee"}` : "",
            cvAttachment ? `CV: bijgevoegd (${cvAttachment.filename})` : cvRequired ? "CV: ontbreekt" : "CV: niet aangeleverd",
            "",
            "Motivatie:",
            motivation,
            notes ? `\nExtra toelichting:\n${notes}` : "",
          ]
            .filter((line) => line !== "")
            .join("\n"),
          replyTo: email,
          attachments: cvAttachment ? [cvAttachment] : undefined,
        });
      }
      if (sendConfirmation) {
        await sendMail(strapi, {
          to: email,
          subject: confirmationSubject.includes("{{vacature}}")
            ? confirmationSubject.split("{{vacature}}").join(vacancyLine)
            : confirmationSubject,
          text: confirmationText
            .split("{{naam}}").join(name)
            .split("{{vacature}}").join(vacancyLine)
            .split("{{site}}").join(String(site.name ?? "Merkdraak")),
        });
      }
    } catch (error) {
      strapi.log.warn("application email failed");
      strapi.log.warn(error);
    }

    ctx.body = { ok: true };
  },
}));
