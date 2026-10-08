import Database from "better-sqlite3";

const db = new Database(".tmp/data.db", { readonly: true });
const row = db
  .prepare("SELECT value FROM strapi_core_store_settings WHERE key = ?")
  .get("strapi_content_types_schema");

const schema = JSON.parse(row.value);
const keys = Object.keys(schema);
console.log("top keys:", keys.slice(0, 15));

const page = schema["api::page.page"];
const caseType = schema["api::case.case"];
const pageComps = page?.attributes?.sections?.components ?? [];
const caseComps = caseType?.attributes?.sections?.components ?? [];

console.log("page has map-embed:", pageComps.includes("sections.map-embed"));
console.log("case has map-embed:", caseComps.includes("sections.map-embed"));
console.log(
  "page location-ish:",
  pageComps.filter((item) => /location|map|document|vacanc/.test(item)),
);
console.log(
  "case location-ish:",
  caseComps.filter((item) => /location|map|document|vacanc/.test(item)),
);

const componentRow = db
  .prepare("SELECT key FROM strapi_core_store_settings WHERE key LIKE ? OR value LIKE ? LIMIT 20")
  .all("%map-embed%", "%map-embed%");
console.log("store keys mentioning map-embed:", componentRow);

const comps = db
  .prepare(
    "SELECT key FROM strapi_core_store_settings WHERE key LIKE 'plugin_content_manager_configuration_components::sections.%'",
  )
  .all()
  .map((item) => item.key.replace("plugin_content_manager_configuration_components::", ""));
console.log(
  "cm components location-ish:",
  comps.filter((item) => /location|map|document/.test(item)),
);
