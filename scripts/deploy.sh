#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/merkdraak-strapi}"
cd "$APP_DIR"

if [[ ! -f .env ]]; then
  echo "missing $APP_DIR/.env" >&2
  exit 1
fi

docker network inspect n8n_n8n_net >/dev/null

git fetch origin
git checkout --quiet main
git merge --ff-only origin/main

docker builder prune -f >/dev/null
docker compose up -d --build
docker compose ps
status="$(docker inspect -f '{{.State.Status}}' merkdraak-strapi)"
if [[ "$status" != "running" ]]; then
  echo "container merkdraak-strapi is $status" >&2
  docker logs --tail 80 merkdraak-strapi >&2 || true
  exit 1
fi

docker image prune -f >/dev/null
echo "deploy ok $(git rev-parse --short HEAD)"
