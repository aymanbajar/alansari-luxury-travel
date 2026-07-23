# Database Setup

## Scope

Phase 2 introduces PostgreSQL and Prisma for database design, migrations, seed data, and validation scripts. It does not add API controllers, frontend CRUD pages, authentication flows, or booking conflict prevention.

## Local PostgreSQL

Start PostgreSQL:

```bash
docker compose -f docker/docker-compose.yml up -d postgres
```

Default local connection string:

```text
postgresql://postgres:postgres@localhost:5432/alansari_travel?schema=public
```

## Environment

Create the API environment file:

```bash
copy apps\api\.env.example apps\api\.env
```

The API package reads `DATABASE_URL` from `apps/api/.env`.

## Prisma Commands

Generate Prisma Client:

```bash
npm run prisma:generate --workspace @alansari/api
```

Run migrations locally:

```bash
npm run prisma:migrate --workspace @alansari/api
```

Run migrations in deployed environments:

```bash
npm run prisma:deploy --workspace @alansari/api
```

Seed development data:

```bash
npm run db:seed --workspace @alansari/api
```

Validate database constraints and seed data:

```bash
npm run db:validate --workspace @alansari/api
```

## Development Seed Credentials

The seed creates these development-only users:

```text
Admin: admin@alansari.local / ChangeMe123!
Staff: staff@alansari.local / ChangeMe123!
```

These credentials are only for local development and must be changed outside development.

## Important Schema Rules

- IDs use UUID values.
- All important business records support soft deletion where appropriate.
- Timestamps use PostgreSQL `TIMESTAMPTZ`.
- Money uses `DECIMAL(12, 2)`.
- `plateNumber`, `voucherNumber`, and user `email` are unique.
- `Booking.endAt` must be later than `Booking.startAt`.
- Foreign keys avoid destructive cascade deletion for important business records.
- Booking date/resource indexes prepare the database for future conflict-prevention logic.
