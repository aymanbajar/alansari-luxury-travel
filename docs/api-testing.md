# API Testing Guide

This guide documents the local API surface discovered from the Express route registrations.

## Local URLs

- Backend base URL: `http://localhost:4000/api`
- Frontend URL: `http://localhost:5173`
- Health endpoint: `http://localhost:4000/api/health`
- Readiness endpoint: `http://localhost:4000/api/ready`
- Metrics endpoint: `http://localhost:4000/api/metrics`
- Swagger/OpenAPI: not currently configured; `/api/swagger` returns `404`.

## Local Authentication

Development seed accounts:

- Admin: `admin@alansari.local`
- Staff: `staff@alansari.local`

The local development password is defined by the seed script and must be changed outside local development. Do not store production passwords in this repository.

Authentication uses secure HTTP-only cookies for access and refresh tokens. Do not copy cookie values into documentation, commits, or logs.

## PowerShell Examples

```powershell
$base = "http://localhost:4000/api"
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

Invoke-RestMethod `
  -Method Post `
  -Uri "$base/auth/login" `
  -WebSession $session `
  -ContentType "application/json" `
  -Body (@{
    email = $env:ALT_TEST_EMAIL
    password = $env:ALT_TEST_PASSWORD
  } | ConvertTo-Json)

Invoke-RestMethod -Method Get -Uri "$base/auth/me" -WebSession $session
Invoke-RestMethod -Method Get -Uri "$base/vehicles?page=1&pageSize=10" -WebSession $session
```

For state-changing authenticated requests, include the CSRF header value that matches the non-HTTP-only CSRF cookie.

## curl Examples

```bash
BASE_URL="http://localhost:4000/api"
COOKIE_JAR="$(mktemp)"

curl -s -c "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ALT_TEST_EMAIL\",\"password\":\"$ALT_TEST_PASSWORD\"}" \
  "$BASE_URL/auth/login"

curl -s -b "$COOKIE_JAR" "$BASE_URL/auth/me"

rm -f "$COOKIE_JAR"
```

## Implemented Endpoints

### Health

| Method | Path | Auth | Body or query |
| --- | --- | --- | --- |
| GET | `/api/health` | Public | None |
| GET | `/api/ready` | Public | None; checks database connectivity |
| GET | `/api/metrics` | Public | None |

### Authentication

| Method | Path | Auth | Body or query |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | Public, rate limited | `email`, `password` |
| POST | `/api/auth/refresh` | Refresh cookie | None |
| POST | `/api/auth/logout` | Authenticated | CSRF header required |
| GET | `/api/auth/me` | Authenticated | None |
| POST | `/api/auth/change-password` | Authenticated | `currentPassword`, `newPassword`, `confirmPassword`; CSRF header required |

### Users

All user-management endpoints require an authenticated Admin.

| Method | Path | Body or query |
| --- | --- | --- |
| GET | `/api/users` | Pagination and search query parameters |
| POST | `/api/users` | Staff account creation body |
| GET | `/api/users/:id` | UUID path parameter |
| PATCH | `/api/users/:id` | Staff account update body |
| PATCH | `/api/users/:id/status` | Account status body |
| POST | `/api/users/:id/reset-password` | Password reset body |

### Vehicles

Vehicle reads require Staff or Admin. Vehicle mutations require Admin.

| Method | Path | Body or query |
| --- | --- | --- |
| GET | `/api/vehicles` | `search`, `status`, `page`, `pageSize`, `sortBy`, `sortDirection` |
| POST | `/api/vehicles` | Vehicle creation body |
| GET | `/api/vehicles/:id` | UUID path parameter |
| PATCH | `/api/vehicles/:id` | Vehicle update body |
| PATCH | `/api/vehicles/:id/status` | Vehicle status body |
| DELETE | `/api/vehicles/:id` | UUID path parameter; soft delete |

### Drivers

Driver reads require Staff or Admin. Driver mutations require Admin.

| Method | Path | Body or query |
| --- | --- | --- |
| GET | `/api/drivers` | `search`, `status`, `page`, `pageSize`, `sortBy`, `sortDirection` |
| POST | `/api/drivers` | Driver creation body |
| GET | `/api/drivers/:id` | UUID path parameter |
| PATCH | `/api/drivers/:id` | Driver update body |
| PATCH | `/api/drivers/:id/status` | Driver status body |
| DELETE | `/api/drivers/:id` | UUID path parameter; soft delete |

### Customers

Customer endpoints require Staff or Admin.

| Method | Path | Body or query |
| --- | --- | --- |
| GET | `/api/customers` | `search`, `page`, `pageSize`, sorting query parameters |
| POST | `/api/customers` | Customer creation body |
| GET | `/api/customers/:id/bookings` | UUID path parameter |
| GET | `/api/customers/:id` | UUID path parameter |
| PATCH | `/api/customers/:id` | Customer update body |
| DELETE | `/api/customers/:id` | UUID path parameter; soft delete when history exists |

### Bookings

Booking endpoints require Staff or Admin. Additional exceptional status rules are enforced by the booking service.

| Method | Path | Body or query |
| --- | --- | --- |
| GET | `/api/bookings` | Date, status, vehicle, driver, customer, trip type, voucher, pagination filters |
| POST | `/api/bookings` | Booking creation body |
| GET | `/api/bookings/:id` | UUID path parameter |
| PATCH | `/api/bookings/:id` | Booking update body |
| PATCH | `/api/bookings/:id/status` | Booking status body |
| POST | `/api/bookings/:id/cancel` | Cancellation body |

### Availability

Availability endpoints require Staff or Admin.

| Method | Path | Body or query |
| --- | --- | --- |
| POST | `/api/availability/check` | `startAt`, `endAt`, optional `bookingId`, `vehicleId`, `driverId`, `passengerCapacity`, `tripType` |
| GET | `/api/availability/vehicles` | Same fields as query parameters |
| GET | `/api/availability/drivers` | Same fields as query parameters |
| GET | `/api/availability/suggestions` | Same fields as query parameters |

### Dashboard

Dashboard endpoints require Staff or Admin.

| Method | Path | Body or query |
| --- | --- | --- |
| GET | `/api/dashboard/summary` | Optional `startFrom`, `endTo` |
| GET | `/api/dashboard/timeline` | Required `startFrom`, `endTo`; optional `view`, resource and booking filters |

### Reports

Report endpoints require Staff or Admin. Restricted financial or administrative report rows are filtered by backend permissions.

| Method | Path | Body or query |
| --- | --- | --- |
| GET | `/api/reports` | None |
| GET | `/api/reports/:type` | `startDate`, `endDate`, and optional report filters |
| GET | `/api/reports/:type/export` | Same filters plus `format=excel` or `format=pdf` |

Supported report types:

`daily-bookings`, `daily-dispatch`, `weekly-bookings`, `monthly-bookings`, `bookings-by-vehicle`, `bookings-by-driver`, `customer-history`, `overnight-stays`, `overnight-driver-costs`, `cancelled-bookings`, `vehicle-utilization`, `vehicle-service-status`, `booking-expenses`.

### Settings

| Method | Path | Auth | Body or query |
| --- | --- | --- | --- |
| GET | `/api/settings/overnight` | Staff or Admin | None |
| PATCH | `/api/settings/overnight` | Admin | Overnight settings update body; CSRF header required |

## Verified Local Probe Results

Last verified against local development servers:

| Probe | Expected status |
| --- | --- |
| `GET /api/health` | `200` |
| `GET /api/ready` | `200` |
| `GET /api` | `404` |
| `GET /api/swagger` | `404` |
| `GET /api/vehicles` without auth | `401` |
| `POST /api/auth/login` with Admin seed account | `200` |
| `GET /api/auth/me` after login | `200` |
| `GET /api/users` as Admin | `200` |
| `GET /api/users` as Staff | `403` |
| `GET /api/vehicles` as Staff | `200` |
| `GET /api/dashboard/timeline` with date range | `200` |
| `GET /api/reports/daily-bookings` with date range | `200` |
| `GET http://localhost:5173` | `200` |
