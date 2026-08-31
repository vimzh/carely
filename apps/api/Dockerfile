FROM oven/bun:1.3.14 AS build

WORKDIR /app
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN bun install --frozen-lockfile

COPY apps/api apps/api
RUN cd apps/api && bun run build

FROM oven/bun:1.3.14

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /app/apps/api/dist ./dist

ENV PORT=8080
CMD ["bun", "run", "dist/index.js"]
