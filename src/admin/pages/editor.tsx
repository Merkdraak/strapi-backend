import { Fragment, useEffect, useState } from "react";
import { useFetchClient } from "@strapi/strapi/admin";

type SiteRow = { key: string; name: string; domain: string; editorUrl: string };
type PageRow = { documentId: string; title: string; slug: string; visibility: string; pageType: string };
type LinkRow = { label?: string; href?: string };
type SiteEditor = {
  contact: { phoneDisplay: string; email: string; address: string };
  footerServices: LinkRow[];
  footerOrganization: LinkRow[];
  items: { __component?: string; label?: string; page?: { entryKey?: string }; links?: { label?: string; page?: { entryKey?: string } }[] }[];
};

const statusLabel: Record<string, string> = {
  planned: "Gepland",
  concept: "Concept",
  published: "Gepubliceerd",
};

const typeLabel: Record<string, string> = {
  home: "Home",
  company: "Bedrijf",
  overview: "Overzicht",
  service: "Dienst",
  case: "Case",
  knowledge: "Kennis",
};

const statusTone: Record<string, { background: string; color: string }> = {
  published: { background: "#eafbe7", color: "#328048" },
  concept: { background: "#fdf4dc", color: "#8c5a00" },
  planned: { background: "#f0f0ff", color: "#4945ff" },
};

const buttonStyle = {
  border: 0,
  borderRadius: 4,
  background: "#4945ff",
  color: "#fff",
  fontWeight: 600,
  padding: "8px 14px",
  cursor: "pointer",
} as const;

const fieldStyle = {
  display: "block",
  width: "100%",
  marginTop: 8,
  padding: "8px 10px",
  borderRadius: 4,
  border: "1px solid #dcdce4",
} as const;

function sectionName(page: PageRow) {
  const first = (page.slug ?? "").split("/").filter(Boolean)[0] ?? "";
  const names: Record<string, string> = {
    "online-marketing": "Online marketing",
    websites: "Websites",
    merk: "Merk en creatie",
    cases: "Cases",
    kennisbank: "Kennisbank",
  };
  if (!first) return "Home";
  if (names[first]) return names[first];
  if (page.pageType === "company") return "Bedrijf";
  if (page.pageType === "case") return "Cases";
  if (page.pageType === "knowledge") return "Kennisbank";
  return "Overig";
}

function groupPages(pages: PageRow[]) {
  const order = ["Home", "Online marketing", "Websites", "Merk en creatie", "Cases", "Kennisbank", "Bedrijf", "Overig"];
  const groups = new Map<string, PageRow[]>();
  for (const page of pages) {
    const name = sectionName(page);
    groups.set(name, [...(groups.get(name) ?? []), page]);
  }
  return order.filter((name) => groups.has(name)).map((name) => ({
    name,
    pages: (groups.get(name) ?? []).slice().sort((a, b) => {
      const depthA = (a.slug ?? "").split("/").filter(Boolean).length;
      const depthB = (b.slug ?? "").split("/").filter(Boolean).length;
      return depthA - depthB || a.title.localeCompare(b.title, "nl");
    }),
  }));
}

const ghostStyle = {
  border: "1px solid #dcdce4",
  borderRadius: 4,
  background: "#fff",
  color: "#32324d",
  fontWeight: 600,
  padding: "8px 14px",
  cursor: "pointer",
} as const;

export default function MerkdraakEditor() {
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [pages, setPages] = useState<PageRow[]>([]);
  const [siteKey, setSiteKey] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [src, setSrc] = useState("");
  const [error, setError] = useState("");
  const [loadingPages, setLoadingPages] = useState(false);
  const [nav, setNav] = useState<SiteEditor | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [closed, setClosed] = useState<Record<string, boolean>>({
    "Online marketing": true,
    Websites: true,
    "Merk en creatie": true,
  });
  const { get, post } = useFetchClient();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSiteKey(params.get("siteKey") ?? "");
    setDocumentId(params.get("documentId") ?? "");
    get("/admin/merkdraak-editor/sites")
      .then((response: { data?: { sites?: SiteRow[] } }) => setSites(response.data?.sites ?? []))
      .catch(() => setError("Websites konden niet worden geladen."));
  }, [get]);

  useEffect(() => {
    if (!siteKey) return;
    setLoadingPages(true);
    get(`/admin/merkdraak-editor/pages?siteKey=${encodeURIComponent(siteKey)}`)
      .then((response: { data?: { pages?: PageRow[] } }) => {
        setPages(response.data?.pages ?? []);
        setError("");
      })
      .catch(() => setError("Pagina's konden niet worden geladen."))
      .finally(() => setLoadingPages(false));
  }, [get, siteKey, documentId]);

  useEffect(() => {
    if (!siteKey || !documentId || documentId === "site") {
      setSrc("");
      return;
    }
    const next = documentId === "nieuw" ? "/editor/nieuw" : `/editor/${documentId}`;
    get(`/admin/merkdraak-editor/open?siteKey=${encodeURIComponent(siteKey)}&next=${encodeURIComponent(next)}`)
      .then((response: { data?: { url?: string } }) => {
        if (!response.data?.url) {
          setError("Deze website heeft geen editor-adres.");
          setSrc("");
          return;
        }
        setError("");
        setSrc(response.data.url);
      })
      .catch(() => setError("De editor kon niet worden geopend."));
  }, [get, siteKey, documentId]);

  useEffect(() => {
    if (documentId !== "site" || !siteKey) return;
    get(`/admin/merkdraak-editor/navigation?siteKey=${encodeURIComponent(siteKey)}`)
      .then((response: { data?: SiteEditor }) => setNav(response.data ?? null))
      .catch(() => setError("De site kon niet worden geladen."));
  }, [documentId, get, siteKey]);

  function remember(nextSite: string, nextDocument: string) {
    const params = new URLSearchParams();
    if (nextSite) params.set("siteKey", nextSite);
    if (nextDocument) params.set("documentId", nextDocument);
    const query = params.toString();
    window.history.replaceState(null, "", query ? `${window.location.pathname}?${query}` : window.location.pathname);
    setSiteKey(nextSite);
    setDocumentId(nextDocument);
    setError("");
  }

  const site = sites.find((item) => item.key === siteKey);

  if (!siteKey) {
    return (
      <div style={{ padding: 32, maxWidth: 960 }}>
        <h1 style={{ margin: 0, fontSize: 28, color: "#32324d" }}>Websites</h1>
        <p style={{ color: "#666687" }}>Kies een website en bewerk de pagina's.</p>
        {error ? <p>{error}</p> : null}
        <div style={{ display: "grid", gap: 16, marginTop: 24 }}>
          {sites.map((item) => (
            <article key={item.key} style={{ border: "1px solid #dcdce4", borderRadius: 8, padding: 20, background: "#fff" }}>
              <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>{item.name}</h2>
              <p style={{ margin: 0, color: "#666687" }}>{item.domain || item.key}</p>
              <div style={{ marginTop: 16 }}>
                <button type="button" style={buttonStyle} onClick={() => remember(item.key, "")} disabled={!item.editorUrl}>
                  Bewerk website
                </button>
                {!item.editorUrl ? <span style={{ marginLeft: 12, color: "#666687" }}>Geen editor-adres</span> : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    );
  }

  if (!documentId) {
    const needle = query.trim().toLowerCase();
    const visible = pages.filter((page) => {
      if (status && page.visibility !== status) return false;
      if (!needle) return true;
      return `${page.title} ${page.slug}`.toLowerCase().includes(needle);
    });
    const counts = {
      "": pages.length,
      published: pages.filter((page) => page.visibility === "published").length,
      concept: pages.filter((page) => page.visibility === "concept").length,
      planned: pages.filter((page) => page.visibility === "planned").length,
    };
    return (
      <div style={{ padding: "28px 40px 56px" }}>
        <button type="button" onClick={() => remember("", "")} style={{ border: 0, background: "transparent", color: "#4945ff", fontWeight: 600, padding: 0, cursor: "pointer" }}>
          ← Alle websites
        </button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, marginTop: 18 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 32, lineHeight: 1.1, color: "#32324d" }}>{site?.name ?? siteKey}</h1>
            <p style={{ margin: "8px 0 0", color: "#666687" }}>
              {site?.domain || siteKey}
              {pages.length ? ` · ${pages.length} pagina's` : ""}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" style={ghostStyle} onClick={() => remember(siteKey, "site")}>
              Menu en footer
            </button>
            <button type="button" style={buttonStyle} onClick={() => remember(siteKey, "nieuw")}>
              Nieuwe pagina
            </button>
          </div>
        </div>
        <section style={{ marginTop: 24, background: "#fff", border: "1px solid #eaeaef", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", padding: 16, borderBottom: "1px solid #eaeaef" }}>
            <input
              aria-label="Zoek pagina"
              placeholder="Zoek op naam of pad"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              style={{ ...fieldStyle, marginTop: 0, flex: "1 1 240px", maxWidth: 360 }}
            />
            <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
              {(["", "published", "concept", "planned"] as const).map((value) => {
                const active = status === value;
                return (
                  <button
                    key={value || "all"}
                    type="button"
                    onClick={() => setStatus(value)}
                    style={{
                      border: active ? "1px solid #4945ff" : "1px solid #dcdce4",
                      borderRadius: 20,
                      background: active ? "#f0f0ff" : "#fff",
                      color: active ? "#271fe0" : "#32324d",
                      fontWeight: 600,
                      padding: "6px 12px",
                      cursor: "pointer",
                    }}
                  >
                    {value ? statusLabel[value] : "Alles"} {counts[value]}
                  </button>
                );
              })}
            </div>
          </div>
          {error && pages.length === 0 ? <p style={{ padding: 16, margin: 0 }}>{error}</p> : null}
          {loadingPages ? <p style={{ padding: 16, margin: 0, color: "#666687" }}>Pagina's laden…</p> : null}
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#666687", fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                <th style={{ width: "38%", padding: "12px 16px", fontWeight: 600 }}>Pagina</th>
                <th style={{ width: "34%", padding: "12px 16px", fontWeight: 600 }}>Pad</th>
                <th style={{ width: "14%", padding: "12px 16px", fontWeight: 600 }}>Soort</th>
                <th style={{ width: "14%", padding: "12px 16px", fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {groupPages(visible).map((group) => {
                const open = needle.length > 0 || !closed[group.name];
                return (
                  <Fragment key={group.name}>
                    <tr>
                      <td colSpan={4} style={{ padding: 0, background: "#f6f6f9", borderTop: "1px solid #eaeaef" }}>
                        <button
                          type="button"
                          aria-expanded={open}
                          onClick={() => setClosed((current) => ({ ...current, [group.name]: open }))}
                          style={{ width: "100%", textAlign: "left", border: 0, background: "transparent", padding: "10px 16px", fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 700, color: "#32324d", cursor: "pointer" }}
                        >
                          {open ? "▾" : "▸"} {group.name} · {group.pages.length}
                        </button>
                      </td>
                    </tr>
                    {open
                      ? group.pages.map((page) => {
                          const tone = statusTone[page.visibility] ?? { background: "#f6f6f9", color: "#32324d" };
                          const depth = Math.max(0, (page.slug ?? "").split("/").filter(Boolean).length - 1);
                          return (
                            <tr
                              key={page.documentId}
                              onClick={() => remember(siteKey, page.documentId)}
                              style={{ cursor: "pointer", borderTop: "1px solid #f0f0f5" }}
                              onMouseEnter={(event) => {
                                event.currentTarget.style.background = "#f6f6f9";
                              }}
                              onMouseLeave={(event) => {
                                event.currentTarget.style.background = "";
                              }}
                            >
                              <td style={{ padding: "14px 16px", paddingLeft: 16 + depth * 18, fontWeight: depth ? 500 : 700, color: "#32324d" }}>{page.title}</td>
                              <td style={{ padding: "14px 16px", color: "#666687" }}>{page.slug ? `/${page.slug}` : "/"}</td>
                              <td style={{ padding: "14px 16px", color: "#666687" }}>{typeLabel[page.pageType] ?? page.pageType}</td>
                              <td style={{ padding: "14px 16px" }}>
                                <span style={{ display: "inline-block", borderRadius: 4, padding: "4px 8px", fontSize: 12, fontWeight: 700, background: tone.background, color: tone.color }}>
                                  {statusLabel[page.visibility] ?? page.visibility}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          {!loadingPages && visible.length === 0 ? (
            <p style={{ margin: 0, padding: 24, color: "#666687" }}>{pages.length ? "Geen pagina's voor deze zoekopdracht." : "Nog geen pagina's."}</p>
          ) : null}
        </section>
      </div>
    );
  }

  if (documentId === "site" && nav) {
    function saveSite() {
      post(`/admin/merkdraak-editor/navigation`, { siteKey, ...nav })
        .then(() => setError(""))
        .catch(() => setError("De site kon niet worden opgeslagen."));
    }
    function links(title: string, rows: LinkRow[], key: "footerServices" | "footerOrganization") {
      return (
        <section style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 18 }}>{title}</h2>
          {rows.map((row, index) => (
            <div key={`${key}-${index}`} style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input style={fieldStyle} aria-label="Label" value={row.label ?? ""} onChange={(event) => {
                const next = [...rows];
                next[index] = { ...row, label: event.target.value };
                setNav({ ...nav, [key]: next });
              }} />
              <input style={fieldStyle} aria-label="Link" value={row.href ?? ""} onChange={(event) => {
                const next = [...rows];
                next[index] = { ...row, href: event.target.value };
                setNav({ ...nav, [key]: next });
              }} />
            </div>
          ))}
        </section>
      );
    }
    return (
      <div style={{ padding: 32, maxWidth: 800 }}>
        <button type="button" style={ghostStyle} onClick={() => remember(siteKey, "")}>Terug naar pagina's</button>
        <h1 style={{ fontSize: 28 }}>Menu en footer</h1>
        <label>Telefoon <input style={fieldStyle} value={nav.contact.phoneDisplay} onChange={(event) => setNav({ ...nav, contact: { ...nav.contact, phoneDisplay: event.target.value } })} /></label>
        <label style={{ display: "block", marginTop: 8 }}>E-mail <input style={fieldStyle} value={nav.contact.email} onChange={(event) => setNav({ ...nav, contact: { ...nav.contact, email: event.target.value } })} /></label>
        <label style={{ display: "block", marginTop: 8 }}>Adres <input style={fieldStyle} value={nav.contact.address} onChange={(event) => setNav({ ...nav, contact: { ...nav.contact, address: event.target.value } })} /></label>
        <section style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 18 }}>Menu</h2>
          {nav.items.map((item, index) => (
            <div key={`${item.label}-${index}`} style={{ marginTop: 8 }}>
              <input style={fieldStyle} aria-label="Menunaam" value={item.label ?? ""} onChange={(event) => {
                const items = [...nav.items];
                items[index] = { ...item, label: event.target.value };
                setNav({ ...nav, items });
              }} />
              {item.__component === "nav.link" ? (
                <input style={{ ...fieldStyle, marginLeft: 8 }} aria-label="Paginasleutel" value={item.page?.entryKey ?? ""} onChange={(event) => {
                  const items = [...nav.items];
                  items[index] = { ...item, page: { entryKey: event.target.value } };
                  setNav({ ...nav, items });
                }} />
              ) : null}
            </div>
          ))}
        </section>
        {links("Footer diensten", nav.footerServices, "footerServices")}
        {links("Footer organisatie", nav.footerOrganization, "footerOrganization")}
        <p style={{ marginTop: 24 }}><button type="button" style={buttonStyle} onClick={saveSite}>Opslaan</button></p>
        {error ? <p>{error}</p> : null}
      </div>
    );
  }

  const page = pages.find((item) => item.documentId === documentId);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 56px)", background: "#fff" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 16px", borderBottom: "1px solid #eaeaef" }}>
        <button type="button" style={{ ...ghostStyle, padding: "6px 12px" }} onClick={() => remember(siteKey, "")}>
          ← Pagina's
        </button>
        <strong style={{ color: "#32324d" }}>{documentId === "nieuw" ? "Nieuwe pagina" : (page?.title ?? "Pagina")}</strong>
        {page?.slug !== undefined ? <span style={{ color: "#666687" }}>{page.slug ? `/${page.slug}` : "/"}</span> : null}
      </div>
      {error && !src ? <p style={{ padding: 24 }}>{error}</p> : null}
      {src ? (
        <iframe title="Bewerk pagina" src={src} style={{ flex: 1, width: "100%", border: 0, background: "#fff" }} />
      ) : (
        <p style={{ padding: 24, color: "#666687" }}>Editor laden…</p>
      )}
    </div>
  );
}
