FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run prisma:generate --workspace @alansari/api
RUN npm run build --workspace @alansari/shared
RUN npm run build --workspace @alansari/api
RUN npm prune --omit=dev

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder --chown=app:app /app/package.json /app/package-lock.json ./
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=app:app /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=app:app /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder --chown=app:app /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder --chown=app:app /app/packages/shared/dist ./packages/shared/dist
USER app
EXPOSE 4000
CMD ["sh", "-c", "npm run prisma:deploy --workspace @alansari/api && npm run start --workspace @alansari/api"]

