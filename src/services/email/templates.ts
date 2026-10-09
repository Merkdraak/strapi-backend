import type { EmailSettings } from "./types";

export type TemplateContext = {
  type: string;
  name: string;
  email: string;
  phone: string;
  companyName?: string;
  companyUrl?: string;
  message: string;
  site: string;
  sourcePath: string;
  sourceUrl: string;
};

function publicOrigin() {
  const raw = String(process.env.FRONTEND_URL ?? process.env.EDITOR_PUBLIC_URL ?? "https://test.merkdraak.nl").trim();
  return raw.replace(/\/+$/, "") || "https://test.merkdraak.nl";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function htmlText(value: string) {
  return escapeHtml(value).replace(/\r\n|\r|\n/g, "<br>");
}

export function emailHtml(text: string, siteName: string) {
  const origin = publicOrigin();
  const logo = `${origin}/brand/logo-merkdraak.png`;
  const name = siteName || "Merkdraak";
  const body = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#18171c;">${htmlText(paragraph)}</p>`,
    )
    .join("");
  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;">
          <tr>
            <td style="padding:28px 28px 8px;">${body}</td>
          </tr>
          <tr>
            <td align="center" style="padding:20px 28px 28px;border-top:3px solid #e10e12;">
              <a href="${escapeHtml(origin)}" style="text-decoration:none;">
                <img src="${escapeHtml(logo)}" width="220" height="50" alt="${escapeHtml(name)}" style="display:block;margin:0 auto;border:0;width:220px;max-width:100%;height:auto;">
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function fill(template: string, ctx: TemplateContext) {
  const values: Record<string, string> = {
    type: ctx.type,
    name: ctx.name,
    email: ctx.email,
    phone: ctx.phone || "-",
    companyName: ctx.companyName || "-",
    companyUrl: ctx.companyUrl || "-",
    message: ctx.message,
    site: ctx.site,
    sourcePath: ctx.sourcePath || "-",
    sourceUrl: ctx.sourceUrl || "-",
  };
  return template.replace(
    /\{\{(type|name|email|phone|companyName|companyUrl|message|site|sourcePath|sourceUrl)\}\}/g,
    (_, key: string) => values[key] ?? "",
  );
}

export function renderTeamMail(settings: EmailSettings, ctx: TemplateContext) {
  const subject = fill(settings.teamSubject, ctx);
  const text = [
    fill(settings.teamIntro, ctx),
    "",
    `Type aanvraag: ${ctx.type}`,
    `Bron: ${ctx.sourcePath || "-"}`,
    ctx.sourceUrl ? `Bron-URL: ${ctx.sourceUrl}` : "",
    "",
    ctx.companyName ? `Bedrijfsnaam: ${ctx.companyName}` : "",
    ctx.companyUrl ? `Website: ${ctx.companyUrl}` : "",
    `Naam: ${ctx.name}`,
    `E-mail: ${ctx.email}`,
    `Telefoon: ${ctx.phone || "-"}`,
    "",
    "Bericht:",
    ctx.message,
    "",
    fill(settings.teamOutro, ctx),
  ]
    .filter((line, index, all) => !(line === "" && all[index - 1] === ""))
    .join("\n");
  return { subject, text, html: emailHtml(text, ctx.site) };
}

export function renderVisitorMail(settings: EmailSettings, ctx: TemplateContext) {
  const subject = fill(settings.visitorSubject, ctx);
  const text = [
    `Hallo ${ctx.name},`,
    "",
    fill(settings.visitorIntro, ctx),
    "",
    fill(settings.visitorOutro, ctx),
  ].join("\n");
  return { subject, text, html: emailHtml(text, ctx.site) };
}
