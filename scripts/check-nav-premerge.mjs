import fs from "node:fs";
import path from "node:path";

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([^#=]+)=(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv(path.resolve("../merkdraak-frontend/.env.local"));
loadEnv(path.resolve(".env"));

const base = (process.env.STRAPI_URL || "http://127.0.0.1:1337").replace(/\/$/, "").replace("localhost", "127.0.0.1");
const token = `${process.env.STRAPI_API_TOKEN ?? ""}${process.env.STRAPI_API_TOKEN_SUFFIX ?? ""}`.trim();
if (!token) {
  console.error("FAIL missing STRAPI_API_TOKEN");
  process.exit(1);
}

const headers = { Authorization: `Bearer ${token}` };

async function getNav() {
  const params = new URLSearchParams();
  params.set("filters[siteKey][$eq]", "merkdraak");
  params.set("status", "published");
  params.set("populate[items][on][nav.link][fields][0]", "label");
  params.set("populate[items][on][nav.link][fields][1]", "href");
  params.set("populate[items][on][nav.link][fields][2]", "placement");
  params.set("populate[items][on][nav.dropdown][populate][links][fields][0]", "label");
  params.set("populate[items][on][nav.dropdown][populate][links][fields][1]", "href");
  params.set("populate[items][on][nav.mega][fields][0]", "label");
  params.set("populate[items][on][nav.mega][fields][1]", "menuId");
  params.set("populate[items][on][nav.mega][populate][columns][populate][groups][populate][links][fields][0]", "label");
  params.set("populate[items][on][nav.mega][populate][columns][populate][groups][populate][links][fields][1]", "href");
  const res = await fetch(`${base}/api/navigations?${params}`, { headers });
  if (!res.ok) throw new Error(`GET navigations ${res.status}`);
  const body = await res.json();
  return body.data?.[0] ?? body.data ?? null;
}

function summarize(entry) {
  const items = entry?.items ?? entry?.attributes?.items ?? [];
  return items.map((item) => ({
    component: item.__component,
    label: item.label,
    href: item.href ?? null,
    placement: item.placement ?? null,
    links: Array.isArray(item.links) ? item.links.length : undefined,
    columns: Array.isArray(item.columns) ? item.columns.length : undefined,
  }));
}

const entry = await getNav();
if (!entry) {
  console.error("FAIL no navigation");
  process.exit(1);
}
const summary = summarize(entry);
console.log("NAV_ITEMS", JSON.stringify(summary, null, 2));
console.log("COUNT", summary.length);
const hasMega = summary.some((item) => item.component === "nav.mega");
const hasCases = summary.some((item) => /case/i.test(String(item.label ?? "")));
console.log("HAS_MEGA", hasMega);
console.log("HAS_CASES_LABEL", hasCases);
process.exit(summary.length ? 0 : 1);
