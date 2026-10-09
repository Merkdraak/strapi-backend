export type EditorErrorBody = {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, unknown>;
};

export type EditorSaveBody = {
  ok: boolean;
  success: boolean;
  draftSaved: boolean;
  published: boolean;
  unpublished: boolean;
  documentId?: string;
  error?: EditorErrorBody;
  warning?: EditorErrorBody;
};

export class EditorSaveError extends Error {
  status: number;
  code: string;
  field?: string;
  details?: Record<string, unknown>;

  constructor(status: number, code: string, message: string, extra?: { field?: string; details?: Record<string, unknown> }) {
    super(message);
    this.name = "EditorSaveError";
    this.status = status;
    this.code = code;
    this.field = extra?.field;
    this.details = extra?.details;
  }
}

const blockLabel: Record<string, string> = {
  "sections.process": "Werkwijze",
  "sections.hero": "Hero",
  "sections.client-logos": "Klanten",
  "sections.service-cards": "Diensten",
  "sections.results": "Resultaten",
  "sections.case-grid": "Cases",
  "sections.testimonial": "Citaat",
  "sections.why-us": "WaaromWij",
  "sections.team": "Team",
  "sections.contact-cta": "Contact",
  "sections.contact-form": "Contactformulier",
  "sections.scan-request-form": "Scanaanvraag",
  "sections.vacancy-application-form": "Vacatureformulier",
  "sections.notice": "Mededeling",
  "sections.prose": "Tekst",
  "sections.bullet-list": "Lijst",
  "sections.numbered-steps": "Stappen",
  "sections.faq": "Vragen",
  "sections.price-factors": "Prijsfactoren",
  "sections.case-story": "Caseverhaal",
  "sections.page-index": "Paginaoverzicht",
  "sections.link-list": "Links",
  "sections.row": "Rij",
  "sections.image-slider": "Slider",
  "sections.video": "Video",
  "sections.image": "Afbeelding",
  "sections.heading": "Kop",
  "sections.button": "Knop",
  "sections.divider": "Scheiding",
  "sections.split": "TekstMetBeeld",
  "sections.takeaways": "Kernpunten",
  "sections.table": "Tabel",
  "sections.columns": "TweeKolommen",
  "sections.cards": "Kaarten",
  "sections.vacancies": "Vacatures",
  "sections.spacer": "Afstand",
  "sections.accordion": "Uitklap",
  "sections.expert": "Expert",
  "sections.sources": "Bronnen",
  "sections.gallery": "Galerij",
  "sections.before-after": "VoorNa",
  "sections.reviews": "Reviews",
  "sections.location": "Locatie",
  "sections.map-embed": "Kaart",
  "sections.document": "Document",
  "sections.button-row": "Knoppen",
};

export function errorPayload(error: EditorSaveError): EditorErrorBody {
  return {
    code: error.code,
    message: error.message,
    ...(error.field ? { field: error.field } : {}),
    ...(error.details ? { details: error.details } : {}),
  };
}

export function saveResponse(partial: Partial<EditorSaveBody> & { success: boolean }): EditorSaveBody {
  return {
    ok: partial.ok ?? partial.success,
    success: partial.success,
    draftSaved: Boolean(partial.draftSaved),
    published: Boolean(partial.published),
    unpublished: Boolean(partial.unpublished),
    ...(partial.documentId ? { documentId: partial.documentId } : {}),
    ...(partial.error ? { error: partial.error } : {}),
    ...(partial.warning ? { warning: partial.warning } : {}),
  };
}

export function safeErrorText(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message;
  if (typeof value === "object" && "message" in value && typeof value.message === "string") return value.message;
  return "";
}

function collectStrings(value: unknown, into: string[]) {
  if (!value) return;
  if (typeof value === "string") {
    into.push(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, into));
    return;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.message === "string") into.push(record.message);
    if (typeof record.path === "string") into.push(record.path);
    if (Array.isArray(record.path)) into.push(record.path.map(String).join("."));
    Object.values(record).forEach((item) => {
      if (item && typeof item === "object") collectStrings(item, into);
    });
  }
}

export function isUniqueScopeKeyError(error: unknown) {
  const chunks: string[] = [];
  collectStrings(error, chunks);
  if (error && typeof error === "object") {
    try {
      chunks.push(JSON.stringify(error));
    } catch {
      /* ignore circular */
    }
  }
  const text = chunks.join(" ").toLowerCase().replace(/_/g, "");
  const unique = /unique|duplicate|constraint/.test(text);
  if (!unique) return false;
  if (text.includes("scopekey")) return true;
  return /unique constraint failed/.test(text) && (text.includes("pages") || text.includes("cases"));
}

export function isValidationError(error: unknown) {
  const name = error && typeof error === "object" && "name" in error ? String((error as { name?: string }).name) : "";
  return /validation/i.test(name) || /yup/i.test(name);
}

function pathFromError(error: unknown): string {
  const chunks: string[] = [];
  const visit = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.path)) chunks.push(record.path.map(String).join("."));
    else if (typeof record.path === "string") chunks.push(record.path);
    if (typeof record.name === "string" && record.name.includes(".")) chunks.push(record.name);
    Object.values(record).forEach((item) => {
      if (item && typeof item === "object") visit(item);
    });
  };
  visit(error);
  return chunks.find((item) => item.includes("sections") || item.includes("scopeKey") || item) ?? "";
}

function sectionIndex(path: string) {
  const match = path.match(/sections(?:\.|\[)(\d+)/);
  return match ? Number(match[1]) : -1;
}

function componentFromErrorText(text: string) {
  const match =
    text.match(/sections\.[a-z0-9-]+/i) ||
    text.match(/component[`'"\s:]+(sections\.[a-z0-9-]+)/i) ||
    text.match(/['"](sections\.[a-z0-9-]+)['"]/i);
  return match ? String(match[1] ?? match[0]).toLowerCase() : "";
}

export function fromStrapiError(error: unknown, sections: unknown): EditorSaveError {
  if (error instanceof EditorSaveError) return error;
  if (isUniqueScopeKeyError(error)) {
    return new EditorSaveError(409, "DUPLICATE_SCOPE_KEY", "Er bestaat al een pagina met dezelfde sleutel.", {
      field: "scopeKey",
    });
  }
  const chunks: string[] = [];
  collectStrings(error, chunks);
  const raw = `${safeErrorText(error)} ${chunks.join(" ")} ${JSON.stringify(error && typeof error === "object" ? { name: (error as { name?: string }).name, message: (error as { message?: string }).message } : {})}`;
  if (/foreign key/i.test(raw)) {
    return new EditorSaveError(400, "VALIDATION_ERROR", "De pagina kon niet aan de website worden gekoppeld. Probeer opnieuw op te slaan.");
  }

  const path = pathFromError(error);
  const index = sectionIndex(path);
  if (index >= 0 && Array.isArray(sections)) {
    const section = sections[index] as { __component?: string } | undefined;
    const component = String(section?.__component ?? "");
    const label = blockLabel[component] || component || "onbekend blok";
    const field = path.replace(/^sections(?:\.|\[)\d+\]?\.?/, "") || undefined;
    const fieldHint =
      field && /initials/i.test(field)
        ? " Vul initialen in voor elk teamlid (of laat de naam staan zodat die automatisch worden afgeleid)."
        : field
          ? ` Controleer het veld '${field}'.`
          : "";
    return new EditorSaveError(400, "INVALID_BLOCK", `Het blok '${label}' bevat ongeldige gegevens.${fieldHint}`, {
      field,
      details: {
        blockType: component,
        blockIndex: index,
        field,
      },
    });
  }

  const badComponent = componentFromErrorText(raw);
  if (badComponent && (/not (allowed|valid|found)|unknown component|invalid component|does not exist|cannot be used/i.test(raw) || blockLabel[badComponent])) {
    const label = blockLabel[badComponent] || badComponent;
    return new EditorSaveError(400, "INVALID_BLOCK", `Het blok '${label}' is niet toegestaan op dit type pagina.`, {
      details: { blockType: badComponent },
    });
  }

  if (isValidationError(error) || path) {
    const field = path && !path.startsWith("sections") ? path.split(".")[0] : undefined;
    return new EditorSaveError(400, "VALIDATION_ERROR", "De pagina bevat ongeldige gegevens. Controleer de gemarkeerde velden.", {
      field,
      details: field ? { field } : undefined,
    });
  }

  const name = error && typeof error === "object" && "name" in error ? String((error as { name?: string }).name) : "";
  if (/forbidden|unauthorized|policy/i.test(name)) {
    return new EditorSaveError(403, "FORBIDDEN", "Je hebt onvoldoende rechten om deze pagina op te slaan.");
  }
  if (/notfound|not found/i.test(name) || /not found/i.test(safeErrorText(error))) {
    return new EditorSaveError(404, "NOT_FOUND", "Deze pagina bestaat niet meer.");
  }

  return new EditorSaveError(500, "UNKNOWN_ERROR", "Opslaan is mislukt door een onverwachte fout.");
}

export function isBenignUnpublish(error: unknown) {
  const text = safeErrorText(error).toLowerCase();
  return /not published|is unpublished|hasn't been published|has not been published|already unpublished/.test(text);
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}
