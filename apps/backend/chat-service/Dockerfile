FROM oven/bun:1.1.38-alpine AS base
WORKDIR /app

FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock* /temp/dev/
COPY packages /temp/dev/packages
COPY apps/backend/chat-service/package.json /temp/dev/apps/backend/chat-service/
RUN cd /temp/dev && bun install --frozen-lockfile

FROM base AS build
COPY --from=install /temp/dev/node_modules node_modules
COPY --from=install /temp/dev/packages packages
COPY apps/backend/chat-service apps/backend/chat-service
COPY turbo.json tsconfig.base.json ./
RUN cd apps/backend/chat-service && bun run build

FROM base AS release
COPY --from=build /app/apps/backend/chat-service/dist dist
COPY --from=build /app/apps/backend/chat-service/package.json .

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["bun", "dist/index.js"]

