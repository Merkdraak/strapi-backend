import type { Core } from "@strapi/strapi";

const APPLY_LABEL = /solliciteren/i;

const applicationFormSection = {
  __component: "sections.application-form",
  heading: "Solliciteer",
  headingLevel: "h2",
  fontWeight: "extrabold",
  intro: "Vul het formulier in. Je solliciteert automatisch voor deze vacature.",
  submitLabel: "Solliciteer",
  pendingLabel: "Verzenden…",
  thanks: "Bedankt. We hebben je sollicitatie ontvangen en nemen contact met je op.",
  errorMessage: "Vul de verplichte velden correct in.",
  recipientEmail: "mike@merkdraak.nl",
  sendConfirmation: true,
  confirmationSubject: "We hebben je sollicitatie ontvangen",
  confirmationText:
    "Hallo {{naam}},\n\nBedankt voor je sollicitatie voor {{vacature}}. We hebben je gegevens ontvangen en nemen contact met je op.\n\nMet vriendelijke groet,\n{{site}}",
  formWidth: "wide",
  appearance: "dark",
  align: "left",
  fields: [
    {
      label: "Naam",
      fieldType: "text",
      placeholder: "Je volledige naam",
      required: true,
      enabled: true,
      role: "name",
      autocomplete: "name",
    },
    {
      label: "E-mailadres",
      fieldType: "email",
      placeholder: "naam@bedrijf.nl",
      required: true,
      enabled: true,
      role: "email",
      autocomplete: "email",
    },
    {
      label: "Telefoonnummer",
      fieldType: "phone",
      placeholder: "06 12345678",
      required: false,
      enabled: true,
      role: "phone",
      autocomplete: "tel",
    },
    {
      label: "Motivatie",
      fieldType: "textarea",
      placeholder: "Waarom past deze vacature bij jou?",
      required: true,
      enabled: true,
      role: "motivation",
    },
    {
      label: "CV",
      fieldType: "file",
      required: true,
      enabled: true,
      role: "cv",
      helper: "PDF, DOC of DOCX. Maximaal 5 MB.",
    },
    {
      label: "LinkedIn URL",
      fieldType: "url",
      placeholder: "https://www.linkedin.com/in/...",
      required: false,
      enabled: false,
      role: "linkedin",
      autocomplete: "url",
    },
    {
      label: "Portfolio URL",
      fieldType: "url",
      placeholder: "https://...",
      required: false,
      enabled: false,
      role: "portfolio",
      autocomplete: "url",
    },
    {
      label: "Extra toelichting",
      fieldType: "textarea",
      placeholder: "Optionele toelichting",
      required: false,
      enabled: false,
      role: "notes",
    },
    {
      label: "Ik ga akkoord met de verwerking van mijn gegevens voor deze sollicitatie",
      fieldType: "checkbox",
      required: true,
      enabled: false,
      role: "consent",
    },
  ],
};

type Section = {
  __component?: string;
  primaryLabel?: string | null;
  primaryHref?: string | null;
  showPrimary?: boolean | string | null;
  [key: string]: unknown;
};

type PageDraft = {
  documentId?: string;
  title?: string | null;
  slug?: string | null;
  visibility?: string | null;
  sections?: Section[] | null;
};

function isApplyHero(section: Section) {
  if (section.__component !== "sections.hero") return false;
  return APPLY_LABEL.test(String(section.primaryLabel ?? ""));
}

function withoutApplyButton(section: Section): Section {
  return {
    ...section,
    primaryLabel: "",
    primaryHref: "",
    showPrimary: false,
  };
}

function withApplicationForm(sections: Section[]) {
  const next = sections.map((section) => (isApplyHero(section) ? withoutApplyButton(section) : { ...section }));
  if (next.some((section) => section.__component === "sections.application-form")) return next;

  const heroIndex = next.findIndex((section) => section.__component === "sections.hero");
  const insertAt = heroIndex >= 0 ? heroIndex + 1 : 0;
  next.splice(insertAt, 0, { ...applicationFormSection });
  return next;
}

/**
 * Replace vacancy “Direct solliciteren” hero CTAs with the Sollicitatieformulier
 * pagebuilder block, inserted directly under the hero.
 */
export async function syncVacancyApplicationForms(strapi: Core.Strapi) {
  const siteKey = "merkdraak";
  const pages = (await strapi.documents("api::page.page").findMany({
    filters: { siteKey },
    status: "draft",
    populate: { sections: { populate: "*" } },
    pagination: { pageSize: 200 },
  })) as PageDraft[];

  for (const page of pages) {
    if (!page?.documentId) continue;
    const sections = Array.isArray(page.sections) ? page.sections : [];
    if (!sections.some(isApplyHero)) continue;

    const nextSections = withApplicationForm(sections);

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

    strapi.log.info(
      `syncVacancyApplicationForms: ${page.slug ?? page.title ?? page.documentId} → Sollicitatieformulier na hero`,
    );
  }
}
