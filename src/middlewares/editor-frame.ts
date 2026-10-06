const allowed = new Set(["'self'", "http://localhost:3000"]);
let cachedAt = 0;
let origins = [...allowed].join(" ");

async function refreshOrigins() {
  if (Date.now() - cachedAt < 60_000) return;
  try {
    const sites = await strapi.documents("api::site.site").findMany({
      status: "published",
      fields: ["editorUrl"],
    });
    for (const site of sites) {
      if (typeof site.editorUrl === "string" && site.editorUrl) allowed.add(site.editorUrl.replace(/\/$/, ""));
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
