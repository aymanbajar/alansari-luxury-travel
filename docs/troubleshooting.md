# Troubleshooting

## API Is Not Ready

Check:

```bash
curl http://localhost:4000/api/ready
```

If readiness fails, verify `DATABASE_URL`, PostgreSQL health, and applied migrations.

## Login Fails

- Confirm the user is active.
- Confirm cookies are allowed.
- In production, confirm HTTPS is used when `COOKIE_SECURE=true`.
- Wait for the login rate-limit window if repeated attempts were made.

## CSRF Errors

Authenticated state-changing requests must send the `alt_csrf_token` cookie value in the `x-csrf-token` header.

## PDF Arabic Text Is Incorrect

Set `REPORT_ARABIC_FONT_PATH` to a valid Arabic-compatible `.ttf` file available inside the API container.

## Booking Conflict Unexpected

Check `availabilityStartAt` and `availabilityEndAt`; overnight bookings include configurable pre-trip and post-trip buffers.

## Docker Startup

Check:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs api
```
