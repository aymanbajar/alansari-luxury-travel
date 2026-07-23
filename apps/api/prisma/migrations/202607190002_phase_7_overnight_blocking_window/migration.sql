ALTER TABLE "Booking"
  ADD COLUMN "availabilityStartAt" TIMESTAMPTZ(3),
  ADD COLUMN "availabilityEndAt" TIMESTAMPTZ(3);

UPDATE "Booking"
SET
  "availabilityStartAt" = "startAt",
  "availabilityEndAt" = "endAt"
WHERE "availabilityStartAt" IS NULL OR "availabilityEndAt" IS NULL;

ALTER TABLE "Booking"
  ALTER COLUMN "availabilityStartAt" SET NOT NULL,
  ALTER COLUMN "availabilityEndAt" SET NOT NULL;

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_availability_time_range_check"
  CHECK ("availabilityEndAt" > "availabilityStartAt");

ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS "Booking_vehicle_no_overlap";
ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS "Booking_driver_no_overlap";

CREATE INDEX "Booking_availabilityStartAt_availabilityEndAt_idx"
  ON "Booking"("availabilityStartAt", "availabilityEndAt");

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_vehicle_no_overlap"
  EXCLUDE USING gist (
    "vehicleId" WITH =,
    tstzrange("availabilityStartAt", "availabilityEndAt", '[)') WITH &&
  )
  WHERE ("deletedAt" IS NULL AND "status" <> 'CANCELLED');

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_driver_no_overlap"
  EXCLUDE USING gist (
    "driverId" WITH =,
    tstzrange("availabilityStartAt", "availabilityEndAt", '[)') WITH &&
  )
  WHERE ("deletedAt" IS NULL AND "status" <> 'CANCELLED');
