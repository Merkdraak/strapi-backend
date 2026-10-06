/**
 * Prints the Authorization header Claude Code sends to the Strapi MCP server.
 * Reads STRAPI_ADMIN_TOKEN from the environment, then from the project .env.
 */
const fs = require('fs');
const path = require('path');

function readTokenFromEnvFile() {
  const file = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(file)) return '';

  const text = fs.readFileSync(file, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^STRAPI_ADMIN_TOKEN=(.*)$/);
    if (!match) continue;

    let value = match[1].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value;
  }

  return '';
}

const token = process.env.STRAPI_ADMIN_TOKEN || readTokenFromEnvFile();
if (!token) {
  process.stderr.write('STRAPI_ADMIN_TOKEN ontbreekt in de omgeving en in .env\n');
  process.exit(1);
}

process.stdout.write(JSON.stringify({ Authorization: `Bearer ${token}` }));
