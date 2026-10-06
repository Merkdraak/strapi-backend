# Deploy (koekje)

Pushes to `main` deploy Strapi on `koekje` via GitHub Actions.

## What happens

1. Actions SSHs as user `deploy` with a key that can only start the deploy.
2. That account has no password, no shell, and is not in the `docker` group.
3. `sudo` allows only `/usr/local/bin/merkdraak-strapi-deploy`, with no arguments.
4. The script runs as root, checks out `origin/main` exactly in `/opt/merkdraak-strapi`, and ignores git hooks. Local edits in that directory are discarded. The server `.env` stays.
5. The image build waits until the frontend build is finished, then runs in a BuildKit container on both CPUs with a 2 GB memory cap. After a successful build, `docker compose up -d --no-build --force-recreate` replaces `merkdraak-strapi`. The deploy fails if the running container is not using that new image, then waits until `/_health` responds.
6. Named volumes `strapi_data` and `strapi_uploads` and the server `.env` are not replaced.

The origin URL is pinned to `https://github.com/Merkdraak/strapi-backend.git`. A second deploy waits for the lock and then replaces the container from the latest `main`.

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
