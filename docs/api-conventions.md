# API Conventions

## Base URL

Local API base URL:

```text
http://localhost:4000/api
```

## Successful Response Format

```json
{
  "success": true,
  "data": {}
}
```

## Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": {}
  }
}
```

## Error Codes

- `VALIDATION_ERROR`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `CONFLICT`
- `INTERNAL_ERROR`

## HTTP Status Guidance

- `200`: successful read or update.
- `201`: successful creation.
- `204`: successful deletion with no body.
- `400`: invalid request.
- `401`: authentication required.
- `403`: authenticated user lacks permission.
- `404`: resource not found.
- `409`: business conflict.
- `500`: unexpected server error.

## Validation

- Validate request body, query, and route params on the backend.
- Use shared schemas when they can safely be shared.
- Frontend validation improves usability but never replaces backend validation.

## Authentication And CSRF

- Authenticated sessions use HTTP-only cookies for access and refresh tokens.
- The refresh token is rotated by `POST /api/auth/refresh`.
- State-changing authenticated requests must send the `x-csrf-token` header matching the readable `alt_csrf_token` cookie.
- Login uses rate limiting and generic failure messages.
- Password hashes are never returned in API responses.

## Auth Routes

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/change-password`

## Admin User Routes

- `GET /api/users`
- `POST /api/users`
- `GET /api/users/:id`
- `PATCH /api/users/:id`
- `PATCH /api/users/:id/status`
- `POST /api/users/:id/reset-password`

## Vehicle Routes

- `GET /api/vehicles`
- `POST /api/vehicles`
- `GET /api/vehicles/:id`
- `PATCH /api/vehicles/:id`
- `PATCH /api/vehicles/:id/status`
- `DELETE /api/vehicles/:id`

Vehicle list query parameters:

- `search`: plate number, make, or model.
- `status`: vehicle status enum.
- `page`, `pageSize`: pagination controls.
- `sortBy`: `plateNumber`, `createdAt`, or `status`.
- `sortDirection`: `asc` or `desc`.

## Driver Routes

- `GET /api/drivers`
- `POST /api/drivers`
- `GET /api/drivers/:id`
- `PATCH /api/drivers/:id`
- `PATCH /api/drivers/:id/status`
- `DELETE /api/drivers/:id`

Driver list query parameters:

- `search`: full name or phone number.
- `status`: driver status enum.
- `page`, `pageSize`: pagination controls.
- `sortBy`: `fullName`, `createdAt`, or `status`.
- `sortDirection`: `asc` or `desc`.

## Customer Routes

- `GET /api/customers`
- `POST /api/customers`
- `GET /api/customers/:id`
- `PATCH /api/customers/:id`
- `DELETE /api/customers/:id`
- `GET /api/customers/:id/bookings`

Customer list query parameters:

- `search`: full name or normalized phone number.
- `page`, `pageSize`: pagination controls.
- `sortBy`: `fullName` or `createdAt`.
- `sortDirection`: `asc` or `desc`.

Create and update responses include `possibleMatches` when another active customer has the same normalized country code and phone number.

## Booking Routes

- `GET /api/bookings`
- `POST /api/bookings`
- `GET /api/bookings/:id`
- `PATCH /api/bookings/:id`
- `PATCH /api/bookings/:id/status`
- `POST /api/bookings/:id/cancel`

Booking list query parameters:

- `voucherNumber`: partial voucher search.
- `status`: booking status enum.
- `customerId`, `vehicleId`, `driverId`: exact filters.
- `startFrom`, `startTo`: ISO datetime filters.
- `page`, `pageSize`: pagination controls.
- `sortBy`: `startAt`, `createdAt`, `voucherNumber`, or `status`.
- `sortDirection`: `asc` or `desc`.

Booking mutations are transactional and audited. Phase 6 rejects overlapping active bookings with HTTP `409`.

Overnight booking payloads may include `overnightStay`:

```json
{
  "tripType": "OVERNIGHT",
  "destination": "AlUla",
  "overnightStay": {
    "city": "AlUla",
    "accommodationName": "Example Hotel",
    "checkInDate": "2026-08-01",
    "checkOutDate": "2026-08-03",
    "notes": "Driver accommodation arranged"
  }
}
```

Admin users may send `driverDailyRate`, `totalDriverCost`, and `overrideReason` for exceptional overnight cost overrides. Staff users cannot override these values.

## Availability Routes

- `POST /api/availability/check`
- `GET /api/availability/vehicles`
- `GET /api/availability/drivers`
- `GET /api/availability/suggestions`

Availability requests accept:

- `startAt`, `endAt`: ISO datetimes. The interval is half-open: `[startAt, endAt)`.
- `bookingId`: optional booking to exclude while editing.
- `vehicleId`, `driverId`: optional selected resources to check.
- `passengerCapacity`: optional minimum vehicle capacity.
- `tripType`: optional trip type.

Conflict responses are sanitized for Staff users and include only the resource type, conflicting booking id, voucher number, visible booking time range, and availability blocking range. Alternative suggestions exclude unavailable resources and resources with overlapping active bookings.

For `OVERNIGHT` trip type, availability checks apply configurable pre-trip and post-trip buffer hours from system settings.

## Dashboard Routes

- `GET /api/dashboard/summary`
- `GET /api/dashboard/timeline`

Both routes require authenticated Admin or Staff access.

`GET /api/dashboard/summary` accepts optional date-range query parameters:

- `startFrom`: ISO datetime.
- `endTo`: ISO datetime.

The response includes aggregated summary cards, today's dispatch list, upcoming bookings, recent booking audit changes, overnight alerts, and vehicle status overview. Staff responses expose operational statistics only and mark restricted financial/admin statistics as hidden.

`GET /api/dashboard/timeline` accepts:

- `startFrom`, `endTo`: required ISO datetimes.
- `view`: `day`, `week`, or `month`.
- `vehicleId`, `vehicleStatus`, `driverId`, `customerId`.
- `bookingStatus`, `tripType`, `overnightOnly`, `voucherNumber`.

Timeline rows are grouped by vehicle and use `availabilityStartAt` / `availabilityEndAt`, so overnight buffer periods are represented consistently with conflict prevention.

## Report Routes

- `GET /api/reports`
- `GET /api/reports/:type`
- `GET /api/reports/:type/export?format=excel`
- `GET /api/reports/:type/export?format=pdf`

Report routes require authenticated Admin or Staff access. Financial reports are Admin-only:

- `overnight-driver-costs`
- `booking-expenses`

Supported report types:

- `daily-bookings`
- `daily-dispatch`
- `weekly-bookings`
- `monthly-bookings`
- `bookings-by-vehicle`
- `bookings-by-driver`
- `customer-history`
- `overnight-stays`
- `overnight-driver-costs`
- `cancelled-bookings`
- `vehicle-utilization`
- `vehicle-service-status`
- `booking-expenses`

Common filters:

- `startDate`, `endDate`: required `YYYY-MM-DD` dates.
- `vehicleId`, `driverId`, `customerId`.
- `bookingStatus`, `tripType`, `overnightOnly`.
- `destination`, `voucherNumber`.

The maximum report date range is 370 days. Export responses use attachment content disposition and return either `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` or `application/pdf`.

Report exports create `REPORT_EXPORTED` audit-log entries with user, report type, filters, format, and timestamp.

## Settings Routes

- `GET /api/settings/overnight`
- `PATCH /api/settings/overnight`

The read route is available to authenticated Staff and Admin users. The update route is Admin-only.

Overnight settings include:

- `defaultDriverDailyRate`
- `preTripBufferHours`
- `postTripBufferHours`
- `currency`
- `timezone`

## Health Check

`GET /api/health`

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "api",
    "timestamp": "2026-07-18T00:00:00.000Z"
  }
}
```
