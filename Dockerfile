FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/app

# Free host Docker disk before the Strapi admin build (koekje often fills up).
# `dockersock` comes from compose additional_contexts → /var/run on the host.
RUN --mount=type=bind,from=dockersock,source=docker.sock,target=/var/run/docker.sock \
  apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates \
  && curl -fsS --unix-socket /var/run/docker.sock -X POST http://localhost/containers/prune || true \
  && curl -fsS --unix-socket /var/run/docker.sock -X POST 'http://localhost/images/prune?dangling=false' || true \
  && curl -fsS --unix-socket /var/run/docker.sock -X POST 'http://localhost/build/prune?all=true' || true \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ENV NODE_ENV=production
RUN npm run build

EXPOSE 1337
CMD ["npm", "run", "start"]
