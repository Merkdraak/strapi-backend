function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

async function fill(data: Record<string, unknown> | undefined) {
  if (!data) return;
  const siteKey = typeof data.siteKey === "string" ? data.siteKey : "";
  if (!siteKey) return;
  if (!data.entryKey) {
    const source = typeof data.slug === "string" && data.slug ? data.slug : String(data.title ?? "pagina");
    data.entryKey = slugify(source) || `pagina-${Date.now()}`;
  }
  if (!data.scopeKey) data.scopeKey = `${siteKey}:${String(data.entryKey)}`;
  if (!data.site) {
    const site = await strapi.documents("api::site.site").findFirst({
      filters: { key: siteKey },
      status: "published",
    });
    if (site?.documentId) data.site = site.documentId;
  }
  if (!data.navLabel && data.title) data.navLabel = data.title;
  if (!data.seoTitle && data.title) data.seoTitle = data.title;
  if (!data.description) data.description = "";
  if (!data.pageType) data.pageType = "company";
  if (!data.visibility) data.visibility = "planned";
  if (!data.cta) data.cta = "marketingscan";
}

export default {
  async beforeCreate(event: { params: { data?: Record<string, unknown> } }) {
    await fill(event.params.data);
  },
  async beforeUpdate(event: { params: { data?: Record<string, unknown> } }) {
    const data = event.params.data;
    if (!data) return;
    if (data.siteKey === "" || data.entryKey === "" || data.scopeKey === "") await fill(data);
  },
};
