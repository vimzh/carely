FROM oven/bun:1.3.14 AS dependencies

WORKDIR /app
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN bun install --frozen-lockfile

COPY apps/web apps/web

FROM node:22-bookworm-slim

WORKDIR /app
COPY --from=dependencies /app ./
RUN cd apps/web && node node_modules/next/dist/bin/next build

WORKDIR /app/apps/web
ENV NODE_ENV=production
ENV PORT=8080
CMD ["node", "node_modules/next/dist/bin/next", "start", "-p", "8080"]
