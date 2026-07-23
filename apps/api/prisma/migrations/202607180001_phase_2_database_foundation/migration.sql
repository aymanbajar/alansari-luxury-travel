CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'STAFF');
CREATE TYPE "VehicleStatus" AS ENUM ('AVAILABLE', 'BOOKED', 'MAINTENANCE', 'OUT_OF_SERVICE', 'INACTIVE');
CREATE TYPE "DriverStatus" AS ENUM ('AVAILABLE', 'ASSIGNED', 'ON_LEAVE', 'INACTIVE');
CREATE TYPE "BookingStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "TripType" AS ENUM ('AIRPORT_TRANSFER', 'CITY_TOUR', 'INTERCITY', 'MULTI_DAY', 'CUSTOM');
CREATE TYPE "ExpenseType" AS ENUM ('FUEL', 'TOLL', 'PARKING', 'ACCOMMODATION', 'MEAL', 'MAINTENANCE', 'OTHER');
CREATE TYPE "NotificationType" AS ENUM ('SYSTEM', 'BOOKING', 'VEHICLE', 'DRIVER', 'REPORT');

CREATE TABLE "User" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "fullName" VARCHAR(160) NOT NULL,
  "email" VARCHAR(190) NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastLoginAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  "deletedAt" TIMESTAMPTZ(3),
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Vehicle" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "plateNumber" VARCHAR(40) NOT NULL,
  "make" VARCHAR(100) NOT NULL,
  "model" VARCHAR(100) NOT NULL,
  "year" INTEGER NOT NULL,
  "passengerCapacity" INTEGER NOT NULL,
  "status" "VehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  "deletedAt" TIMESTAMPTZ(3),
  CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Vehicle_year_check" CHECK ("year" BETWEEN 1990 AND 2100),
  CONSTRAINT "Vehicle_passengerCapacity_check" CHECK ("passengerCapacity" > 0)
);

CREATE TABLE "Driver" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "fullName" VARCHAR(160) NOT NULL,
  "phoneNumber" VARCHAR(40) NOT NULL,
  "status" "DriverStatus" NOT NULL DEFAULT 'AVAILABLE',
  "overnightDailyRate" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  "deletedAt" TIMESTAMPTZ(3),
  CONSTRAINT "Driver_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Driver_overnightDailyRate_check" CHECK ("overnightDailyRate" >= 0)
);

CREATE TABLE "Customer" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "fullName" VARCHAR(160) NOT NULL,
  "phoneCountryCode" VARCHAR(8) NOT NULL,
  "phoneNumber" VARCHAR(40) NOT NULL,
  "nationality" VARCHAR(80),
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  "deletedAt" TIMESTAMPTZ(3),
  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Booking" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "voucherNumber" VARCHAR(80) NOT NULL,
  "customerId" UUID NOT NULL,
  "vehicleId" UUID NOT NULL,
  "driverId" UUID NOT NULL,
  "startAt" TIMESTAMPTZ(3) NOT NULL,
  "endAt" TIMESTAMPTZ(3) NOT NULL,
  "tripType" "TripType" NOT NULL,
  "destination" VARCHAR(220) NOT NULL,
  "status" "BookingStatus" NOT NULL DEFAULT 'DRAFT',
  "notes" TEXT,
  "createdById" UUID NOT NULL,
  "updatedById" UUID,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  "cancelledAt" TIMESTAMPTZ(3),
  "deletedAt" TIMESTAMPTZ(3),
  CONSTRAINT "Booking_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Booking_time_range_check" CHECK ("endAt" > "startAt"),
  CONSTRAINT "Booking_cancelledAt_check" CHECK (("status" = 'CANCELLED' AND "cancelledAt" IS NOT NULL) OR ("status" <> 'CANCELLED'))
);

CREATE TABLE "OvernightStay" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "bookingId" UUID NOT NULL,
  "city" VARCHAR(120) NOT NULL,
  "accommodationName" VARCHAR(180),
  "checkInDate" DATE NOT NULL,
  "checkOutDate" DATE NOT NULL,
  "nightsCount" INTEGER NOT NULL,
  "driverDailyRate" DECIMAL(12,2) NOT NULL,
  "totalDriverCost" DECIMAL(12,2) NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "OvernightStay_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OvernightStay_date_range_check" CHECK ("checkOutDate" > "checkInDate"),
  CONSTRAINT "OvernightStay_nightsCount_check" CHECK ("nightsCount" > 0),
  CONSTRAINT "OvernightStay_driverDailyRate_check" CHECK ("driverDailyRate" >= 0),
  CONSTRAINT "OvernightStay_totalDriverCost_check" CHECK ("totalDriverCost" >= 0)
);

CREATE TABLE "Expense" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "bookingId" UUID NOT NULL,
  "type" "ExpenseType" NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" CHAR(3) NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "Expense_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Expense_amount_check" CHECK ("amount" >= 0),
  CONSTRAINT "Expense_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$')
);

CREATE TABLE "AuditLog" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID,
  "action" VARCHAR(120) NOT NULL,
  "entityType" VARCHAR(120) NOT NULL,
  "entityId" UUID,
  "oldValues" JSONB,
  "newValues" JSONB,
  "ipAddress" VARCHAR(64),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SystemSetting" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "key" VARCHAR(120) NOT NULL,
  "value" JSONB NOT NULL,
  "description" TEXT,
  "updatedById" UUID,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" VARCHAR(160) NOT NULL,
  "message" TEXT NOT NULL,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_isActive_idx" ON "User"("isActive");
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

CREATE UNIQUE INDEX "Vehicle_plateNumber_key" ON "Vehicle"("plateNumber");
CREATE INDEX "Vehicle_plateNumber_idx" ON "Vehicle"("plateNumber");
CREATE INDEX "Vehicle_status_idx" ON "Vehicle"("status");
CREATE INDEX "Vehicle_deletedAt_idx" ON "Vehicle"("deletedAt");

CREATE INDEX "Driver_phoneNumber_idx" ON "Driver"("phoneNumber");
CREATE INDEX "Driver_status_idx" ON "Driver"("status");
CREATE INDEX "Driver_deletedAt_idx" ON "Driver"("deletedAt");

CREATE INDEX "Customer_fullName_idx" ON "Customer"("fullName");
CREATE INDEX "Customer_phoneCountryCode_phoneNumber_idx" ON "Customer"("phoneCountryCode", "phoneNumber");
CREATE INDEX "Customer_deletedAt_idx" ON "Customer"("deletedAt");

CREATE UNIQUE INDEX "Booking_voucherNumber_key" ON "Booking"("voucherNumber");
CREATE INDEX "Booking_voucherNumber_idx" ON "Booking"("voucherNumber");
CREATE INDEX "Booking_status_idx" ON "Booking"("status");
CREATE INDEX "Booking_customerId_idx" ON "Booking"("customerId");
CREATE INDEX "Booking_vehicleId_idx" ON "Booking"("vehicleId");
CREATE INDEX "Booking_driverId_idx" ON "Booking"("driverId");
CREATE INDEX "Booking_startAt_endAt_idx" ON "Booking"("startAt", "endAt");
CREATE INDEX "Booking_vehicleId_startAt_endAt_idx" ON "Booking"("vehicleId", "startAt", "endAt");
CREATE INDEX "Booking_driverId_startAt_endAt_idx" ON "Booking"("driverId", "startAt", "endAt");
CREATE INDEX "Booking_customerId_startAt_idx" ON "Booking"("customerId", "startAt");
CREATE INDEX "Booking_deletedAt_idx" ON "Booking"("deletedAt");

CREATE INDEX "OvernightStay_bookingId_idx" ON "OvernightStay"("bookingId");
CREATE INDEX "OvernightStay_checkInDate_checkOutDate_idx" ON "OvernightStay"("checkInDate", "checkOutDate");

CREATE INDEX "Expense_bookingId_idx" ON "Expense"("bookingId");
CREATE INDEX "Expense_type_idx" ON "Expense"("type");

CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");
CREATE INDEX "SystemSetting_key_idx" ON "SystemSetting"("key");

CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "Notification_type_idx" ON "Notification"("type");
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OvernightStay" ADD CONSTRAINT "OvernightStay_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SystemSetting" ADD CONSTRAINT "SystemSetting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
