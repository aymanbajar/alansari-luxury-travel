# Deployment Guide

## Production Readiness Gate

Deploy only after these commands pass in CI or an equivalent controlled environment:

```bash
npm ci
npm run prisma:generate
npm run db:validate
npm run typecheck
npm run lint
npm run test
npm run build
npm audit --omit=dev
```

Do not deploy with unresolved critical vulnerabilities.

## Required Environment Variables

- `NODE_ENV=production`
- `DATABASE_URL`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `CORS_ORIGIN`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `COOKIE_SECURE=true`
- `COOKIE_DOMAIN`
- `APP_TIMEZONE`
- `LOG_LEVEL`
- `REPORT_ARABIC_FONT_PATH`
- `ERROR_MONITORING_DSN`

Secrets must come from the deployment platform or a secret manager. Do not bake them into images.

## Docker Deployment

Build and start the production stack:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

The API image runs `prisma migrate deploy` before starting the server. Review migrations before release and run them against a staging database first.

## Health Checks

- API liveness: `GET /api/health`
- API readiness: `GET /api/ready`
- Metrics: `GET /api/metrics`
- Web: `GET /`

`/api/ready` performs a database connectivity check and returns `503` if PostgreSQL is unavailable.

## Persistent Storage

PostgreSQL data is stored in the `postgres_data` Docker volume. Back up this volume through `pg_dump`; do not copy raw database files while PostgreSQL is running.

## Rollback

1. Stop traffic to the new version.
2. Restore the previous application image.
3. If a migration changed data destructively, restore from the latest verified backup.
4. Run smoke tests: login, booking list, availability check, dashboard, and report preview.

Migrations should be backward-compatible whenever possible.
