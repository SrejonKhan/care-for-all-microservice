FROM oven/bun:1.1.38-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lockb /temp/dev/
COPY packages /temp/dev/packages
COPY apps/gateway/package.json /temp/dev/apps/gateway/
RUN cd /temp/dev && bun install --frozen-lockfile

# Build
FROM base AS build
COPY --from=install /temp/dev/node_modules node_modules
COPY --from=install /temp/dev/packages packages
COPY apps/gateway apps/gateway
COPY turbo.json tsconfig.base.json ./
RUN cd apps/gateway && bun run build

# Production image
FROM base AS release
COPY --from=build /app/apps/gateway/dist dist
COPY --from=build /app/apps/gateway/package.json .

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["bun", "dist/index.js"]

