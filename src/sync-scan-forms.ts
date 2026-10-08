import type { Core } from "@strapi/strapi";

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
  composed?: boolean | null;
  visibility?: string | null;
  sections?: { __component?: string; scanType?: string }[] | null;
};

function scanSection(page: (typeof pages)[number]) {
  return {
    __component: "sections.scan-request-form",
    scanType: page.scanType,
    heading: page.heading,
    intro: page.intro,
    recipientEmail: "mike@merkdraak.nl",
  };
}

/**
 * Ensure SEO / SEA / CRO pages have an editable scanaanvraag-blok in Strapi.
 */
export async function syncScanRequestForms(strapi: Core.Strapi) {
  const siteKey = "merkdraak";
  for (const target of pages) {
    const page = (await strapi.documents("api::page.page").findFirst({
      filters: { siteKey, entryKey: target.entryKey },
      status: "draft",
      populate: { sections: true },
    })) as PageDraft | null;
    if (!page?.documentId) {
      strapi.log.warn(`syncScanRequestForms: page not found entryKey=${target.entryKey}`);
      continue;
    }

    const sections = Array.isArray(page.sections) ? page.sections : [];
    const hasForm = sections.some((section) => section?.__component === "sections.scan-request-form");
    if (hasForm) {
      strapi.log.info(`syncScanRequestForms: ${target.entryKey} already has scanaanvraag`);
      continue;
    }

    const nextSections = [...sections, scanSection(target)];
    await strapi.documents("api::page.page").update({
      documentId: page.documentId,
      status: "draft",
      data: {
        sections: nextSections as never,
      },
    });

    if (page.visibility === "published" || page.visibility === "concept") {
      await strapi.documents("api::page.page").publish({ documentId: page.documentId });
    }

    strapi.log.info(
      `syncScanRequestForms: ${target.entryKey} documentId=${page.documentId} sections=${nextSections.length}`,
    );
  }
}
