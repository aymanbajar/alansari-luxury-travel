# Fleet And Booking Management System

Internal fleet and booking platform for Alansari Luxury Travel.

## Current Scope

The repository currently includes Phase 1 through Phase 10 foundation, core operations, reporting, and production-readiness work.

Included:

- Monorepo structure using `apps/web`, `apps/api`, and `packages/shared`.
- React/Vite Arabic RTL application shell.
- Express API shell.
- `GET /api/health` endpoint.
- TypeScript strict mode.
- ESLint and Prettier setup.
- Environment variable validation.
- Basic logging.
- Standard API error format.
- Not-found and global backend error handlers.
- Local PostgreSQL Docker Compose configuration.
- Prisma schema, initial migration, seed data, and database validation scripts.
- Authentication, secure cookie sessions, refresh-token rotation, RBAC, and Admin staff management.
- Vehicle fleet and driver management APIs and Arabic RTL management pages.
- Customer management APIs and Arabic RTL management page with duplicate phone warnings.
- Core booking APIs and Arabic RTL management page with status transitions, cancellation, active resource selectors, and audit logging.
- Conflict detection, overbooking prevention, availability endpoints, and alternative vehicle/driver suggestions.
- Overnight stay management, configurable overnight buffer windows, driver overnight cost calculation, Admin override auditing, and Admin overnight settings UI.
- Operational dashboard with aggregated summary cards, dispatch lists, recent booking changes, overnight alerts, vehicle status overview, and an interactive vehicle booking timeline.
- Reports module with backend-validated previews, Excel exports, PDF exports, printable daily dispatch sheets, export audit logging, and permission-gated financial reports.
- Production readiness hardening: readiness checks, request correlation IDs, basic metrics, graceful shutdown, general API rate limiting, Dockerfiles, production Compose, Nginx config, backup/restore scripts, CI, frontend component tests, and Playwright E2E specifications.
- Planning documentation for future phases.

Not included yet:

- Audit-log UI module.

## Requirements

- Node.js 20+
- Docker and Docker Compose
- PostgreSQL 16 via Docker for local development

## Local Setup

```bash
npm install
copy apps\api\.env.example apps\api\.env
copy apps\web\.env.example apps\web\.env
docker compose -f docker/docker-compose.yml up -d postgres
npm run prisma:generate --workspace @alansari/api
npm run prisma:migrate --workspace @alansari/api
npm run db:seed --workspace @alansari/api
npm run dev:api
npm run dev:web
```

Frontend: `http://localhost:5173`

Backend health check: `http://localhost:4000/api/health`

Backend readiness check: `http://localhost:4000/api/ready`

## Development Commands

```bash
npm run typecheck
npm run lint
npm run build
npm run test
npm run test:e2e --workspace @alansari/web
npm run format:check
npm run db:validate --workspace @alansari/api
```

Playwright E2E tests are skipped unless `RUN_E2E=1` is set and the API, web app, browsers, and seeded test database are available.

## Authentication

Development accounts created by the seed:

```text
Admin: admin@alansari.local / ChangeMe123!
Staff: staff@alansari.local / ChangeMe123!
```

These credentials are safe local placeholders and must be changed outside development.

Authentication behavior:

- Access and refresh tokens are stored in secure HTTP-only cookies.
- Refresh tokens rotate on `POST /api/auth/refresh`.
- Logout revokes the active refresh session.
- State-changing authenticated requests require the readable `alt_csrf_token` cookie value in the `x-csrf-token` header.
- Passwords are hashed with bcrypt and are never returned by the API.
- Staff users cannot access `/api/users` Admin endpoints.

Auth endpoints:

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/change-password`

Admin staff-management endpoints:

- `GET /api/users`
- `POST /api/users`
- `GET /api/users/:id`
- `PATCH /api/users/:id`
- `PATCH /api/users/:id/status`
- `POST /api/users/:id/reset-password`

Vehicle endpoints:

- `GET /api/vehicles`
- `POST /api/vehicles`
- `GET /api/vehicles/:id`
- `PATCH /api/vehicles/:id`
- `PATCH /api/vehicles/:id/status`
- `DELETE /api/vehicles/:id`

Driver endpoints:

- `GET /api/drivers`
- `POST /api/drivers`
- `GET /api/drivers/:id`
- `PATCH /api/drivers/:id`
- `PATCH /api/drivers/:id/status`
- `DELETE /api/drivers/:id`

Customer endpoints:

- `GET /api/customers`
- `POST /api/customers`
- `GET /api/customers/:id`
- `PATCH /api/customers/:id`
- `DELETE /api/customers/:id`
- `GET /api/customers/:id/bookings`

Booking endpoints:

- `GET /api/bookings`
- `POST /api/bookings`
- `GET /api/bookings/:id`
- `PATCH /api/bookings/:id`
- `PATCH /api/bookings/:id/status`
- `POST /api/bookings/:id/cancel`

Booking behavior:

- `endAt` must be later than `startAt`.
- Customers must be active.
- Vehicles cannot be inactive, under maintenance, or out of service.
- Drivers cannot be inactive.
- Voucher numbers are unique.
- Half-open intervals are used: `[startAt, endAt)`.
- A conflict exists when `newStart < existingEnd` and `newEnd > existingStart`.
- Cancelled bookings do not block availability.
- Cancelled bookings cannot move to `IN_PROGRESS` or `COMPLETED`.
- Completed bookings are read-only for Staff users.
- All booking mutations run in serializable database transactions and create audit-log records.
- PostgreSQL exclusion constraints prevent overlapping active bookings for the same vehicle or driver.
- Overnight bookings require accommodation details, calculate nights and driver cost, and store the rate used at booking time.
- Overnight availability includes configurable pre-trip and post-trip buffer hours, stored in each booking availability window.
- Staff cannot override overnight costs; Admin overrides require a reason and are audited.

Settings endpoints:

- `GET /api/settings/overnight`
- `PATCH /api/settings/overnight`

Overnight settings:

- Default overnight driver rate.
- Default pre-trip buffer hours.
- Default post-trip buffer hours.
- Default currency.
- Local operating timezone.

Availability endpoints:

- `POST /api/availability/check`
- `GET /api/availability/vehicles`
- `GET /api/availability/drivers`
- `GET /api/availability/suggestions`

Dashboard endpoints:

- `GET /api/dashboard/summary`
- `GET /api/dashboard/timeline`

Dashboard behavior:

- Summary cards are calculated by backend aggregate queries.
- Timeline rows are grouped by vehicle and use the stored availability blocking window.
- Timeline supports day, week, and month views with server-side filters.
- Staff users see operational information but restricted financial/admin statistics remain hidden.

Report endpoints:

- `GET /api/reports`
- `GET /api/reports/:type`
- `GET /api/reports/:type/export?format=excel`
- `GET /api/reports/:type/export?format=pdf`

Report behavior:

- Reports use backend-validated date ranges and filters.
- Excel exports use ExcelJS and escape spreadsheet-formula injection values.
- PDF exports are generated server-side with PDFKit and use an Arabic-capable font when configured.
- Set `REPORT_ARABIC_FONT_PATH` in production to an Arabic-compatible `.ttf` font file.
- Staff cannot access financial reports such as booking expenses or overnight driver costs.
- Exports are audited with report type, filters, format, user, and timestamp.

Production operations:

- `GET /api/ready` checks database connectivity.
- `GET /api/metrics` exposes basic Prometheus-style process/request counters.
- Every response includes an `x-request-id`; incoming request IDs are preserved when valid.
- API logs redact cookies, authorization headers, and password fields.
- General API rate limits are controlled by `GENERAL_RATE_LIMIT_WINDOW_MINUTES` and `GENERAL_RATE_LIMIT_MAX_REQUESTS`.
- The API process closes the HTTP server and Prisma connection on `SIGINT` and `SIGTERM`.

Production Docker:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Backups:

```powershell
$env:DATABASE_URL="postgresql://user:password@host:5432/alansari"
.\scripts\db-backup.ps1 -OutputFile .\backups\alansari.dump
```

Optional PostgreSQL concurrency test:

```bash
set TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/alansari_test?schema=public
npm run test --workspace @alansari/api
```

Fleet permissions:

- Admin can create, update, change status, and soft-delete vehicles and drivers.
- Staff can view vehicles and drivers only.
- Soft-deleted vehicles and drivers are hidden from operational lists.

## Documentation

- `docs/requirements.md`
- `docs/use-cases.md`
- `docs/architecture.md`
- `docs/business-rules.md`
- `docs/api-conventions.md`
- `docs/database-setup.md`
- `docs/database-schema.md`
- `docs/development-roadmap.md`
- `docs/deployment.md`
- `docs/security.md`
- `docs/testing.md`
- `docs/backup-and-restore.md`
- `docs/admin-guide.md`
- `docs/staff-guide.md`
- `docs/troubleshooting.md`
- `docs/uat-checklist.md`

## Environment

Do not commit real secrets. Use `.env.example` files as templates for local development.
