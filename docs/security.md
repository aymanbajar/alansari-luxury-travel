# Security Hardening

## Implemented Controls

- Passwords are hashed with bcrypt.
- Access and refresh tokens are stored in HTTP-only cookies.
- Refresh tokens rotate and logout revokes active sessions.
- CSRF protection is required for authenticated state-changing requests.
- CORS is allowlisted through `CORS_ORIGIN`.
- Helmet security headers are enabled.
- Login rate limiting and general API rate limiting are enabled.
- Request JSON body size is limited to `1mb`.
- Backend input validation uses Zod.
- Prisma parameterized queries are used for normal data access.
- PostgreSQL exclusion constraints prevent overlapping active vehicle/driver bookings.
- Spreadsheet formula injection is escaped during report export.
- API error responses use safe, consistent messages.
- Passwords, tokens, cookies, and password fields are redacted from request logs.
- Protected endpoints use backend authorization middleware.
- Audit logs are recorded for authentication, entity changes, overnight overrides, and report exports.

## Operational Rules

- Use long random JWT secrets in production.
- Set `COOKIE_SECURE=true` behind HTTPS.
- Restrict database access to the API service and backup operators.
- Rotate credentials immediately after staff changes or suspected exposure.
- Keep `REPORT_ARABIC_FONT_PATH` on a controlled read-only path.
- Review `npm audit --omit=dev` before every release.

## OWASP Review Notes

- Broken access control: guarded by route middleware and service-level role checks.
- Injection: Prisma and Zod are used; raw SQL is limited to migrations and readiness checks.
- Cryptographic failures: secrets are externalized; cookies are HTTP-only and secure in production.
- Security misconfiguration: Docker images run as non-root where application code executes.
- Identification and authentication failures: inactive users cannot log in and refresh tokens rotate.
- Software and data integrity: CI performs install, checks, tests, build, Prisma validation, and audit.
- Logging and monitoring: structured logs, request IDs, readiness checks, and metrics are available.

## Error Monitoring Placeholder

`ERROR_MONITORING_DSN` is reserved for Sentry, OpenTelemetry collector, or an equivalent provider. Do not send passwords, tokens, customer phone numbers, or full report payloads to monitoring tools.
