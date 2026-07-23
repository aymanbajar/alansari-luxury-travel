import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function isPrismaKnownError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

async function expectFailure(action: () => Promise<unknown>, label: string): Promise<void> {
  try {
    await action();
  } catch {
    return;
  }

  throw new Error(`${label} unexpectedly succeeded.`);
}

async function validateSeedData(): Promise<void> {
  const [adminCount, staffCount, vehicleCount, driverCount, customerCount, settingCount] =
    await Promise.all([
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.user.count({ where: { role: "STAFF" } }),
      prisma.vehicle.count(),
      prisma.driver.count(),
      prisma.customer.count(),
      prisma.systemSetting.count({
        where: { key: { in: ["timezone", "currency", "overnightDefaults"] } }
      })
    ]);

  assert(adminCount >= 1, "Expected at least one Admin user.");
  assert(staffCount >= 1, "Expected at least one Staff user.");
  assert(vehicleCount >= 10, "Expected at least 10 vehicles.");
  assert(driverCount >= 5, "Expected at least 5 drivers.");
  assert(customerCount >= 10, "Expected at least 10 customers.");
  assert(settingCount === 3, "Expected timezone, currency, and overnight default settings.");
}

async function validateUniqueFields(): Promise<void> {
  const vehicle = await prisma.vehicle.findFirstOrThrow();

  await expectFailure(
    () =>
      prisma.vehicle.create({
        data: {
          plateNumber: vehicle.plateNumber,
          make: "Validation",
          model: "Duplicate",
          year: 2026,
          passengerCapacity: 4
        }
      }),
    "Duplicate plateNumber check"
  );

  const user = await prisma.user.findFirstOrThrow();

  await expectFailure(
    () =>
      prisma.user.create({
        data: {
          fullName: "Duplicate User",
          email: user.email,
          passwordHash: "not-used",
          role: "STAFF"
        }
      }),
    "Duplicate user email check"
  );
}

async function validateRelationshipsAndVoucherUniqueness(): Promise<void> {
  const [admin, customer, vehicle, driver] = await Promise.all([
    prisma.user.findFirstOrThrow({ where: { role: "ADMIN" } }),
    prisma.customer.findFirstOrThrow(),
    prisma.vehicle.findFirstOrThrow(),
    prisma.driver.findFirstOrThrow()
  ]);

  const voucherNumber = "VALIDATION-VOUCHER-0001";
  await prisma.booking.deleteMany({ where: { voucherNumber } });

  const booking = await prisma.booking.create({
    data: {
      voucherNumber,
      customerId: customer.id,
      vehicleId: vehicle.id,
      driverId: driver.id,
      startAt: new Date("2026-08-01T08:00:00.000Z"),
      endAt: new Date("2026-08-01T12:00:00.000Z"),
      availabilityStartAt: new Date("2026-08-01T08:00:00.000Z"),
      availabilityEndAt: new Date("2026-08-01T12:00:00.000Z"),
      tripType: "CITY",
      destination: "Riyadh",
      status: "CONFIRMED",
      createdById: admin.id
    }
  });
  const loadedBooking = await prisma.booking.findFirstOrThrow({
    where: { id: booking.id },
    include: {
      customer: true,
      vehicle: true,
      driver: true,
      createdBy: true
    }
  });

  assert(
    loadedBooking.customer.id === customer.id,
    "Booking customer relationship did not load correctly."
  );
  assert(
    loadedBooking.vehicle.id === vehicle.id,
    "Booking vehicle relationship did not load correctly."
  );
  assert(
    loadedBooking.driver.id === driver.id,
    "Booking driver relationship did not load correctly."
  );
  assert(
    loadedBooking.createdBy.id === admin.id,
    "Booking createdBy relationship did not load correctly."
  );

  await expectFailure(
    () =>
      prisma.booking.create({
        data: {
          voucherNumber,
          customerId: customer.id,
          vehicleId: vehicle.id,
          driverId: driver.id,
          startAt: new Date("2026-08-02T08:00:00.000Z"),
          endAt: new Date("2026-08-02T12:00:00.000Z"),
          availabilityStartAt: new Date("2026-08-02T08:00:00.000Z"),
          availabilityEndAt: new Date("2026-08-02T12:00:00.000Z"),
          tripType: "CITY",
          destination: "Riyadh",
          status: "CONFIRMED",
          createdById: admin.id
        }
      }),
    "Duplicate voucherNumber check"
  );

  await expectFailure(
    () =>
      prisma.booking.create({
        data: {
          voucherNumber: "VALIDATION-BAD-RELATION",
          customerId: "00000000-0000-0000-0000-000000000000",
          vehicleId: vehicle.id,
          driverId: driver.id,
          startAt: new Date("2026-08-03T08:00:00.000Z"),
          endAt: new Date("2026-08-03T12:00:00.000Z"),
          availabilityStartAt: new Date("2026-08-03T08:00:00.000Z"),
          availabilityEndAt: new Date("2026-08-03T12:00:00.000Z"),
          tripType: "CITY",
          destination: "Riyadh",
          status: "CONFIRMED",
          createdById: admin.id
        }
      }),
    "Required customer relationship check"
  );

  await prisma.booking.delete({ where: { id: booking.id } });
}

async function validateEnumEnforcement(): Promise<void> {
  await expectFailure(
    () =>
      prisma.$executeRawUnsafe(`
        INSERT INTO "Vehicle" ("plateNumber", "make", "model", "year", "passengerCapacity", "status", "updatedAt")
        VALUES ('VALIDATION-ENUM', 'Validation', 'Invalid', 2026, 4, 'FLYING', CURRENT_TIMESTAMP)
      `),
    "Invalid enum value check"
  );
}

async function validateCheckConstraints(): Promise<void> {
  const [admin, customer, vehicle, driver] = await Promise.all([
    prisma.user.findFirstOrThrow({ where: { role: "ADMIN" } }),
    prisma.customer.findFirstOrThrow(),
    prisma.vehicle.findFirstOrThrow(),
    prisma.driver.findFirstOrThrow()
  ]);

  await expectFailure(
    () =>
      prisma.booking.create({
        data: {
          voucherNumber: "VALIDATION-BAD-DATE",
          customerId: customer.id,
          vehicleId: vehicle.id,
          driverId: driver.id,
          startAt: new Date("2026-08-04T12:00:00.000Z"),
          endAt: new Date("2026-08-04T08:00:00.000Z"),
          availabilityStartAt: new Date("2026-08-04T12:00:00.000Z"),
          availabilityEndAt: new Date("2026-08-04T08:00:00.000Z"),
          tripType: "CITY",
          destination: "Riyadh",
          status: "CONFIRMED",
          createdById: admin.id
        }
      }),
    "Booking endAt later than startAt check"
  );
}

async function validateBookingOverlapConstraints(): Promise<void> {
  const [admin, customer, vehicle, secondVehicle, firstDriver, secondDriver] = await Promise.all([
    prisma.user.findFirstOrThrow({ where: { role: "ADMIN" } }),
    prisma.customer.findFirstOrThrow(),
    prisma.vehicle.findFirstOrThrow(),
    prisma.vehicle.findFirstOrThrow({ skip: 1 }),
    prisma.driver.findFirstOrThrow(),
    prisma.driver.findFirstOrThrow({ skip: 1 })
  ]);

  const vouchers = [
    "VALIDATION-OVERLAP-BASE",
    "VALIDATION-OVERLAP-VEHICLE",
    "VALIDATION-OVERLAP-DRIVER",
    "VALIDATION-OVERLAP-CANCELLED"
  ];
  await prisma.booking.deleteMany({ where: { voucherNumber: { in: vouchers } } });

  const baseBooking = await prisma.booking.create({
    data: {
      voucherNumber: "VALIDATION-OVERLAP-BASE",
      customerId: customer.id,
      vehicleId: vehicle.id,
      driverId: firstDriver.id,
      startAt: new Date("2026-08-05T08:00:00.000Z"),
      endAt: new Date("2026-08-05T12:00:00.000Z"),
      availabilityStartAt: new Date("2026-08-05T08:00:00.000Z"),
      availabilityEndAt: new Date("2026-08-05T12:00:00.000Z"),
      tripType: "CITY",
      destination: "Riyadh",
      status: "CONFIRMED",
      createdById: admin.id
    }
  });

  await expectFailure(
    () =>
      prisma.booking.create({
        data: {
          voucherNumber: "VALIDATION-OVERLAP-VEHICLE",
          customerId: customer.id,
          vehicleId: vehicle.id,
          driverId: secondDriver.id,
          startAt: new Date("2026-08-05T09:00:00.000Z"),
          endAt: new Date("2026-08-05T10:00:00.000Z"),
          availabilityStartAt: new Date("2026-08-05T09:00:00.000Z"),
          availabilityEndAt: new Date("2026-08-05T10:00:00.000Z"),
          tripType: "CITY",
          destination: "Riyadh",
          status: "CONFIRMED",
          createdById: admin.id
        }
      }),
    "Vehicle overlap exclusion check"
  );

  await expectFailure(
    () =>
      prisma.booking.create({
        data: {
          voucherNumber: "VALIDATION-OVERLAP-DRIVER",
          customerId: customer.id,
          vehicleId: secondVehicle.id,
          driverId: firstDriver.id,
          startAt: new Date("2026-08-05T11:00:00.000Z"),
          endAt: new Date("2026-08-05T13:00:00.000Z"),
          availabilityStartAt: new Date("2026-08-05T11:00:00.000Z"),
          availabilityEndAt: new Date("2026-08-05T13:00:00.000Z"),
          tripType: "CITY",
          destination: "Riyadh",
          status: "CONFIRMED",
          createdById: admin.id
        }
      }),
    "Driver overlap exclusion check"
  );

  await prisma.booking.create({
    data: {
      voucherNumber: "VALIDATION-OVERLAP-CANCELLED",
      customerId: customer.id,
      vehicleId: vehicle.id,
      driverId: firstDriver.id,
      startAt: new Date("2026-08-05T09:00:00.000Z"),
      endAt: new Date("2026-08-05T10:00:00.000Z"),
      availabilityStartAt: new Date("2026-08-05T09:00:00.000Z"),
      availabilityEndAt: new Date("2026-08-05T10:00:00.000Z"),
      tripType: "CITY",
      destination: "Riyadh",
      status: "CANCELLED",
      cancelledAt: new Date("2026-08-05T07:00:00.000Z"),
      createdById: admin.id
    }
  });

  await prisma.booking.deleteMany({ where: { id: baseBooking.id } });
  await prisma.booking.deleteMany({ where: { voucherNumber: { in: vouchers } } });
}

async function main(): Promise<void> {
  await validateSeedData();
  await validateUniqueFields();
  await validateRelationshipsAndVoucherUniqueness();
  await validateEnumEnforcement();
  await validateCheckConstraints();
  await validateBookingOverlapConstraints();
}

main()
  .then(async () => {
    console.info("Database validation passed.");
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    if (isPrismaKnownError(error)) {
      console.error({ code: error.code, message: error.message, meta: error.meta });
    } else {
      console.error(error);
    }

    await prisma.$disconnect();
    process.exit(1);
  });
