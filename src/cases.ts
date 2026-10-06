type CaseData = Record<string, unknown>;

export const CASE_SLUG_PREFIX = "cases";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function tailOf(slug: string) {
  const parts = slug.split("/").map((part) => part.trim()).filter(Boolean);
  const last = parts[parts.length - 1] ?? "";
  if (parts[0] === CASE_SLUG_PREFIX && parts.length > 1) return last;
  return last;
}

export function applyCaseSlug(data: CaseData) {
  data.composed = true;
  const current = typeof data.slug === "string" ? data.slug : "";
  const fromTitle = slugify(String(data.title ?? "case")) || "case";
  const tail = slugify(tailOf(current) || fromTitle);
  const safeTail = tail && tail !== CASE_SLUG_PREFIX ? tail : fromTitle === CASE_SLUG_PREFIX ? "case" : fromTitle;
  data.slug = `${CASE_SLUG_PREFIX}/${safeTail}`;
}
