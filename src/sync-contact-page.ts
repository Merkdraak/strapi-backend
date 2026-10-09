import type { Core } from "@strapi/strapi";

export const contactCopy = {
  body: "Liever direct contact? Bel of mail. In de e-mail staat je interesse alvast genoemd. Een levertijd van de scan is nog niet bevestigd en staat daarom niet op de site.",
  asideHeading: "Welke scan",
  marketingscanLabel: "Marketingscan",
  marketingscanBody: "Voor zichtbaarheid, campagnes en de samenhang van je marketing.",
  websitescanLabel: "Websitescan",
  websitescanBody: "Voor snelheid, techniek en conversie van de huidige site.",
};

const staleDisclaimer =
  "Telefoon, adres, KvK en btw komen uit het oorspronkelijke ontwerp en moeten vóór publicatie gecontroleerd worden. Een ander nummer uit het contentplan wordt niet getoond zolang dat niet is bevestigd.";

export const officeContact = {
  officePhone: "+31 (0)970 102 500 20",
  officeEmail: "mike@merkdraak.nl",
  officeAddress: "Nieuwland Parc 200, 2952 DC Alblasserdam",
  officeKvk: "42134331",
  officeBtw: "NL869875334B01",
};

const copyKeys = Object.keys(contactCopy) as (keyof typeof contactCopy)[];
const officeKeys = Object.keys(officeContact) as (keyof typeof officeContact)[];

export const contactFormSection = {
  __component: "sections.contact-form",
  ...contactCopy,
  showSiteDetails: true,
  ...officeContact,
};

type ContactSection = {
  id?: number;
  __component?: string;
  disclaimer?: string | null;
  showSiteDetails?: boolean | null;
} & Partial<Record<keyof typeof contactCopy | keyof typeof officeContact, string | null>>;

type ContactDraft = {
  documentId?: string;
  composed?: boolean | null;
  visibility?: string | null;
  sections?: ContactSection[] | null;
};

function copyMissing(section: ContactSection) {
  return copyKeys.every((key) => !String(section[key] ?? "").trim());
}

function officeMissing(section: ContactSection) {
  return officeKeys.every((key) => !String(section[key] ?? "").trim());
}

/**
 * Contact used to live only in hardcoded frontend UI with zero Strapi sections.
 * Move it onto the same pagebuilder sections path as the rest of the site,
 * and put the original contact copy back when those text fields are empty.
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
  const form = sections.find((section) => section?.__component === "sections.contact-form");
  const needsComposed = page.composed !== true;
  const needsCopy = !form || copyMissing(form);
  const needsOffice = !form || officeMissing(form);
  const staleNotice = form?.disclaimer === staleDisclaimer;

  if (!needsCopy && !needsOffice && !needsComposed && !staleNotice) return;

  if (form?.id && (copyMissing(form) || officeMissing(form) || staleNotice)) {
    await strapi.db.query("sections.contact-form").update({
      where: { id: form.id },
      data: {
        ...(copyMissing(form) ? contactCopy : {}),
        ...(officeMissing(form) ? officeContact : {}),
        ...(staleNotice ? { disclaimer: "" } : {}),
        showSiteDetails: form.showSiteDetails == null ? true : form.showSiteDetails,
      },
    });
  }

  if (!form || needsComposed) {
    await strapi.documents("api::page.page").update({
      documentId: page.documentId,
      status: "draft",
      data: {
        composed: true,
        ...(form ? {} : { sections: [...sections, contactFormSection] as never }),
      },
    });
  }

  if (page.visibility === "published" || page.visibility === "concept") {
    await strapi.documents("api::page.page").publish({ documentId: page.documentId });
  }

  strapi.log.info(`syncContactPageBuilder: contact documentId=${page.documentId} composed=true copy=${needsCopy ? "restored" : "kept"}`);
}
