const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const key = () => crypto.randomBytes(32).toString("base64");
const keys = `${key()},${key()}`;
const editor = key();
const reval = key();

const backendEnv = [
  "HOST=0.0.0.0",
  "PORT=1337",
  `APP_KEYS="${keys}"`,
  `API_TOKEN_SALT=${key()}`,
  `ADMIN_JWT_SECRET=${key()}`,
  `TRANSFER_TOKEN_SALT=${key()}`,
  `JWT_SECRET=${key()}`,
  `ENCRYPTION_KEY=${key()}`,
  "FRONTEND_URL=http://localhost:3000",
  "REVALIDATE_URL=http://localhost:3000/api/revalidate",
  `REVALIDATE_SECRET=${reval}`,
  `EDITOR_SECRET=${editor}`,
  "",
].join("\n");

const frontendEnv = [
  "STRAPI_URL=http://localhost:1337",
  "STRAPI_ADMIN_ORIGIN=http://localhost:1337",
  "SITE_KEY=merkdraak",
  "NEXT_PUBLIC_SITE_URL=http://localhost:3000",
  `REVALIDATE_SECRET=${reval}`,
  `EDITOR_TOKEN=${editor}`,
  "ROBOTS_NOINDEX=true",
  "STRAPI_API_TOKEN=",
  "",
].join("\n");

const backendRoot = path.join(__dirname, "..");
const frontendRoot = path.join(backendRoot, "..", "merkdraak-frontend");

fs.writeFileSync(path.join(backendRoot, ".env"), backendEnv);
fs.writeFileSync(path.join(frontendRoot, ".env.local"), frontendEnv);
console.log("Wrote backend .env and frontend .env.local");
