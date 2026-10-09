import type { EmailSettings } from "./types";

export type VisitorMailKind = "contact" | "scan";

export type TemplateContext = {
  type: string;
  name: string;
  email: string;
  phone: string;
  companyName?: string;
  companyUrl?: string;
  socialMedia?: string;
  message: string;
  site: string;
  sourcePath: string;
  sourceUrl: string;
  kind?: VisitorMailKind;
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
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const body = paragraphs
    .map((paragraph, index) => {
      const style =
        index === 0
          ? "margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:1.35;font-weight:700;color:#ffffff;"
          : "margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#f1f5f9;";
      return `<p style="${style}">${htmlText(paragraph)}</p>`;
    })
    .join("");
  const host = origin.replace(/^https?:\/\//, "");
  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#070709;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#070709" style="background:#070709;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" bgcolor="#18171c" style="width:100%;max-width:560px;background:#18171c;border-radius:16px;">
          <tr>
            <td align="center" bgcolor="#070709" style="padding:28px 32px 24px;background:#070709;border-bottom:3px solid #e10e12;">
              <a href="${escapeHtml(origin)}" style="text-decoration:none;">
                <img src="${escapeHtml(logo)}" width="210" height="48" alt="${escapeHtml(name)}" style="display:block;margin:0 auto;border:0;outline:none;text-decoration:none;width:210px;height:auto;background:#070709;">
              </a>
            </td>
          </tr>
          <tr>
            <td bgcolor="#18171c" style="padding:32px 32px 8px;background:#18171c;">${body}</td>
          </tr>
          <tr>
            <td bgcolor="#18171c" style="padding:4px 32px 28px;background:#18171c;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#9e9baa;">
                <a href="${escapeHtml(origin)}" style="color:#ff2e1f;text-decoration:none;">${escapeHtml(host)}</a>
              </p>
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
    socialMedia: ctx.socialMedia || "-",
    message: ctx.message,
    site: ctx.site,
    sourcePath: ctx.sourcePath || "-",
    sourceUrl: ctx.sourceUrl || "-",
  };
  return template.replace(
    /\{\{(type|name|email|phone|companyName|companyUrl|socialMedia|message|site|sourcePath|sourceUrl)\}\}/g,
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
    "",
    ctx.socialMedia ? "Social media accounts:" : "",
    ctx.socialMedia ? ctx.socialMedia : "",
    "",
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

function firstName(name: string) {
  const part = name.trim().split(/\s+/)[0];
  return part || "daar";
}

function renderScanVisitor(ctx: TemplateContext) {
  const website = ctx.companyUrl?.trim() || "-";
  const interest = ctx.type.trim() || "-";
  const note = ctx.message.trim() || "-";
  return {
    subject: "Je gratis scan bij Merkdraak is aangevraagd",
    text: [
      `Hoi ${firstName(ctx.name)},`,
      "",
      "Bedankt voor je aanvraag van de gratis scan! We gaan nu voor je aan de slag.",
      "",
      "Een van onze specialisten neemt zo snel mogelijk contact met je op. Daarna maken we de scan en zetten we je grootste groeikansen op een rij. Die bespreken we persoonlijk met je, bij jou op locatie of online.",
      "",
      "Een scan is helemaal vrijblijvend. Wil je daarna met de resultaten aan de slag? Dan helpen we je graag. Liever zelf? Ook prima, dan heb je in elk geval een helder plan.",
      "",
      ["Jouw aanvraag", `Website: ${website}`, `Interesse: ${interest}`, `Opmerking: ${note}`].join("\n"),
      "",
      "Tot snel!",
      "",
      "Met vriendelijke groet,",
      "",
      "Merkdraak",
    ].join("\n"),
  };
}

function renderContactVisitor(ctx: TemplateContext) {
  const note = ctx.message.trim() || "-";
  return {
    subject: "We hebben je contactverzoek ontvangen",
    text: [
      `Hoi ${firstName(ctx.name)},`,
      "",
      "Bedankt voor je bericht! We hebben het goed ontvangen en een van onze drakentemmers pakt het op.",
      "",
      "Je hoort snel van ons. Gaat het om een nieuwe website, meer vindbaarheid of betere campagnes? Dan plannen we graag een kennismaking. Dat kan bij jou op locatie, zodat we je bedrijf echt leren kennen, of online als dat beter uitkomt.",
      "",
      ["Jouw bericht", note].join("\n"),
      "",
      "Tot snel!",
      "",
      "Met vriendelijke groet,",
      "Team Merkdraak",
    ].join("\n"),
  };
}

export function renderVisitorMail(_settings: EmailSettings, ctx: TemplateContext) {
  const mail = ctx.kind === "scan" ? renderScanVisitor(ctx) : renderContactVisitor(ctx);
  return { subject: mail.subject, text: mail.text, html: emailHtml(mail.text, ctx.site) };
}
