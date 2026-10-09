import type { EmailSettings } from "./types";

export type TemplateContext = {
  type: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  site: string;
  sourcePath: string;
  sourceUrl: string;
};

function fill(template: string, ctx: TemplateContext) {
  const values: Record<string, string> = {
    type: ctx.type,
    name: ctx.name,
    email: ctx.email,
    phone: ctx.phone || "-",
    message: ctx.message,
    site: ctx.site,
    sourcePath: ctx.sourcePath || "-",
    sourceUrl: ctx.sourceUrl || "-",
  };
  return template.replace(/\{\{(type|name|email|phone|message|site|sourcePath|sourceUrl)\}\}/g, (_, key: string) => values[key] ?? "");
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
  return { subject, text };
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
  return { subject, text };
}
