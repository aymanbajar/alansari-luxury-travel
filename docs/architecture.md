# Architecture

## Repository Structure

```text
apps/
  api/          Express API shell
  web/          React RTL application shell
packages/
  shared/       Shared TypeScript types and constants
docs/           Requirements and technical planning
docker/         Local infrastructure configuration
```

## Frontend

- React with Vite and TypeScript.
- Tailwind CSS for styling.
- Arabic-first RTL shell in Phase 1.
- Future phases will add React Router, TanStack Query, React Hook Form, and Zod where business workflows begin.

## Backend

- Node.js, Express, and TypeScript.
- Environment validation with Zod.
- Structured logging with Pino.
- Standard API response helpers.
- `GET /api/health` endpoint.
- Not-found and global error handlers.
- Future phases will add authentication, Prisma, PostgreSQL models, services, and controllers.

## Shared Package

The shared package contains stable cross-app constants and types:

- Roles.
- Booking statuses.
- Vehicle statuses.
- Driver statuses.
- API response contracts.
- Health response contract.

## Data Architecture

PostgreSQL is the primary database. Prisma schema and migrations are owned by `apps/api/prisma`. The schema uses UUID identifiers, timezone-aware timestamps, decimal monetary fields, enums for constrained states, soft deletion on important business entities, and indexes for common booking and fleet lookups.

## Backend Layering For Future Phases

- Routes define HTTP paths and middleware.
- Controllers translate HTTP requests and responses.
- Services hold business logic.
- Repositories or Prisma client access remain behind services when useful.
- Shared validation schemas should be reused where practical.

## Security Architecture

Planned security includes:

- JWT authentication with secure HTTP-only cookies.
- bcrypt password hashing.
- Backend-enforced RBAC.
- Input validation on every write endpoint.
- Structured audit logging.
- No committed secrets.

## Deployment Direction

- Docker Compose supports local PostgreSQL.
- Future production deployment can add API, web, PostgreSQL, and Nginx services.
- Environment variables control runtime configuration.
