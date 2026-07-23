ALTER TYPE "TripType" RENAME TO "TripType_old";

CREATE TYPE "TripType" AS ENUM ('CITY', 'OUTSIDE_CITY', 'OVERNIGHT');

ALTER TABLE "Booking"
  ALTER COLUMN "tripType" TYPE "TripType"
  USING (
    CASE "tripType"::text
      WHEN 'INTERCITY' THEN 'OUTSIDE_CITY'
      WHEN 'MULTI_DAY' THEN 'OVERNIGHT'
      ELSE 'CITY'
    END
  )::"TripType";

DROP TYPE "TripType_old";
