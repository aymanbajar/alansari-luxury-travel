# Testing Guide

## Automated Test Layers

- Backend unit and API integration tests: `apps/api/tests`.
- Backend database/concurrency tests: gated by test database availability.
- Frontend component and route tests: colocated under `apps/web/src`.
- End-to-end Playwright journeys: `apps/web/e2e`.

## Commands

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run format:check
```

## Database Tests

Use an isolated PostgreSQL database:

```bash
set TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/alansari_test?schema=public
npm run test --workspace @alansari/api
```

Never run destructive test setup against production.

## Playwright E2E

E2E tests are skipped unless explicitly enabled:

```bash
set RUN_E2E=1
set PLAYWRIGHT_BASE_URL=http://127.0.0.1:5173
set E2E_ADMIN_EMAIL=admin@alansari.local
set E2E_STAFF_EMAIL=staff@alansari.local
set E2E_PASSWORD=ChangeMe123!
npm run test:e2e --workspace @alansari/web
```

Run against a seeded staging or local database.

## Coverage Expectations

Critical business rules requiring tests:

- Authentication and authorization.
- Vehicle, driver, customer, and booking validation.
- Booking conflict and concurrency rejection.
- Overnight stay calculation and buffer behavior.
- Report filtering, permissions, Excel/PDF generation, and audit logging.
- Route protection and permission-sensitive UI.
