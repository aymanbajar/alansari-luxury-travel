# Postman Manual API Testing Guide

Backend base URL:

```text
{{baseUrl}} = http://localhost:4000
```

This guide is based on the implemented Express routes, controllers, middleware, and Zod validation schemas in `apps/api`. It does not include unimplemented modules such as Notifications or Audit Logs because no public route files are registered for them.

## Postman Environment Variables

Create a Postman environment with these variables:

```text
baseUrl = http://localhost:4000
adminEmail = admin@alansari.local
adminPassword = <local development password from apps/api/prisma/seed.ts>
staffEmail = staff@alansari.local
staffPassword = <local development password from apps/api/prisma/seed.ts>
csrfToken =
userId =
vehicleId =
driverId =
customerId =
bookingId =
voucherNumber = PM-{{$timestamp}}
```

Do not store production passwords, JWT secrets, cookies, or database credentials in Postman collections.

## Authentication In Postman

The backend uses HTTP-only cookies, not Bearer tokens in the JSON response.

Login sets these cookies:

- `alt_access_token`: HTTP-only access token.
- `alt_refresh_token`: HTTP-only refresh token.
- `alt_csrf_token`: CSRF token cookie.

Postman stores cookies automatically for `localhost`. After `POST {{baseUrl}}/api/auth/login`, open the Cookies link in Postman and confirm cookies exist for `localhost`.

For authenticated state-changing requests after login, add this header:

```text
x-csrf-token: {{csrfToken}}
```

`POST /api/auth/login` and `POST /api/auth/refresh` are CSRF-exempt. Other authenticated `POST`, `PATCH`, and `DELETE` requests require the CSRF header.

Add this Tests script to the login request:

```javascript
const body = pm.response.json();
const csrfToken = pm.cookies.get("alt_csrf_token");

if (csrfToken) {
  pm.environment.set("csrfToken", csrfToken);
}

const userId = body.data?.user?.id;
if (userId) {
  pm.environment.set("userId", userId);
}
```

There is no `accessToken` response field to save.

## Common Response Shape

Successful JSON responses use:

```json
{
  "success": true,
  "data": {}
}
```

Error responses use:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

Common statuses implemented by the API include `200`, `201`, `400`, `401`, `403`, `404`, `409`, `429`, and `500`.

## Headers

For JSON request bodies:

```text
Content-Type: application/json
```

For authenticated mutation requests:

```text
Content-Type: application/json
x-csrf-token: {{csrfToken}}
```

Postman sends stored cookies automatically when using the same host.

## Endpoint Catalog

### Health

#### Health Check

- Method: `GET`
- URL: `{{baseUrl}}/api/health`
- Auth: Public
- Expected success: `200`
- Response data: `{ status, service, timestamp }`

#### Readiness Check

- Method: `GET`
- URL: `{{baseUrl}}/api/ready`
- Auth: Public
- Expected success: `200`
- Response data: `{ status, service, timestamp, checks: { database } }`
- Common errors: `503` if database connectivity fails.

#### Metrics

- Method: `GET`
- URL: `{{baseUrl}}/api/metrics`
- Auth: Public
- Expected success: `200`
- Response: Prometheus-style text metrics.

### Authentication

#### Login

- Method: `POST`
- URL: `{{baseUrl}}/api/auth/login`
- Auth: Public
- Headers: `Content-Type: application/json`
- Expected success: `200`
- Common errors: `400`, `401`, `429`
- Response data: `{ user }`

Body:

```json
{
  "email": "{{adminEmail}}",
  "password": "{{adminPassword}}"
}
```

Validation:

- `email` must be a valid email.
- `password` is required.

#### Refresh Session

- Method: `POST`
- URL: `{{baseUrl}}/api/auth/refresh`
- Auth: Refresh cookie required
- Expected success: `200`
- Common errors: `401`
- Response data: `{ user }`
- Notes: rotates auth cookies.

#### Logout

- Method: `POST`
- URL: `{{baseUrl}}/api/auth/logout`
- Auth: Staff or Admin
- Headers: `x-csrf-token: {{csrfToken}}`
- Expected success: `200`
- Response data: `{ loggedOut: true }`

#### Current User

- Method: `GET`
- URL: `{{baseUrl}}/api/auth/me`
- Auth: Staff or Admin
- Expected success: `200`
- Common errors: `401`
- Response data: `{ user }`

#### Change Password

- Method: `POST`
- URL: `{{baseUrl}}/api/auth/change-password`
- Auth: Staff or Admin
- Headers: `Content-Type: application/json`, `x-csrf-token: {{csrfToken}}`
- Expected success: `200`
- Common errors: `400`, `401`, `403`
- Response data: `{ passwordChanged: true }`
- Important: successful change clears auth cookies.

Body:

```json
{
  "currentPassword": "{{adminPassword}}",
  "newPassword": "PostmanChange123",
  "confirmPassword": "PostmanChange123"
}
```

Password validation:

- Minimum 10 characters.
- Must include uppercase, lowercase, and a number.
- Confirmation must match.

### Users

All user endpoints require Admin.

#### List Users

- Method: `GET`
- URL: `{{baseUrl}}/api/users`
- Auth: Admin
- Expected success: `200`
- Response data: `{ users }`

#### Create User

- Method: `POST`
- URL: `{{baseUrl}}/api/users`
- Auth: Admin
- Headers: `Content-Type: application/json`, `x-csrf-token: {{csrfToken}}`
- Expected success: `201`
- Common errors: `400`, `401`, `403`, `409`
- Response data: `{ user }`

Body:

```json
{
  "fullName": "Postman Test Staff",
  "email": "postman.staff{{$timestamp}}@alansari.local",
  "role": "STAFF",
  "password": "Postman1234",
  "isActive": true
}
```

Tests script:

```javascript
const body = pm.response.json();
const userId = body.data?.user?.id;
if (userId) {
  pm.environment.set("userId", userId);
}
```

Validation:

- `role`: `ADMIN` or `STAFF`.
- Password follows the same strong password rules.
- Email must be unique.

#### Get User

- Method: `GET`
- URL: `{{baseUrl}}/api/users/{{userId}}`
- Auth: Admin
- Path parameters: `userId` UUID
- Expected success: `200`
- Common errors: `400`, `401`, `403`, `404`
- Response data: `{ user }`

#### Update User

- Method: `PATCH`
- URL: `{{baseUrl}}/api/users/{{userId}}`
- Auth: Admin
- Headers: `Content-Type: application/json`, `x-csrf-token: {{csrfToken}}`
- Expected success: `200`
- Response data: `{ user }`

Body:

```json
{
  "fullName": "Postman Test Staff Updated",
  "role": "STAFF"
}
```

Optional fields: `fullName`, `email`, `role`.

#### Update User Status

- Method: `PATCH`
- URL: `{{baseUrl}}/api/users/{{userId}}/status`
- Auth: Admin
- Headers: `Content-Type: application/json`, `x-csrf-token: {{csrfToken}}`
- Expected success: `200`
- Common errors: `400`, `401`, `403`, `404`
- Response data: `{ user }`

Body:

```json
{
  "isActive": true
}
```

Rules:

- Admin cannot deactivate their own current account.
- The last active Admin cannot be deactivated.

#### Reset User Password

- Method: `POST`
- URL: `{{baseUrl}}/api/users/{{userId}}/reset-password`
- Auth: Admin
- Headers: `Content-Type: application/json`, `x-csrf-token: {{csrfToken}}`
- Expected success: `200`
- Response data: `{ passwordReset: true }`

Body:

```json
{
  "newPassword": "PostmanReset123",
  "confirmPassword": "PostmanReset123"
}
```

### Vehicles

Vehicle read endpoints require Staff or Admin. Vehicle mutations require Admin.

#### List Vehicles

- Method: `GET`
- URL: `{{baseUrl}}/api/vehicles?page=1&pageSize=10&sortBy=createdAt&sortDirection=desc`
- Auth: Staff or Admin
- Query parameters: `search`, `status`, `page`, `pageSize`, `sortBy`, `sortDirection`
- Expected success: `200`
- Response data: `{ vehicles, pagination }`

Allowed values:

- `status`: `AVAILABLE`, `BOOKED`, `MAINTENANCE`, `OUT_OF_SERVICE`, `INACTIVE`
- `sortBy`: `plateNumber`, `createdAt`, `status`
- `sortDirection`: `asc`, `desc`

#### Create Vehicle

- Method: `POST`
- URL: `{{baseUrl}}/api/vehicles`
- Auth: Admin
- Headers: `Content-Type: application/json`, `x-csrf-token: {{csrfToken}}`
- Expected success: `201`
- Common errors: `400`, `401`, `403`, `409`
- Response data: `{ vehicle }`

Body:

```json
{
  "plateNumber": "PM-{{$timestamp}}",
  "make": "Mercedes",
  "model": "Vito",
  "year": 2024,
  "passengerCapacity": 8,
  "status": "AVAILABLE",
  "notes": "Postman test vehicle"
}
```

Tests script:

```javascript
const body = pm.response.json();
const vehicleId = body.data?.vehicle?.id;
if (vehicleId) {
  pm.environment.set("vehicleId", vehicleId);
}
```

Validation:

- `plateNumber` is required, trimmed, normalized to uppercase, and unique.
- `make` and `model` are required.
- `year`: integer from `1990` to `2100`.
- `passengerCapacity`: positive integer.

#### Get Vehicle

- Method: `GET`
- URL: `{{baseUrl}}/api/vehicles/{{vehicleId}}`
- Auth: Staff or Admin
- Expected success: `200`
- Response data: `{ vehicle }`

#### Update Vehicle

- Method: `PATCH`
- URL: `{{baseUrl}}/api/vehicles/{{vehicleId}}`
- Auth: Admin
- Headers: `Content-Type: application/json`, `x-csrf-token: {{csrfToken}}`
- Expected success: `200`
- Response data: `{ vehicle }`

Body:

```json
{
  "make": "Mercedes-Benz",
  "model": "Vito Tourer",
  "year": 2025,
  "passengerCapacity": 8,
  "notes": "Updated from Postman"
}
```

#### Update Vehicle Status

- Method: `PATCH`
- URL: `{{baseUrl}}/api/vehicles/{{vehicleId}}/status`
- Auth: Admin
- Headers: `Content-Type: application/json`, `x-csrf-token: {{csrfToken}}`
- Expected success: `200`
- Response data: `{ vehicle }`

Body:

```json
{
  "status": "AVAILABLE"
}
```

#### Soft Delete Vehicle

- Method: `DELETE`
- URL: `{{baseUrl}}/api/vehicles/{{vehicleId}}`
- Auth: Admin
- Headers: `x-csrf-token: {{csrfToken}}`
- Expected success: `200`
- Response data: `{ vehicle }`

### Drivers

Driver read endpoints require Staff or Admin. Driver mutations require Admin.

#### List Drivers

- Method: `GET`
- URL: `{{baseUrl}}/api/drivers?page=1&pageSize=10&sortBy=createdAt&sortDirection=desc`
- Auth: Staff or Admin
- Query parameters: `search`, `status`, `page`, `pageSize`, `sortBy`, `sortDirection`
- Expected success: `200`
- Response data: `{ drivers, pagination }`

Allowed values:

- `status`: `AVAILABLE`, `ASSIGNED`, `ON_LEAVE`, `INACTIVE`
- `sortBy`: `fullName`, `createdAt`, `status`
- `sortDirection`: `asc`, `desc`

#### Create Driver

- Method: `POST`
- URL: `{{baseUrl}}/api/drivers`
- Auth: Admin
- Headers: `Content-Type: application/json`, `x-csrf-token: {{csrfToken}}`
- Expected success: `201`
- Response data: `{ driver }`

Body:

```json
{
  "fullName": "Postman Test Driver",
  "phoneNumber": "+966500123456",
  "status": "AVAILABLE",
  "overnightDailyRate": 275,
  "notes": "Postman test driver"
}
```

Tests script:

```javascript
const body = pm.response.json();
const driverId = body.data?.driver?.id;
if (driverId) {
  pm.environment.set("driverId", driverId);
}
```

Validation:

- `fullName`: 2 to 160 characters.
- `phoneNumber`: 7 to 40 characters, digits, spaces, dashes, optional leading `+`.
- `overnightDailyRate`: non-negative number.

#### Get Driver

- Method: `GET`
- URL: `{{baseUrl}}/api/drivers/{{driverId}}`
- Auth: Staff or Admin
- Expected success: `200`
- Response data: `{ driver }`

#### Update Driver

- Method: `PATCH`
- URL: `{{baseUrl}}/api/drivers/{{driverId}}`
- Auth: Admin
- Headers: `Content-Type: application/json`, `x-csrf-token: {{csrfToken}}`
- Expected success: `200`
- Response data: `{ driver }`

Body:

```json
{
  "fullName": "Postman Test Driver Updated",
  "phoneNumber": "+966500123456",
  "overnightDailyRate": 300,
  "notes": "Updated from Postman"
}
```

#### Update Driver Status

- Method: `PATCH`
- URL: `{{baseUrl}}/api/drivers/{{driverId}}/status`
- Auth: Admin
- Headers: `Content-Type: application/json`, `x-csrf-token: {{csrfToken}}`
- Expected success: `200`
- Response data: `{ driver }`

Body:

```json
{
  "status": "AVAILABLE"
}
```

#### Soft Delete Driver

- Method: `DELETE`
- URL: `{{baseUrl}}/api/drivers/{{driverId}}`
- Auth: Admin
- Headers: `x-csrf-token: {{csrfToken}}`
- Expected success: `200`
- Response data: `{ driver }`

### Customers

Customer endpoints require Staff or Admin.

#### List Customers

- Method: `GET`
- URL: `{{baseUrl}}/api/customers?page=1&pageSize=10&sortBy=createdAt&sortDirection=desc`
- Auth: Staff or Admin
- Query parameters: `search`, `page`, `pageSize`, `sortBy`, `sortDirection`
- Expected success: `200`
- Response data: `{ customers, pagination }`

Allowed values:

- `sortBy`: `fullName`, `createdAt`
- `sortDirection`: `asc`, `desc`

#### Create Customer

- Method: `POST`
- URL: `{{baseUrl}}/api/customers`
- Auth: Staff or Admin
- Headers: `Content-Type: application/json`, `x-csrf-token: {{csrfToken}}`
- Expected success: `201`
- Response data: `{ customer, possibleMatches }`

Body:

```json
{
  "fullName": "Postman Test Customer",
  "phoneCountryCode": "+966",
  "phoneNumber": "555123456",
  "nationality": "Saudi",
  "notes": "Postman test customer"
}
```

Tests script:

```javascript
const body = pm.response.json();
const customerId = body.data?.customer?.id;
if (customerId) {
  pm.environment.set("customerId", customerId);
}
```

Validation:

- `fullName`: 2 to 160 characters.
- `phoneCountryCode`: 1 to 8 characters.
- `phoneNumber`: 5 to 40 characters, normalized to digits.
- Possible duplicates are returned by matching normalized phone country code and number.

#### Get Customer

- Method: `GET`
- URL: `{{baseUrl}}/api/customers/{{customerId}}`
- Auth: Staff or Admin
- Expected success: `200`
- Response data: `{ customer }`

#### Get Customer Bookings

- Method: `GET`
- URL: `{{baseUrl}}/api/customers/{{customerId}}/bookings`
- Auth: Staff or Admin
- Expected success: `200`
- Response data: `{ bookings }`

#### Update Customer

- Method: `PATCH`
- URL: `{{baseUrl}}/api/customers/{{customerId}}`
- Auth: Staff or Admin
- Headers: `Content-Type: application/json`, `x-csrf-token: {{csrfToken}}`
- Expected success: `200`
- Response data: `{ customer, possibleMatches }`

Body:

```json
{
  "fullName": "Postman Test Customer Updated",
  "phoneCountryCode": "+966",
  "phoneNumber": "555123456",
  "nationality": "Saudi",
  "notes": "Updated from Postman"
}
```

#### Delete Customer

- Method: `DELETE`
- URL: `{{baseUrl}}/api/customers/{{customerId}}`
- Auth: Staff or Admin
- Headers: `x-csrf-token: {{csrfToken}}`
- Expected success: `200`
- Response data: `{ customer }`

### Bookings

Booking endpoints require Staff or Admin. Status transition and role restrictions are enforced by the service.

#### List Bookings

- Method: `GET`
- URL: `{{baseUrl}}/api/bookings?page=1&pageSize=10&sortBy=startAt&sortDirection=desc`
- Auth: Staff or Admin
- Query parameters: `voucherNumber`, `status`, `customerId`, `vehicleId`, `driverId`, `startFrom`, `startTo`, `page`, `pageSize`, `sortBy`, `sortDirection`
- Expected success: `200`
- Response data: `{ bookings, pagination }`

Allowed values:

- `status`: `DRAFT`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`
- `sortBy`: `startAt`, `createdAt`, `voucherNumber`, `status`
- `sortDirection`: `asc`, `desc`

#### Create City Booking

- Method: `POST`
- URL: `{{baseUrl}}/api/bookings`
- Auth: Staff or Admin
- Headers: `Content-Type: application/json`, `x-csrf-token: {{csrfToken}}`
- Expected success: `201`
- Common errors: `400`, `401`, `403`, `409`
- Response data: `{ booking }`

Body:

```json
{
  "voucherNumber": "{{voucherNumber}}",
  "customerId": "{{customerId}}",
  "vehicleId": "{{vehicleId}}",
  "driverId": "{{driverId}}",
  "startAt": "2026-09-10T08:00:00.000Z",
  "endAt": "2026-09-10T10:00:00.000Z",
  "tripType": "CITY",
  "destination": "Riyadh City Tour",
  "status": "CONFIRMED",
  "notes": "Postman city booking"
}
```

Tests script:

```javascript
const body = pm.response.json();
const bookingId = body.data?.booking?.id;
const voucherNumber = body.data?.booking?.voucherNumber;

if (bookingId) {
  pm.environment.set("bookingId", bookingId);
}

if (voucherNumber) {
  pm.environment.set("voucherNumber", voucherNumber);
}
```

Validation and rules:

- `endAt` must be later than `startAt`.
- `customerId`, `vehicleId`, and `driverId` must be active assignable records.
- `voucherNumber` must be unique.
- `CITY` bookings must not include `overnightStay`.
- Active overlapping bookings for the same vehicle or driver return `409`.

#### Create Overnight Booking

Body:

```json
{
  "voucherNumber": "PM-OVN-{{$timestamp}}",
  "customerId": "{{customerId}}",
  "vehicleId": "{{vehicleId}}",
  "driverId": "{{driverId}}",
  "startAt": "2026-09-12T08:00:00.000Z",
  "endAt": "2026-09-14T18:00:00.000Z",
  "tripType": "OVERNIGHT",
  "destination": "AlUla",
  "status": "CONFIRMED",
  "overnightStay": {
    "city": "AlUla",
    "accommodationName": "Postman Test Hotel",
    "checkInDate": "2026-09-12",
    "checkOutDate": "2026-09-14",
    "notes": "Postman overnight stay"
  },
  "notes": "Postman overnight booking"
}
```

Admin-only overnight override fields:

```json
{
  "driverDailyRate": 350,
  "totalDriverCost": 700,
  "overrideReason": "Postman admin override test"
}
```

Staff users cannot override overnight costs.

#### Get Booking

- Method: `GET`
- URL: `{{baseUrl}}/api/bookings/{{bookingId}}`
- Auth: Staff or Admin
- Expected success: `200`
- Response data: `{ booking }`

#### Update Booking

- Method: `PATCH`
- URL: `{{baseUrl}}/api/bookings/{{bookingId}}`
- Auth: Staff or Admin
- Headers: `Content-Type: application/json`, `x-csrf-token: {{csrfToken}}`
- Expected success: `200`
- Response data: `{ booking }`

Body:

```json
{
  "destination": "Riyadh Updated Destination",
  "startAt": "2026-09-10T09:00:00.000Z",
  "endAt": "2026-09-10T11:00:00.000Z",
  "notes": "Updated from Postman"
}
```

#### Update Booking Status

- Method: `PATCH`
- URL: `{{baseUrl}}/api/bookings/{{bookingId}}/status`
- Auth: Staff or Admin
- Headers: `Content-Type: application/json`, `x-csrf-token: {{csrfToken}}`
- Expected success: `200`
- Response data: `{ booking }`

Body:

```json
{
  "status": "IN_PROGRESS"
}
```

Rules:

- Allowed status values: `DRAFT`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`.
- Cancelled bookings cannot return to `IN_PROGRESS` or `COMPLETED`.
- Only Admin can perform exceptional reopen/status changes.
- Completed bookings are read-only for Staff.

#### Cancel Booking

- Method: `POST`
- URL: `{{baseUrl}}/api/bookings/{{bookingId}}/cancel`
- Auth: Staff or Admin
- Headers: `Content-Type: application/json`, `x-csrf-token: {{csrfToken}}`
- Expected success: `200`
- Response data: `{ booking }`

Body:

```json
{
  "reason": "Cancelled from Postman test"
}
```

### Availability

Availability endpoints require Staff or Admin.

#### Check Availability

- Method: `POST`
- URL: `{{baseUrl}}/api/availability/check`
- Auth: Staff or Admin
- Headers: `Content-Type: application/json`, `x-csrf-token: {{csrfToken}}`
- Expected success: `200`
- Response data: `{ availability }`

Body:

```json
{
  "startAt": "2026-09-10T08:00:00.000Z",
  "endAt": "2026-09-10T10:00:00.000Z",
  "vehicleId": "{{vehicleId}}",
  "driverId": "{{driverId}}",
  "passengerCapacity": 4,
  "tripType": "CITY"
}
```

Validation:

- `startAt` and `endAt` are ISO-8601 strings with timezone offset.
- `endAt` must be later than `startAt`.
- Optional `bookingId` excludes a booking while editing.

#### Available Vehicles

- Method: `GET`
- URL: `{{baseUrl}}/api/availability/vehicles?startAt=2026-09-10T08%3A00%3A00.000Z&endAt=2026-09-10T10%3A00%3A00.000Z&passengerCapacity=4&tripType=CITY`
- Auth: Staff or Admin
- Expected success: `200`
- Response data: `{ vehicles }`

#### Available Drivers

- Method: `GET`
- URL: `{{baseUrl}}/api/availability/drivers?startAt=2026-09-10T08%3A00%3A00.000Z&endAt=2026-09-10T10%3A00%3A00.000Z&tripType=CITY`
- Auth: Staff or Admin
- Expected success: `200`
- Response data: `{ drivers }`

#### Availability Suggestions

- Method: `GET`
- URL: `{{baseUrl}}/api/availability/suggestions?startAt=2026-09-10T08%3A00%3A00.000Z&endAt=2026-09-10T10%3A00%3A00.000Z&passengerCapacity=4&tripType=CITY`
- Auth: Staff or Admin
- Expected success: `200`
- Response data: `{ vehicles, drivers }`

### Dashboard

Dashboard endpoints require Staff or Admin.

#### Dashboard Summary

- Method: `GET`
- URL: `{{baseUrl}}/api/dashboard/summary`
- Auth: Staff or Admin
- Query parameters: optional `startFrom`, `endTo`
- Expected success: `200`
- Response data: `{ dashboard }`

Date range example:

```text
{{baseUrl}}/api/dashboard/summary?startFrom=2026-09-10T00%3A00%3A00.000Z&endTo=2026-09-11T00%3A00%3A00.000Z
```

#### Vehicle Timeline

- Method: `GET`
- URL: `{{baseUrl}}/api/dashboard/timeline?startFrom=2026-09-10T00%3A00%3A00.000Z&endTo=2026-09-11T00%3A00%3A00.000Z&view=day`
- Auth: Staff or Admin
- Expected success: `200`
- Response data: `{ timeline }`

Required query parameters:

- `startFrom`
- `endTo`

Optional query parameters:

- `view`: `day`, `week`, `month`
- `vehicleId`, `vehicleStatus`, `driverId`, `customerId`, `bookingStatus`, `tripType`, `overnightOnly`, `voucherNumber`

### Reports

Report endpoints require Staff or Admin. Some report types are restricted by backend role checks.

#### Report Definitions

- Method: `GET`
- URL: `{{baseUrl}}/api/reports`
- Auth: Staff or Admin
- Expected success: `200`
- Response data: `{ reports }`

#### Report Preview

- Method: `GET`
- URL: `{{baseUrl}}/api/reports/daily-bookings?startDate=2026-09-10&endDate=2026-09-10`
- Auth: Staff or Admin
- Expected success: `200`
- Response data: `{ report }`

Supported `:type` values:

```text
daily-bookings
daily-dispatch
weekly-bookings
monthly-bookings
bookings-by-vehicle
bookings-by-driver
customer-history
overnight-stays
overnight-driver-costs
cancelled-bookings
vehicle-utilization
vehicle-service-status
booking-expenses
```

Common query parameters:

- Required: `startDate`, `endDate` in `YYYY-MM-DD`
- Optional: `vehicleId`, `driverId`, `customerId`, `bookingStatus`, `tripType`, `overnightOnly`, `destination`, `voucherNumber`

Rules:

- `endDate` must be on or after `startDate`.
- Date range cannot exceed 370 days.

#### Export Report

- Method: `GET`
- URL: `{{baseUrl}}/api/reports/daily-bookings/export?startDate=2026-09-10&endDate=2026-09-10&format=excel`
- Auth: Staff or Admin
- Expected success: `200`
- Response: binary Excel or PDF file
- Query parameter `format`: `excel` or `pdf`

In Postman, use Send and Download for this endpoint.

### Settings

#### Get Overnight Settings

- Method: `GET`
- URL: `{{baseUrl}}/api/settings/overnight`
- Auth: Staff or Admin
- Expected success: `200`
- Response data: `{ settings }`

#### Update Overnight Settings

- Method: `PATCH`
- URL: `{{baseUrl}}/api/settings/overnight`
- Auth: Admin
- Headers: `Content-Type: application/json`, `x-csrf-token: {{csrfToken}}`
- Expected success: `200`
- Response data: `{ settings }`

Body:

```json
{
  "defaultDriverDailyRate": 275,
  "preTripBufferHours": 12,
  "postTripBufferHours": 12,
  "currency": "SAR",
  "timezone": "Asia/Riyadh"
}
```

Validation:

- Rates and buffer hours cannot be negative.
- Buffer hours cannot exceed `168`.
- `currency` must be a 3-letter uppercase code.
- `timezone` is required.

## Recommended Manual Testing Order

1. `GET /api/health`.
2. `GET /api/ready`.
3. `GET /api/vehicles` without login, expect `401`.
4. `POST /api/auth/login` with invalid credentials, expect `401`.
5. `POST /api/auth/login` as Admin.
6. Save `csrfToken` and `userId` from the login Tests script.
7. `GET /api/auth/me`.
8. `GET /api/users`.
9. `POST /api/vehicles`, save `vehicleId`.
10. `POST /api/drivers`, save `driverId`.
11. `POST /api/customers`, save `customerId`.
12. `GET /api/availability/suggestions` with the booking date range.
13. `POST /api/bookings` using saved `customerId`, `vehicleId`, and `driverId`; save `bookingId`.
14. `GET /api/bookings/{{bookingId}}`.
15. `PATCH /api/bookings/{{bookingId}}`.
16. `POST /api/availability/check` using `bookingId` to exclude itself.
17. Try an overlapping booking with the same vehicle and driver; expect `409`.
18. Try an adjacent booking ending or starting exactly at the other booking boundary; expect success if voucher number is unique.
19. `POST /api/bookings/{{bookingId}}/cancel`.
20. Confirm availability no longer blocks because cancelled bookings do not block.
21. `POST /api/auth/logout`.
22. `GET /api/auth/me`, expect `401`.
23. Login as Staff.
24. `GET /api/vehicles`, expect `200`.
25. `GET /api/users`, expect `403`.

## Booking Conflict Test Data

Use dates far in the future and a fresh `voucherNumber` for each create request.

Base booking:

```json
{
  "voucherNumber": "PM-CONFLICT-A-{{$timestamp}}",
  "customerId": "{{customerId}}",
  "vehicleId": "{{vehicleId}}",
  "driverId": "{{driverId}}",
  "startAt": "2026-09-20T08:00:00.000Z",
  "endAt": "2026-09-20T12:00:00.000Z",
  "tripType": "CITY",
  "destination": "Riyadh",
  "status": "CONFIRMED",
  "notes": "Base conflict test booking"
}
```

Exact same period, expect `409`:

```json
{
  "voucherNumber": "PM-CONFLICT-B-{{$timestamp}}",
  "customerId": "{{customerId}}",
  "vehicleId": "{{vehicleId}}",
  "driverId": "{{driverId}}",
  "startAt": "2026-09-20T08:00:00.000Z",
  "endAt": "2026-09-20T12:00:00.000Z",
  "tripType": "CITY",
  "destination": "Riyadh",
  "status": "CONFIRMED",
  "notes": "Exact overlap should fail"
}
```

Partial overlap at beginning, expect `409`:

```json
{
  "voucherNumber": "PM-CONFLICT-C-{{$timestamp}}",
  "customerId": "{{customerId}}",
  "vehicleId": "{{vehicleId}}",
  "driverId": "{{driverId}}",
  "startAt": "2026-09-20T07:00:00.000Z",
  "endAt": "2026-09-20T09:00:00.000Z",
  "tripType": "CITY",
  "destination": "Riyadh",
  "status": "CONFIRMED",
  "notes": "Partial overlap should fail"
}
```

Adjacent non-overlap using half-open intervals, expect success:

```json
{
  "voucherNumber": "PM-CONFLICT-D-{{$timestamp}}",
  "customerId": "{{customerId}}",
  "vehicleId": "{{vehicleId}}",
  "driverId": "{{driverId}}",
  "startAt": "2026-09-20T12:00:00.000Z",
  "endAt": "2026-09-20T14:00:00.000Z",
  "tripType": "CITY",
  "destination": "Riyadh",
  "status": "CONFIRMED",
  "notes": "Adjacent booking should succeed"
}
```

Driver conflict test:

- Use the same `driverId`.
- Use a different available `vehicleId`.
- Use an overlapping time range.
- Expected status: `409`.

Cancelled booking availability test:

1. Create a booking.
2. Cancel it with `POST /api/bookings/{{bookingId}}/cancel`.
3. Create another booking with the same vehicle, driver, and time range but a new voucher number.
4. Expected result: success because `CANCELLED` bookings do not block availability.

## Postman ID Saving Scripts

Vehicle create:

```javascript
const body = pm.response.json();
const vehicleId = body.data?.vehicle?.id;
if (vehicleId) {
  pm.environment.set("vehicleId", vehicleId);
}
```

Driver create:

```javascript
const body = pm.response.json();
const driverId = body.data?.driver?.id;
if (driverId) {
  pm.environment.set("driverId", driverId);
}
```

Customer create:

```javascript
const body = pm.response.json();
const customerId = body.data?.customer?.id;
if (customerId) {
  pm.environment.set("customerId", customerId);
}
```

Booking create:

```javascript
const body = pm.response.json();
const bookingId = body.data?.booking?.id;
const voucherNumber = body.data?.booking?.voucherNumber;

if (bookingId) {
  pm.environment.set("bookingId", bookingId);
}

if (voucherNumber) {
  pm.environment.set("voucherNumber", voucherNumber);
}
```

Current user:

```javascript
const body = pm.response.json();
const userId = body.data?.user?.id;
if (userId) {
  pm.environment.set("userId", userId);
}
```

## Common Errors And Fixes

- `401 UNAUTHORIZED`: log in again; cookies may be missing or expired.
- `403 CSRF_TOKEN_INVALID`: send `x-csrf-token: {{csrfToken}}` on authenticated mutations.
- `403 FORBIDDEN`: the logged-in role is not allowed; test with Admin when required.
- `400 VALIDATION_ERROR`: body, query, or path parameter does not match the Zod schema.
- `400 VEHICLE_NOT_ASSIGNABLE`: vehicle is inactive, under maintenance, or out of service.
- `400 DRIVER_NOT_ASSIGNABLE`: driver is inactive.
- `409 CONFLICT`: duplicate plate number, duplicate voucher number, or overlapping booking.
- `409 BOOKING_CONFLICT`: vehicle or driver overlaps an existing active booking.
- `429 RATE_LIMITED`: too many login attempts; wait for the configured login rate-limit window.

## Confirmed Local Test Results

These safe probes were verified against `http://localhost:4000` without creating, updating, or deleting business records:

| Request | Status |
| --- | --- |
| `GET /api/health` | `200` |
| `GET /api/ready` | `200` |
| `GET /api/metrics` | `200` |
| `GET /api/vehicles` without auth | `401` |
| `POST /api/auth/login` invalid credentials | `401` |
| `POST /api/auth/login` Admin | `200` |
| `GET /api/auth/me` | `200` |
| `GET /api/users` as Admin | `200` |
| `GET /api/vehicles?page=1&pageSize=5` | `200` |
| `GET /api/drivers?page=1&pageSize=5` | `200` |
| `GET /api/customers?page=1&pageSize=5` | `200` |
| `GET /api/bookings?page=1&pageSize=5` | `200` |
| `GET /api/availability/vehicles` with date range | `200` |
| `GET /api/dashboard/summary` | `200` |
| `GET /api/dashboard/timeline` with date range | `200` |
| `GET /api/reports` | `200` |
| `GET /api/reports/daily-bookings` with date range | `200` |
| `GET /api/settings/overnight` | `200` |
| `POST /api/auth/login` Staff | `200` |
| `GET /api/users` as Staff | `403` |

## Endpoint Count

Total implemented endpoints: `49`.

- Health: `3`
- Authentication: `5`
- Users: `6`
- Vehicles: `6`
- Drivers: `6`
- Customers: `6`
- Bookings: `6`
- Availability: `4`
- Dashboard: `2`
- Reports: `3`
- Settings: `2`
