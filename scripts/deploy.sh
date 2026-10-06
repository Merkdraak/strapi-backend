#!/usr/bin/env bash
set -euo pipefail
trap '' HUP

if [[ "$(id -u)" -ne 0 ]]; then
  echo "merkdraak-strapi-deploy must run as root" >&2
  exit 1
fi

if [[ "$#" -ne 0 ]]; then
  echo "arguments are not accepted" >&2
  exit 1
fi

case "${SSH_ORIGINAL_COMMAND:-}" in
  ""|sudo\ -n\ /usr/local/bin/merkdraak-strapi-deploy|/usr/local/bin/merkdraak-strapi-deploy)
    ;;
  *)
    echo "rejected command" >&2
    exit 1
    ;;
esac

APP_DIR=/opt/merkdraak-strapi
REMOTE_URL=https://github.com/Merkdraak/strapi-backend.git
LOCK=/run/lock/merkdraak-strapi-deploy.lock

exec 9>"$LOCK"
echo "waiting for the deploy lock"
flock 9

cd "$APP_DIR"

if [[ ! -f .env ]]; then
  echo "missing $APP_DIR/.env" >&2
  exit 1
fi

env_mode="$(stat -c '%a' .env)"
env_owner="$(stat -c '%U' .env)"
if [[ "$env_mode" != "600" && "$env_mode" != "400" ]]; then
  echo ".env permissions are $env_mode" >&2
  exit 1
fi
if [[ "$env_owner" != "root" ]]; then
  echo ".env must be owned by root" >&2
  exit 1
fi

docker network inspect n8n_n8n_net >/dev/null

git_safe=(git -c safe.directory="$APP_DIR" -c core.hooksPath=/dev/null)

remote="$("${git_safe[@]}" remote get-url origin)"
if [[ "$remote" != "$REMOTE_URL" ]]; then
  echo "unexpected origin" >&2
  exit 1
fi

"${git_safe[@]}" fetch --prune origin main
"${git_safe[@]}" checkout --quiet --force main
"${git_safe[@]}" reset --hard origin/main

branch="$("${git_safe[@]}" branch --show-current)"
if [[ "$branch" != "main" ]]; then
  echo "not on main" >&2
  exit 1
fi

BUILD_LOCK=/run/lock/merkdraak-image-build.lock
exec 8>"$BUILD_LOCK"
echo "waiting for the image build slot"
flock 8

if ! docker buildx inspect merkdraak >/dev/null 2>&1; then
  docker buildx create --name merkdraak --driver docker-container --bootstrap >/dev/null
fi
docker buildx inspect merkdraak --bootstrap >/dev/null
docker update --cpuset-cpus 0,1 --memory 2g --memory-swap 2g buildx_buildkit_merkdraak0 >/dev/null

docker compose --project-directory "$APP_DIR" -f "$APP_DIR/docker-compose.yml" build --builder merkdraak
built_image="$(docker image inspect -f '{{.Id}}' merkdraak-strapi:local)"
docker compose --project-directory "$APP_DIR" -f "$APP_DIR/docker-compose.yml" up -d --no-build --force-recreate
running_image="$(docker inspect -f '{{.Image}}' merkdraak-strapi)"
if [[ "$running_image" != "$built_image" ]]; then
  echo "container merkdraak-strapi was not replaced with the new image" >&2
  exit 1
fi

ok=0
for _ in $(seq 1 30); do
  status="$(docker inspect -f '{{.State.Status}}' merkdraak-strapi)"
  if [[ "$status" != "running" ]]; then
    echo "container merkdraak-strapi is $status" >&2
    docker logs --tail 80 merkdraak-strapi >&2 || true
    exit 1
  fi
  if docker exec merkdraak-strapi node -e 'fetch("http://127.0.0.1:1337/_health").then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))'; then
    ok=1
    break
  fi
  sleep 2
done

if [[ "$ok" != "1" ]]; then
  echo "strapi health check failed" >&2
  docker logs --tail 80 merkdraak-strapi >&2 || true
  exit 1
fi

echo "deploy ok $("${git_safe[@]}" rev-parse --short HEAD)"
