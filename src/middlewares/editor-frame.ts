const allowed = new Set(["'self'", "http://localhost:3000"]);

export default () => {
  return async (ctx: { set: (key: string, value: string) => void; response: { get: (key: string) => string } }, next: () => Promise<void>) => {
    await next();
    const current = ctx.response.get("Content-Security-Policy");
    if (!current?.includes("frame-src")) return;
    let sites: { editorUrl?: string | null }[] = [];
    try {
      sites = await strapi.documents("api::site.site").findMany({
        status: "published",
        fields: ["editorUrl"],
      });
    } catch {
      return;
    }
    for (const site of sites) {
      if (typeof site.editorUrl === "string" && site.editorUrl) allowed.add(site.editorUrl.replace(/\/$/, ""));
    }
    const origins = [...allowed].join(" ");
    ctx.set(
      "Content-Security-Policy",
      current.replace(/frame-src [^;]*/, `frame-src ${origins}`),
    );
  };
};
