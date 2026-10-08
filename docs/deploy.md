# Deploy (koekje / cms.merkdraak.nl)

Pushes to `main` deploy Strapi on koekje via GitHub Actions → **https://cms.merkdraak.nl**.

## Zelf deployen via pull request

1. Werk op je eigen branch.
2. Open een **pull request naar `main`**.
3. Merge de PR.
4. Actions start automatisch de Strapi-deploy op koekje.

**Merge naar `main` = deploy.** Geen extra handmatige stap nodig.
Handmatig: Actions → Deploy-workflow → Run workflow.

Een groene run eindigt met `deploy ok <short-sha>`. Rood = cms.merkdraak.nl draait nog de vorige image.

## Als main wel updated is maar cms.merkdraak.nl niet

1. Open **Actions → Deploy to koekje** voor de commit op `main`.
2. Bekijk de log. Veelvoorkomende oorzaken:
   - `no space left on device` tijdens image export → schijf op koekje vol.
   - Build/admin compile errors → fix in de feature branch, opnieuw mergen.
3. Disk opruimen op de server (root), daarna Actions opnieuw:
   ```
   docker container prune -f
   docker image prune -af
   docker builder prune -af
   df -h /
   ```
4. `/usr/local/bin/merkdraak-strapi-deploy` is de live deploy-hook. Wijzigingen in `scripts/deploy.sh` gelden pas nadat die file daarheen is gekopieerd (eenmalig door iemand met root).

## Wat je waar ziet

| Repo | Push naar `main` | Zichtbaar op |
| --- | --- | --- |
| `strapi-backend` | CMS / API / schema | https://cms.merkdraak.nl |
| `merkdraak-frontend` | Site + pagebuilder UI | https://test.merkdraak.nl |

De pagebuilder in het CMS is een iframe van de frontend. Op de server moet `FRONTEND_URL=https://test.merkdraak.nl` staan (en idealiter `REVALIDATE_URL=https://test.merkdraak.nl/api/revalidate`). Bij start sync’t Strapi `Site.editorUrl` daarmee, zodat editor-wijzigingen na een frontend-deploy in het CMS zichtbaar zijn.

## What happens

1. Actions SSHs as user `deploy` with a key that can only start the deploy.
2. That account has no password, no shell, and is not in the `docker` group.
3. `sudo` allows only `/usr/local/bin/merkdraak-strapi-deploy`, with no arguments.
4. The script runs as root, checks out `origin/main` exactly in `/opt/merkdraak-strapi`, and ignores git hooks. Local edits in that directory are discarded. The server `.env` stays.
5. The image build waits until the frontend build is finished, then runs in a BuildKit container on both CPUs with 3 GB of memory and swap up to 5 GB. After a successful build, `docker compose up -d --no-build --force-recreate` replaces `merkdraak-strapi`. The deploy fails if the running container is not using that new image, then waits until `/_health` responds.
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
