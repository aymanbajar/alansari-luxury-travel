# User Acceptance Testing Checklist

## Login And Permissions

- [ ] Admin can log in.
- [ ] Staff can log in.
- [ ] Staff cannot access staff management.
- [ ] Staff cannot access system settings.
- [ ] Logout clears the session.

## Fleet And Drivers

- [ ] Admin can create, edit, change status, and soft-delete vehicles.
- [ ] Admin can create, edit, change status, and soft-delete drivers.
- [ ] Staff can view vehicles and drivers.
- [ ] Duplicate plate numbers are rejected.

## Customers And Bookings

- [ ] Customer creation and editing works.
- [ ] Duplicate phone warnings appear.
- [ ] Booking creation works for available resources.
- [ ] Overlapping booking is rejected.
- [ ] Adjacent bookings are allowed.
- [ ] Cancelled bookings do not block availability.

## Overnight

- [ ] Overnight fields appear only for overnight trips.
- [ ] Nights count is calculated correctly.
- [ ] Driver overnight cost is calculated correctly.
- [ ] Overnight buffers block conflicting city/evening bookings.
- [ ] Staff cannot override costs.

## Dashboard And Timeline

- [ ] Summary cards match known data.
- [ ] Timeline renders approximately 45 vehicles.
- [ ] Booking details open from the timeline.
- [ ] Filters update timeline results.
- [ ] Mobile layout remains usable.

## Reports

- [ ] Daily booking report preview matches bookings.
- [ ] Daily dispatch sheet exports to Excel.
- [ ] Daily dispatch sheet exports to PDF.
- [ ] Arabic text displays correctly in PDF.
- [ ] Staff cannot access financial reports.

## Arabic RTL

- [ ] Layout direction is RTL.
- [ ] Arabic labels are clear.
- [ ] Forms are usable on mobile.
- [ ] Tables and timeline remain readable.
