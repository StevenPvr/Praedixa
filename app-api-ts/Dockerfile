FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY scripts/install-prek.sh ./scripts/install-prek.sh
COPY app-api-ts/package.json ./app-api-ts/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
COPY packages/telemetry/package.json ./packages/telemetry/package.json
RUN corepack enable && pnpm install --frozen-lockfile

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
COPY --from=deps /app/app-api-ts/node_modules ./app-api-ts/node_modules
COPY --from=deps /app/packages/shared-types/node_modules ./packages/shared-types/node_modules
COPY --from=deps /app/packages/telemetry/node_modules ./packages/telemetry/node_modules
RUN corepack enable \
  && pnpm --filter @praedixa/shared-types build \
  && pnpm --filter @praedixa/telemetry build \
  && pnpm --filter @praedixa/api-ts build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/app-api-ts/dist ./dist
COPY app-api-ts/package.json ./package.json
COPY --from=build /app/packages/shared-types/package.json ./packages/shared-types/package.json
COPY --from=build /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=build /app/packages/telemetry/package.json ./packages/telemetry/package.json
COPY --from=build /app/packages/telemetry/dist ./packages/telemetry/dist

RUN addgroup -S app && adduser -S -G app app \
  && chown -R app:app /app

USER app
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8000/api/v1/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
