# Development Roadmap

## Phase 1: Requirements, Architecture, And Setup

- Formalize requirements and business rules.
- Create monorepo structure.
- Configure TypeScript, ESLint, Prettier, environment validation, logging, and Docker Compose.
- Add placeholder React RTL shell.
- Add placeholder Express API with health check.

## Phase 2: Database Foundation

- Add Prisma ORM.
- Define database schema and migrations.
- Add seed strategy for local development.
- Add database indexes and soft deletion conventions.
- Add database validation scripts for core constraints.

## Phase 3: Authentication And RBAC

- Implement login/logout.
- Add JWT with secure HTTP-only cookies.
- Hash passwords with bcrypt.
- Add Admin and Staff authorization middleware.
- Add refresh-token rotation, CSRF protection, login rate limiting, and Admin staff-management endpoints.

## Phase 4: Fleet And Driver Management

- Vehicle management with search, filtering, pagination, status changes, soft deletion, and audit logging.
- Driver management with search, filtering, pagination, overnight rates, status changes, soft deletion, and audit logging.

## Phase 5: Customer Management And Core Booking

- Customer CRUD, search, duplicate phone warnings, soft deletion, and booking history.
- Booking create, read, update, filtering, pagination, status changes, and cancellation.
- Explicit booking status lifecycle service.
- Transactional booking operations and audit logging.
- Availability-service interface prepared for the Phase 6 conflict engine.

## Phase 6: Conflict Prevention And Availability Suggestions

- Final vehicle/driver overbooking prevention.
- Alternative vehicle and driver suggestions.
- Availability check endpoints and frontend warnings.
- PostgreSQL exclusion constraints for overlapping active bookings.

## Phase 7: Overnight Stay Management

- Overnight stay management.
- External trip business logic.
- Configurable overnight driver rate, currency, timezone, and availability buffer settings.
- Overnight cost calculation and Admin override auditing.
- Conflict engine integration with persisted availability blocking windows.

## Phase 8: Operational Dashboard And Timeline

- Operational dashboard summary cards.
- Today's dispatch list, upcoming bookings, recent booking changes, overnight alerts, and vehicle status overview.
- Interactive vehicle booking timeline with day, week, and month views.
- Timeline server-side filtering for vehicle, driver, customer, status, trip type, overnight-only, and voucher number.
- Staff-safe operational dashboard statistics.

## Future Phases

- Audit log screens and filters.
- Operational statistics.

- End-to-end testing.
- Docker production services.
- Nginx configuration when needed.
- Security review and performance tuning.
