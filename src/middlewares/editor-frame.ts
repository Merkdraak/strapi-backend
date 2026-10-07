const allowed = new Set(["'self'", "http://localhost:3000", "https://test.merkdraak.nl"]);
let cachedAt = 0;
let origins = [...allowed].join(" ");

function addOrigin(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return;
  try {
    allowed.add(new URL(value.trim()).origin);
  } catch {
    allowed.add(value.trim().replace(/\/$/, ""));
  }
}

async function refreshOrigins() {
  if (Date.now() - cachedAt < 60_000) return;
  try {
    addOrigin(process.env.FRONTEND_URL);
    addOrigin(process.env.EDITOR_PUBLIC_URL);
    const sites = await strapi.documents("api::site.site").findMany({
      status: "published",
      fields: ["editorUrl"],
    });
    for (const site of sites) {
      addOrigin(site.editorUrl);
    }
    origins = [...allowed].join(" ");
    cachedAt = Date.now();
  } catch {
    cachedAt = Date.now();
  }
}

export default () => {
  return async (ctx: { set: (key: string, value: string) => void; response: { get: (key: string) => string } }, next: () => Promise<void>) => {
    await next();
    const current = ctx.response.get("Content-Security-Policy");
    if (!current?.includes("frame-src")) return;
    await refreshOrigins();
    ctx.set(
      "Content-Security-Policy",
      current.replace(/frame-src [^;]*/, `frame-src ${origins}`),
    );
  };
};
