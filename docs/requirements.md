# Requirements

## Purpose

The Fleet and Booking Management System is an internal platform for a tourism company to manage vehicles, drivers, customers, and bookings with Arabic-first RTL support.

## Roles

### Admin

- Full access to operational and administrative modules.
- Manage staff accounts and permissions.
- Manage vehicles, drivers, customers, and all bookings.
- View dashboard metrics, reports, exports, audit logs, and system settings.

### Staff

- Securely access day-to-day booking workflows.
- Create and update bookings within assigned permissions.
- View available vehicles, drivers, customer details required for bookings, and booking timelines.
- Cannot access staff management, audit administration, or system settings.

## Authentication And Permissions

- The planned authentication model is JWT-based with secure HTTP-only cookies.
- Passwords must be hashed before storage.
- Authorization must be enforced by the backend using role-based access control.
- Frontend route hiding is only a usability layer and must not be treated as security.
- Every protected API action must identify the actor for audit logging.

## Vehicle Management

- Admins can create, update, soft-delete, and restore vehicles.
- Staff can view vehicle availability and operational details needed for bookings.
- Initial vehicle statuses are `AVAILABLE`, `BOOKED`, `MAINTENANCE`, `OUT_OF_SERVICE`, and `INACTIVE`.
- Frequently searched fields include plate number, status, capacity, and assigned bookings.

## Driver Management

- Admins can create, update, soft-delete, and restore drivers.
- Staff can view driver availability and booking assignment details.
- Initial driver statuses are `AVAILABLE`, `ASSIGNED`, `ON_LEAVE`, and `INACTIVE`.
- Driver records must include contact and license information in later phases.

## Customer Management

- Admins and permitted staff can create and update customer records.
- Customer information must be limited to booking-relevant details.
- Customer search should support name and phone number.

## Booking Management

- Bookings connect a customer, vehicle, driver, time window, pickup, dropoff, and status.
- Initial booking statuses are `DRAFT`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, and `CANCELLED`.
- All booking timestamps are stored in UTC and displayed in the configured local timezone.
- Future implementation must validate booking input on both frontend and backend.

## Booking Status Lifecycle

- `DRAFT`: booking is being prepared and does not represent final operational commitment until business rules define otherwise.
- `CONFIRMED`: booking is approved and reserves vehicle/driver availability.
- `IN_PROGRESS`: trip has started.
- `COMPLETED`: trip has ended and is locked for normal edits.
- `CANCELLED`: booking no longer reserves resources.

## Conflict Prevention

- A vehicle must not be assigned to overlapping active bookings.
- A driver must not be assigned to overlapping active bookings.
- Conflict checks must run in backend services and critical writes must use database transactions.
- Cancelled and soft-deleted records should not block availability unless future policy says otherwise.

## Overnight Stay Rules

- Overnight stays belong to a booking.
- Overnight date ranges must sit inside or be explicitly linked to the booking travel window.
- Overnight stays may affect reports, expenses, and driver availability.

## Dashboard Requirements

- Show daily bookings, available vehicles, available drivers, upcoming trips, and operational alerts.
- Admin dashboard can include wider business statistics.
- Staff dashboard should focus on today and near-future operational work.

## Timeline Requirements

- Timeline must show bookings by date, vehicle, and driver.
- Timeline must support responsive layouts and Arabic labels.
- Conflicts and unavailable resources should be visually clear.

## Reports And Exports

- Planned exports include Excel and PDF.
- Reports should cover bookings, utilization, revenue or costs when configured, driver activity, and overnight stays.
- Export generation must respect permissions and audit sensitive actions.

## Audit Logs

- Important actions must be recorded with actor, action, entity, timestamp, IP address when available, and metadata.
- Audit logs are read-only to normal users.
- Admins can view and filter audit logs.

## Arabic RTL And Responsive UI

- Arabic is the primary UI language.
- Layout must use `dir="rtl"` and avoid left/right assumptions in component design.
- UI must be responsive for desktop, tablet, and mobile.
- Forms, tables, filters, timelines, and reports must remain usable in RTL.
