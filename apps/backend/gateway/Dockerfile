FROM oven/bun:1.1.38-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock* /temp/dev/
COPY packages /temp/dev/packages
COPY apps/backend/gateway/package.json /temp/dev/apps/backend/gateway/
RUN cd /temp/dev && bun install --frozen-lockfile

# Build
FROM base AS build
COPY --from=install /temp/dev/node_modules node_modules
COPY --from=install /temp/dev/packages packages
COPY apps/backend/gateway apps/backend/gateway
COPY turbo.json tsconfig.base.json ./
RUN cd apps/backend/gateway && bun run build

# Production image
FROM base AS release
COPY --from=build /app/apps/backend/gateway/dist dist
COPY --from=build /app/apps/backend/gateway/package.json .

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["bun", "dist/index.js"]

