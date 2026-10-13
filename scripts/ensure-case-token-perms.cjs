/**
 * Ensures the merkdraak-frontend API token can read cases (find/findOne).
 * Safe to re-run. Does not print access keys.
 */
const { createStrapi, compileStrapi } = require("@strapi/strapi");

const REQUIRED = [
  "api::page.page.find",
  "api::page.page.findOne",
  "api::case.case.find",
  "api::case.case.findOne",
  "api::site.site.find",
  "api::site.site.findOne",
  "api::navigation.navigation.find",
  "api::navigation.navigation.findOne",
];

async function main() {
  const appContext = await compileStrapi();
  const app = createStrapi(appContext);
  await app.load();

  const tokens = await app.db.query("admin::api-token").findMany();
  let updated = 0;
  for (const token of tokens) {
    if (token.type === "full-access" || token.kind !== "content-api") continue;
    if (token.name !== "merkdraak-frontend" && token.type !== "custom") continue;
    if (token.name !== "merkdraak-frontend") continue;

    const service = app.service("admin::api-token");
    await service.update(token.id, { permissions: REQUIRED });
    updated += 1;
    console.log(`Updated API token permissions: ${token.name}`);
  }

  if (!updated) {
    console.log("No merkdraak-frontend custom token found to update.");
  }

  await app.destroy();
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
