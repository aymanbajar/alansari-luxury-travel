import bcrypt from "bcrypt";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const maybeDescribe = testDatabaseUrl ? describe : describe.skip;

if (testDatabaseUrl) {
  process.env.DATABASE_URL = testDatabaseUrl;
  process.env.JWT_ACCESS_SECRET = "test-access-secret-that-is-long-enough";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret-that-is-long-enough";
  process.env.CORS_ORIGIN = "http://localhost:5173";
}

maybeDescribe("booking concurrency integration", () => {
  let prisma: Awaited<typeof import("../src/lib/prisma.js")>["prisma"];
  let bookingService: Awaited<typeof import("../src/modules/bookings/booking.service.js")>;
  const suffix = crypto.randomUUID().slice(0, 8);
  const adminId = crypto.randomUUID();
  const customerId = crypto.randomUUID();
  const vehicleId = crypto.randomUUID();
  const driverId = crypto.randomUUID();

  beforeAll(async () => {
    ({ prisma } = await import("../src/lib/prisma.js"));
    bookingService = await import("../src/modules/bookings/booking.service.js");

    await prisma.user.create({
      data: {
        id: adminId,
        fullName: "Concurrency Admin",
        email: `concurrency-${suffix}@alansari.local`,
        passwordHash: await bcrypt.hash("ValidPass123", 4),
        role: "ADMIN"
      }
    });
    await prisma.customer.create({
      data: {
        id: customerId,
        fullName: "Concurrency Customer",
        phoneCountryCode: "+966",
        phoneNumber: `500${suffix.replace(/\D/g, "").padEnd(6, "0").slice(0, 6)}`
      }
    });
    await prisma.vehicle.create({
      data: {
        id: vehicleId,
        plateNumber: `CON-${suffix}`,
        make: "Toyota",
        model: "Hiace",
        year: 2026,
        passengerCapacity: 12,
        status: "AVAILABLE"
      }
    });
    await prisma.driver.create({
      data: {
        id: driverId,
        fullName: "Concurrency Driver",
        phoneNumber: `+9665${suffix.replace(/\D/g, "").padEnd(8, "1").slice(0, 8)}`,
        status: "AVAILABLE",
        overnightDailyRate: "250.00"
      }
    });
  });

  afterAll(async () => {
    if (!prisma) {
      return;
    }

    await prisma.booking.deleteMany({ where: { voucherNumber: { startsWith: `CON-${suffix}` } } });
    await prisma.driver.deleteMany({ where: { id: driverId } });
    await prisma.vehicle.deleteMany({ where: { id: vehicleId } });
    await prisma.customer.deleteMany({ where: { id: customerId } });
    await prisma.user.deleteMany({ where: { id: adminId } });
    await prisma.$disconnect();
  });

  it("allows exactly one simultaneous overlapping booking for the same vehicle and driver", async () => {
    const first = bookingService.createBooking(
      {
        voucherNumber: `CON-${suffix}-A`,
        customerId,
        vehicleId,
        driverId,
        startAt: "2026-09-01T08:00:00.000Z",
        endAt: "2026-09-01T12:00:00.000Z",
        tripType: "CITY",
        destination: "Riyadh",
        status: "CONFIRMED"
      },
      { id: adminId, role: "ADMIN" }
    );
    const second = bookingService.createBooking(
      {
        voucherNumber: `CON-${suffix}-B`,
        customerId,
        vehicleId,
        driverId,
        startAt: "2026-09-01T09:00:00.000Z",
        endAt: "2026-09-01T11:00:00.000Z",
        tripType: "CITY",
        destination: "Riyadh",
        status: "CONFIRMED"
      },
      { id: adminId, role: "ADMIN" }
    );

    const results = await Promise.allSettled([first, second]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(
      results.filter(
        (result) =>
          result.status === "rejected" &&
          typeof result.reason === "object" &&
          result.reason !== null &&
          "status" in result.reason &&
          result.reason.status === 409
      )
    ).toHaveLength(1);
  });
});
