CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_vehicle_no_overlap"
  EXCLUDE USING gist (
    "vehicleId" WITH =,
    tstzrange("startAt", "endAt", '[)') WITH &&
  )
  WHERE ("deletedAt" IS NULL AND "status" <> 'CANCELLED');

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_driver_no_overlap"
  EXCLUDE USING gist (
    "driverId" WITH =,
    tstzrange("startAt", "endAt", '[)') WITH &&
  )
  WHERE ("deletedAt" IS NULL AND "status" <> 'CANCELLED');
