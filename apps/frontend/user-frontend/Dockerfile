# Build stage
FROM oven/bun:1.1.38-alpine AS base
WORKDIR /app

# Install dependencies (monorepo aware)
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock* /temp/dev/
COPY packages /temp/dev/packages
COPY apps/frontend/user-frontend/package.json /temp/dev/apps/frontend/user-frontend/
RUN cd /temp/dev && bun install --frozen-lockfile

# Node.js stage for building (compatibility with Next.js)
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=install /temp/dev/node_modules node_modules
COPY --from=install /temp/dev/packages packages
COPY apps/frontend/user-frontend apps/frontend/user-frontend
COPY turbo.json tsconfig.base.json ./
RUN cd apps/frontend/user-frontend && npm run build

# Production stage  
FROM base AS release
COPY --from=build /app/apps/frontend/user-frontend/.next ./.next
COPY --from=build /app/apps/frontend/user-frontend/public ./public
COPY --from=build /app/apps/frontend/user-frontend/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["bun", "run", "start"]
