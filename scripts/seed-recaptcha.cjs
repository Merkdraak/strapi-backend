/* One-off: write reCAPTCHA keys into local SQLite Site row. Not for production deploy. */
const path = require("path");
const Database = require("better-sqlite3");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const siteKey = String(process.env.RECAPTCHA_SITE_KEY || "").trim();
const secretKey = String(process.env.RECAPTCHA_SECRET_KEY || "").trim();
if (!siteKey || !secretKey) {
  console.error("Zet RECAPTCHA_SITE_KEY en RECAPTCHA_SECRET_KEY in .env");
  process.exit(1);
}
const dbPath = path.join(__dirname, "..", ".tmp", "data.db");
const db = new Database(dbPath);

const cols = db.prepare("PRAGMA table_info(sites)").all().map((c) => c.name);
const needed = ["recaptcha_site_key", "recaptcha_secret_key", "recaptcha_enabled", "recaptcha_min_score"];
const missing = needed.filter((name) => !cols.includes(name));
if (missing.length) {
  console.error("Kolommen ontbreken nog (Strapi eerst starten zodat schema migreert):", missing.join(", "));
  process.exit(1);
}

const row = db.prepare("SELECT id, document_id, key FROM sites WHERE key = ? LIMIT 1").get("merkdraak");
if (!row) {
  console.error("Site merkdraak niet gevonden.");
  process.exit(1);
}

db.prepare(
  `UPDATE sites SET
    recaptcha_enabled = 1,
    recaptcha_site_key = ?,
    recaptcha_secret_key = ?,
    recaptcha_min_score = COALESCE(recaptcha_min_score, 0.5)
   WHERE id = ?`,
).run(siteKey, secretKey, row.id);

const check = db
  .prepare(
    "SELECT key, recaptcha_enabled, recaptcha_site_key, length(recaptcha_secret_key) AS secret_len, recaptcha_min_score FROM sites WHERE id = ?",
  )
  .get(row.id);

console.log(
  JSON.stringify(
    {
      ok: true,
      key: check.key,
      enabled: check.recaptcha_enabled,
      siteKey: check.recaptcha_site_key,
      secretLen: check.secret_len,
      minScore: check.recaptcha_min_score,
    },
    null,
    2,
  ),
);
db.close();
