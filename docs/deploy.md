# Deploy (koekje)

Pushes to `main` deploy Strapi on `koekje` via GitHub Actions.

## What happens

1. Actions SSHs as user `deploy` with a key that can only start the deploy.
2. That account has no password, no shell, and is not in the `docker` group.
3. `sudo` allows only `/usr/local/bin/merkdraak-strapi-deploy`, with no arguments.
4. The script runs as root, fast-forward pulls `origin/main` in `/opt/merkdraak-strapi`, and ignores git hooks.
5. The image build waits until the frontend build is finished, then runs in a BuildKit container pinned to one CPU and 1600 MB. `docker compose up -d --no-build` recreates `merkdraak-strapi` and waits until `/_health` responds.
6. Named volumes `strapi_data` and `strapi_uploads` and the server `.env` are not replaced.

The origin URL is pinned to `https://github.com/Merkdraak/strapi-backend.git`. A deploy refuses to run when another deploy still holds the lock.

## GitHub secrets

| Name | Purpose |
| --- | --- |
| `KOEKJE_SSH_HOST` | Server hostname or IP |
| `KOEKJE_SSH_USER` | SSH user (`deploy`) |
| `KOEKJE_SSH_KEY` | Private key for Actions only |
| `KOEKJE_KNOWN_HOSTS` | SSH `known_hosts` lines for the server |

Do not commit `.env` or private keys. Production `.env` lives only on the server and is readable by root.

## Manual deploy

On the server, as root:

```
/usr/local/bin/merkdraak-strapi-deploy
```
