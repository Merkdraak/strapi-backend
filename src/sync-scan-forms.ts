import type { Core } from "@strapi/strapi";

/** Old hardcoded inbox — empty recipient now means E-mail settings → Standaard ontvanger. */
const LEGACY_FORM_RECIPIENT = "mike@merkdraak.nl";

const pages = [
  {
    entryKey: "seo",
    scanType: "seo" as const,
    heading: "Vraag de SEO-scan aan",
    intro: "Vul het formulier in. We zien meteen dat je aanvraag vanaf de SEO-pagina komt.",
  },
  {
    entryKey: "sea",
    scanType: "sea" as const,
    heading: "Vraag de SEA-scan aan",
    intro: "Vul het formulier in. We zien meteen dat je aanvraag vanaf de SEA-pagina komt.",
  },
  {
    entryKey: "cro",
    scanType: "cro" as const,
    heading: "Vraag de CRO-scan aan",
    intro: "Vul het formulier in. We zien meteen dat je aanvraag vanaf de CRO-pagina komt.",
  },
];

type PageDraft = {
  documentId?: string;
  entryKey?: string | null;
  composed?: boolean | null;
  visibility?: string | null;
  formEmail?: string | null;
  sections?: Record<string, unknown>[] | null;
};

function isLegacyRecipient(value: unknown) {
  return String(value ?? "").trim().toLowerCase() === LEGACY_FORM_RECIPIENT;
}

function clearLegacyFormRecipients(sections: Record<string, unknown>[]) {
  let changed = false;
  const next = sections.map((section) => {
    if (!section || typeof section !== "object") return section;
    const component = String(section.__component ?? "");
    if (
      component !== "sections.scan-request-form" &&
      component !== "sections.vacancy-application-form" &&
      component !== "sections.contact-form"
    ) {
      return section;
    }
    if (!isLegacyRecipient(section.recipientEmail)) return section;
    changed = true;
    return { ...section, recipientEmail: "" };
  });
  return { sections: next, changed };
}

export function scanRequestSection(page: (typeof pages)[number]) {
  return {
    __component: "sections.scan-request-form",
    scanType: page.scanType,
    heading: page.heading,
    intro: page.intro,
    recipientEmail: "",
  };
}

/** Keep the scanaanvraag-blok on SEO / SEA / CRO even when an editor save omits it. */
export function ensureScanRequestSections(entryKey: string, sections: unknown) {
  const target = pages.find((page) => page.entryKey === entryKey);
  if (!target) return sections;
  const list = Array.isArray(sections) ? [...sections] : [];
  const hasForm = list.some(
    (section) =>
      section && typeof section === "object" && (section as { __component?: string }).__component === "sections.scan-request-form",
  );
  if (hasForm) return list;
  return [...list, scanRequestSection(target)];
}

/**
 * Ensure SEO / SEA / CRO pages have an editable scanaanvraag-blok in Strapi,
 * and clear legacy mike@ recipients so E-mail settings control the inbox.
 */
export async function syncScanRequestForms(strapi: Core.Strapi) {
  const siteKey = "merkdraak";
  const drafts = (await strapi.documents("api::page.page").findMany({
    filters: { siteKey },
    status: "draft",
    populate: { sections: true },
    limit: 200,
  })) as PageDraft[];

  for (const page of drafts) {
    if (!page?.documentId) continue;
    const sections = Array.isArray(page.sections) ? page.sections : [];
    const cleared = clearLegacyFormRecipients(sections);
    const entryKey = String(page.entryKey ?? "");
    const target = pages.find((item) => item.entryKey === entryKey);
    const hasScanForm = cleared.sections.some(
      (section) => section && String(section.__component ?? "") === "sections.scan-request-form",
    );
    const needsScanForm = Boolean(target) && !hasScanForm;
    const clearPageFormEmail = isLegacyRecipient(page.formEmail);
    if (!cleared.changed && !needsScanForm && !clearPageFormEmail) continue;

    const nextSections = needsScanForm && target ? [...cleared.sections, scanRequestSection(target)] : cleared.sections;
    await strapi.documents("api::page.page").update({
      documentId: page.documentId,
      status: "draft",
      data: {
        sections: nextSections as never,
        ...(clearPageFormEmail ? { formEmail: "" } : {}),
      },
    });

    if (page.visibility === "published" || page.visibility === "concept") {
      await strapi.documents("api::page.page").publish({ documentId: page.documentId });
    }

    strapi.log.info(
      `syncScanRequestForms: entryKey=${entryKey || "?"} documentId=${page.documentId} clearedLegacy=${cleared.changed || clearPageFormEmail} addedScan=${needsScanForm}`,
    );
  }
}
