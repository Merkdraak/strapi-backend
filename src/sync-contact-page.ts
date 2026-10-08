import type { Core } from "@strapi/strapi";

export const contactFormSection = {
  __component: "sections.contact-form",
  body: "Liever direct contact? Bel of mail. In de e-mail staat je interesse alvast genoemd. Een levertijd van de scan is nog niet bevestigd en staat daarom niet op de site.",
  asideHeading: "Welke scan",
  marketingscanLabel: "Marketingscan",
  marketingscanBody: "Voor zichtbaarheid, campagnes en de samenhang van je marketing.",
  websitescanLabel: "Websitescan",
  websitescanBody: "Voor snelheid, techniek en conversie van de huidige site.",
  disclaimer:
    "Telefoon, adres, KvK en btw komen uit het oorspronkelijke ontwerp en moeten vóór publicatie gecontroleerd worden. Een ander nummer uit het contentplan wordt niet getoond zolang dat niet is bevestigd.",
  showSiteDetails: true,
};

type ContactDraft = {
  documentId?: string;
  composed?: boolean | null;
  visibility?: string | null;
  sections?: { __component?: string }[] | null;
};

/**
 * Contact used to live only in hardcoded frontend UI with zero Strapi sections.
 * Move it onto the same pagebuilder sections path as the rest of the site.
 */
export async function syncContactPageBuilder(strapi: Core.Strapi) {
  const siteKey = "merkdraak";
  const page = (await strapi.documents("api::page.page").findFirst({
    filters: { siteKey, entryKey: "contact" },
    status: "draft",
    populate: { sections: true },
  })) as ContactDraft | null;
  if (!page?.documentId) return;

  const sections = Array.isArray(page.sections) ? page.sections : [];
  const hasForm = sections.some((section) => section?.__component === "sections.contact-form");
  const needsComposed = page.composed !== true;
  if (hasForm && !needsComposed) return;

  const nextSections = hasForm ? sections : [...sections, contactFormSection];
  await strapi.documents("api::page.page").update({
    documentId: page.documentId,
    status: "draft",
    data: {
      composed: true,
      sections: nextSections as never,
    },
  });

  if (page.visibility === "published" || page.visibility === "concept") {
    await strapi.documents("api::page.page").publish({ documentId: page.documentId });
  }

  strapi.log.info(`syncContactPageBuilder: contact documentId=${page.documentId} sections=${nextSections.length} composed=true`);
}
