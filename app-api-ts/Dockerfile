FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY app-api-ts/package.json ./app-api-ts/package.json
RUN corepack enable && pnpm install --frozen-lockfile

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && pnpm --filter @praedixa/api-ts build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/app-api-ts/dist ./dist
COPY app-api-ts/package.json ./package.json
EXPOSE 8000
CMD ["node", "dist/index.js"]
