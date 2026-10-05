# Deploy (koekje)

Pushes to `main` deploy Strapi on `koekje` via GitHub Actions.

## What happens

1. Actions SSHs as user `deploy` (key-only, command-restricted).
2. `/usr/local/bin/merkdraak-strapi-deploy` fast-forward pulls `main` in `/opt/merkdraak-strapi`.
3. `docker compose up -d --build` recreates `merkdraak-strapi`.
4. Named volumes `strapi_data` and `strapi_uploads` and the server `.env` are not replaced.

## GitHub secrets

| Name | Purpose |
| --- | --- |
| `KOEKJE_SSH_HOST` | Server hostname or IP |
| `KOEKJE_SSH_USER` | SSH user (`deploy`) |
| `KOEKJE_SSH_KEY` | Private key for Actions only |
| `KOEKJE_KNOWN_HOSTS` | SSH `known_hosts` lines for the server |

Do not commit `.env` or private keys. Production `.env` lives only on the server.

## Manual deploy

SSH as a user that can run Docker in `/opt/merkdraak-strapi`, then:

```
/usr/local/bin/merkdraak-strapi-deploy
```
