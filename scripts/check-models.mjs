import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const db = new Database(".tmp/data.db", { readonly: true });
const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
  .all()
  .map((row) => row.name);

const interesting = tables.filter(
  (name) =>
    /component|map_embed|map-embed|core_store|components_sections/i.test(name),
);
console.log("interesting tables:\n" + interesting.join("\n"));

for (const name of interesting) {
  if (/map/i.test(name)) {
    const count = db.prepare(`SELECT COUNT(*) AS c FROM "${name}"`).get();
    console.log(`rows ${name}:`, count.c);
  }
}

const store = tables.find((name) => /core_store/i.test(name));
if (store) {
  const rows = db
    .prepare(`SELECT key, length(value) AS len FROM "${store}" WHERE key LIKE '%component%' OR value LIKE '%map-embed%' LIMIT 30`)
    .all();
  console.log("store hits:", rows);
}

const schema = JSON.parse(
  fs.readFileSync("src/api/page/content-types/page/schema.json", "utf8"),
);
console.log(
  "schema has map-embed:",
  schema.attributes.sections.components.includes("sections.map-embed"),
);

const types = fs.readFileSync("types/generated/contentTypes.d.ts", "utf8");
console.log("types has map-embed:", types.includes("sections.map-embed"));

const sectionsDir = "src/components/sections";
const files = fs.readdirSync(sectionsDir).filter((f) => f.endsWith(".json"));
console.log(
  "section files:",
  files.filter((f) => /map|embed|location|contact/i.test(f)).join(", "),
);
