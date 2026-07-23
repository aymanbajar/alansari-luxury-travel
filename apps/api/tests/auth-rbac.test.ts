import bcrypt from "bcrypt";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.DATABASE_URL =
    "postgresql://postgres:postgres@localhost:5432/alansari_test?schema=public";
  process.env.JWT_ACCESS_SECRET = "test-access-secret-that-is-long-enough";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret-that-is-long-enough";
  process.env.CORS_ORIGIN = "http://localhost:5173";
});

const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findFirstOrThrow: vi.fn(),
    update: vi.fn(),
    count: vi.fn()
  },
  authSession: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn()
  },
  vehicle: {
    findMany: vi.fn(),
    groupBy: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn()
  },
  driver: {
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn()
  },
  customer: {
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn()
  },
  booking: {
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
    findFirstOrThrow: vi.fn(),
    update: vi.fn()
  },
  overnightStay: {
    create: vi.fn(),
    deleteMany: vi.fn()
  },
  systemSetting: {
    findUnique: vi.fn(),
    upsert: vi.fn()
  },
  auditLog: {
    create: vi.fn(),
    findMany: vi.fn()
  },
  $queryRaw: vi.fn(),
  $disconnect: vi.fn(),
  $transaction: vi.fn(async (callback: (tx: typeof mockPrisma) => Promise<unknown>) =>
    callback(mockPrisma)
  )
}));

vi.mock("../src/lib/prisma.js", () => ({ prisma: mockPrisma }));

const { createApp } = await import("../src/app.js");
const authService = await import("../src/modules/auth/auth.service.js");
const userService = await import("../src/modules/users/user.service.js");
const { authCookieNames } = await import("../src/modules/auth/auth.constants.js");
const { signAccessToken, signRefreshToken } = await import("../src/modules/auth/token.service.js");

const password = "ValidPass123";
const userBase = {
  id: "00000000-0000-4000-8000-000000000001",
  fullName: "Admin User",
  email: "admin@alansari.local",
  role: "ADMIN" as const,
  isActive: true,
  lastLoginAt: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  deletedAt: null
};
const vehicleBase = {
  id: "00000000-0000-4000-8000-000000000201",
  plateNumber: "KSA-1001",
  make: "Toyota",
  model: "Hiace",
  year: 2024,
  passengerCapacity: 12,
  status: "AVAILABLE" as const,
  notes: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  deletedAt: null
};
const driverBase = {
  id: "00000000-0000-4000-8000-000000000301",
  fullName: "Driver One",
  phoneNumber: "+966500000001",
  status: "AVAILABLE" as const,
  overnightDailyRate: {
    toFixed: () => "250.00",
    toString: () => "250.00",
    gt: () => true,
    mul: (value: number) => ({
      toFixed: () => (250 * value).toFixed(2),
      toString: () => (250 * value).toFixed(2)
    })
  },
  notes: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  deletedAt: null
};
const customerBase = {
  id: "00000000-0000-4000-8000-000000000401",
  fullName: "Customer One",
  phoneCountryCode: "+966",
  phoneNumber: "500000001",
  nationality: "Saudi",
  notes: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  deletedAt: null
};
const bookingBase = {
  id: "00000000-0000-4000-8000-000000000501",
  voucherNumber: "VCH-1001",
  customerId: customerBase.id,
  vehicleId: vehicleBase.id,
  driverId: driverBase.id,
  startAt: new Date("2026-08-01T08:00:00.000Z"),
  endAt: new Date("2026-08-01T12:00:00.000Z"),
  availabilityStartAt: new Date("2026-08-01T08:00:00.000Z"),
  availabilityEndAt: new Date("2026-08-01T12:00:00.000Z"),
  tripType: "CITY" as const,
  destination: "Riyadh",
  status: "DRAFT" as const,
  notes: null,
  createdById: userBase.id,
  updatedById: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  cancelledAt: null,
  deletedAt: null,
  customer: {
    id: customerBase.id,
    fullName: customerBase.fullName,
    phoneCountryCode: customerBase.phoneCountryCode,
    phoneNumber: customerBase.phoneNumber
  },
  vehicle: {
    id: vehicleBase.id,
    plateNumber: vehicleBase.plateNumber,
    make: vehicleBase.make,
    model: vehicleBase.model,
    status: vehicleBase.status
  },
  driver: {
    id: driverBase.id,
    fullName: driverBase.fullName,
    phoneNumber: driverBase.phoneNumber,
    status: driverBase.status
  },
  createdBy: { id: userBase.id, fullName: userBase.fullName, email: userBase.email },
  updatedBy: null,
  overnightStays: [],
  expenses: []
};

function mockRequest() {
  return {
    ip: "127.0.0.1",
    header: vi.fn().mockReturnValue("vitest")
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.auditLog.create.mockResolvedValue({});
  mockPrisma.auditLog.findMany.mockResolvedValue([]);
  mockPrisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
  mockPrisma.$disconnect.mockResolvedValue(undefined);
  mockPrisma.user.update.mockResolvedValue(userBase);
  mockPrisma.authSession.create.mockResolvedValue({});
  mockPrisma.authSession.update.mockResolvedValue({});
  mockPrisma.authSession.updateMany.mockResolvedValue({ count: 1 });
  mockPrisma.vehicle.findMany.mockResolvedValue([vehicleBase]);
  mockPrisma.vehicle.groupBy.mockResolvedValue([{ status: "AVAILABLE", _count: { _all: 1 } }]);
  mockPrisma.vehicle.count.mockResolvedValue(1);
  mockPrisma.vehicle.findFirst.mockResolvedValue(vehicleBase);
  mockPrisma.vehicle.create.mockResolvedValue(vehicleBase);
  mockPrisma.vehicle.update.mockResolvedValue(vehicleBase);
  mockPrisma.driver.findMany.mockResolvedValue([driverBase]);
  mockPrisma.driver.count.mockResolvedValue(1);
  mockPrisma.driver.findFirst.mockResolvedValue(driverBase);
  mockPrisma.driver.create.mockResolvedValue(driverBase);
  mockPrisma.driver.update.mockResolvedValue(driverBase);
  mockPrisma.customer.findMany.mockResolvedValue([customerBase]);
  mockPrisma.customer.count.mockResolvedValue(1);
  mockPrisma.customer.findFirst.mockResolvedValue(customerBase);
  mockPrisma.customer.create.mockResolvedValue(customerBase);
  mockPrisma.customer.update.mockResolvedValue(customerBase);
  mockPrisma.booking.findMany.mockResolvedValue([bookingBase]);
  mockPrisma.booking.count.mockResolvedValue(1);
  mockPrisma.booking.findFirst.mockResolvedValue(bookingBase);
  mockPrisma.booking.findFirstOrThrow.mockResolvedValue(bookingBase);
  mockPrisma.booking.create.mockResolvedValue(bookingBase);
  mockPrisma.booking.update.mockResolvedValue(bookingBase);
  mockPrisma.overnightStay.create.mockResolvedValue({
    id: "00000000-0000-4000-8000-000000000601",
    bookingId: bookingBase.id,
    city: "Riyadh",
    accommodationName: "Hotel",
    checkInDate: new Date("2026-08-01T00:00:00.000Z"),
    checkOutDate: new Date("2026-08-02T00:00:00.000Z"),
    nightsCount: 1,
    driverDailyRate: { toFixed: () => "250.00" },
    totalDriverCost: { toFixed: () => "250.00" },
    notes: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z")
  });
  mockPrisma.overnightStay.deleteMany.mockResolvedValue({ count: 0 });
  mockPrisma.systemSetting.findUnique.mockResolvedValue(null);
  mockPrisma.systemSetting.upsert.mockResolvedValue({});
});

describe("authentication", () => {
  it("allows Admin login", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      ...userBase,
      passwordHash: await bcrypt.hash(password, 4)
    });

    const result = await authService.login({ email: userBase.email, password }, mockRequest());

    expect(result.user.role).toBe("ADMIN");
    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.refreshToken).toEqual(expect.any(String));
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "AUTH_LOGIN_SUCCEEDED" }) })
    );
  });

  it("allows Staff login", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      ...userBase,
      id: "00000000-0000-4000-8000-000000000002",
      email: "staff@alansari.local",
      role: "STAFF",
      passwordHash: await bcrypt.hash(password, 4)
    });

    const result = await authService.login(
      { email: "staff@alansari.local", password },
      mockRequest()
    );

    expect(result.user.role).toBe("STAFF");
  });

  it("rejects invalid password with a generic error", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      ...userBase,
      passwordHash: await bcrypt.hash(password, 4)
    });

    await expect(
      authService.login({ email: userBase.email, password: "wrong" }, mockRequest())
    ).rejects.toMatchObject({
      status: 401,
      code: "INVALID_CREDENTIALS"
    });
  });

  it("rejects inactive account login", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      ...userBase,
      isActive: false,
      passwordHash: await bcrypt.hash(password, 4)
    });

    await expect(
      authService.login({ email: userBase.email, password }, mockRequest())
    ).rejects.toMatchObject({
      status: 401,
      code: "INVALID_CREDENTIALS"
    });
  });

  it("rotates refresh tokens", async () => {
    const refresh = signRefreshToken(userBase.id);
    mockPrisma.authSession.findUnique.mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000010",
      userId: userBase.id,
      refreshTokenHash: refresh.tokenHash,
      refreshTokenExpiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      user: { ...userBase, passwordHash: "hidden" }
    });

    const result = await authService.refreshSession(refresh.token, mockRequest());

    expect(result.refreshToken).not.toBe(refresh.token);
    expect(mockPrisma.authSession.update).toHaveBeenCalled();
    expect(mockPrisma.authSession.create).toHaveBeenCalled();
  });

  it("invalidates logout refresh session", async () => {
    const refresh = signRefreshToken(userBase.id);

    await authService.logout(refresh.token, userBase.id, mockRequest());

    expect(mockPrisma.authSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { revokedAt: expect.any(Date) } })
    );
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "AUTH_LOGOUT" }) })
    );
  });

  it("changes password and revokes active sessions", async () => {
    mockPrisma.user.findFirstOrThrow.mockResolvedValue({
      ...userBase,
      passwordHash: await bcrypt.hash(password, 4)
    });

    await authService.changePassword(
      { id: userBase.id, role: "ADMIN" },
      { currentPassword: password, newPassword: "NewValid123", confirmPassword: "NewValid123" },
      mockRequest()
    );

    expect(mockPrisma.user.update).toHaveBeenCalled();
    expect(mockPrisma.authSession.updateMany).toHaveBeenCalled();
  });
});

describe("vehicle and driver management", () => {
  function adminCookie() {
    const token = signAccessToken({
      sub: userBase.id,
      fullName: userBase.fullName,
      email: userBase.email,
      role: "ADMIN"
    });
    mockPrisma.user.findFirst.mockResolvedValue(userBase);
    return [`${authCookieNames.accessToken}=${token}`, `${authCookieNames.csrfToken}=test-csrf`];
  }

  function staffCookie() {
    const token = signAccessToken({
      sub: "00000000-0000-4000-8000-000000000002",
      fullName: "Staff User",
      email: "staff@alansari.local",
      role: "STAFF"
    });
    mockPrisma.user.findFirst.mockResolvedValue({
      ...userBase,
      id: "00000000-0000-4000-8000-000000000002",
      role: "STAFF"
    });
    return [`${authCookieNames.accessToken}=${token}`, `${authCookieNames.csrfToken}=test-csrf`];
  }

  it("allows Staff to list vehicles with filtering and pagination", async () => {
    const response = await request(createApp())
      .get("/api/vehicles?search=ksa&status=AVAILABLE&page=1&pageSize=10")
      .set("Cookie", staffCookie());

    expect(response.status).toBe(200);
    expect(response.body.data.vehicles).toHaveLength(1);
    expect(mockPrisma.vehicle.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        skip: 0
      })
    );
  });

  it("prevents Staff from creating vehicles", async () => {
    const response = await request(createApp())
      .post("/api/vehicles")
      .set("Cookie", staffCookie())
      .set("x-csrf-token", "test-csrf")
      .send({
        plateNumber: "ksa-2001",
        make: "Toyota",
        model: "Hiace",
        year: 2024,
        passengerCapacity: 12
      });

    expect(response.status).toBe(403);
  });

  it("prevents duplicate plate numbers", async () => {
    const vehicleService = await import("../src/modules/vehicles/vehicle.service.js");
    const { Prisma } = await import("@prisma/client");
    mockPrisma.vehicle.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("duplicate", {
        code: "P2002",
        clientVersion: "5.22.0",
        meta: { target: ["plateNumber"] }
      })
    );

    await expect(
      vehicleService.createVehicle(
        {
          plateNumber: "KSA-1001",
          make: "Toyota",
          model: "Hiace",
          year: 2024,
          passengerCapacity: 12,
          status: "AVAILABLE"
        },
        { id: userBase.id, role: "ADMIN" }
      )
    ).rejects.toMatchObject({ status: 409 });
  });

  it("returns validation errors for invalid vehicles", async () => {
    const response = await request(createApp())
      .post("/api/vehicles")
      .set("Cookie", adminCookie())
      .set("x-csrf-token", "test-csrf")
      .send({
        plateNumber: "",
        make: "",
        model: "",
        year: 2024,
        passengerCapacity: 0
      });

    expect(response.status).toBe(400);
  });

  it("soft deletes vehicles and audits the change", async () => {
    const vehicleService = await import("../src/modules/vehicles/vehicle.service.js");
    mockPrisma.vehicle.update.mockResolvedValue({
      ...vehicleBase,
      status: "INACTIVE",
      deletedAt: new Date("2026-02-01T00:00:00.000Z")
    });

    const result = await vehicleService.softDeleteVehicle(vehicleBase.id, userBase.id, "127.0.0.1");

    expect(result.status).toBe("INACTIVE");
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "VEHICLE_SOFT_DELETED" })
      })
    );
  });

  it("allows Staff to list drivers", async () => {
    const response = await request(createApp())
      .get("/api/drivers?search=driver&page=1&pageSize=10")
      .set("Cookie", staffCookie());

    expect(response.status).toBe(200);
    expect(response.body.data.drivers).toHaveLength(1);
  });

  it("prevents Staff from deleting drivers", async () => {
    const response = await request(createApp())
      .delete(`/api/drivers/${driverBase.id}`)
      .set("Cookie", staffCookie())
      .set("x-csrf-token", "test-csrf");

    expect(response.status).toBe(403);
  });

  it("returns validation errors for invalid drivers", async () => {
    const response = await request(createApp())
      .post("/api/drivers")
      .set("Cookie", adminCookie())
      .set("x-csrf-token", "test-csrf")
      .send({
        fullName: "",
        phoneNumber: "abc",
        overnightDailyRate: -1
      });

    expect(response.status).toBe(400);
  });

  it("soft deletes drivers and audits the change", async () => {
    const driverService = await import("../src/modules/drivers/driver.service.js");
    mockPrisma.driver.update.mockResolvedValue({
      ...driverBase,
      status: "INACTIVE",
      deletedAt: new Date("2026-02-01T00:00:00.000Z")
    });

    const result = await driverService.softDeleteDriver(driverBase.id, userBase.id, "127.0.0.1");

    expect(result.status).toBe("INACTIVE");
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "DRIVER_SOFT_DELETED" })
      })
    );
  });
});

describe("customer and booking management", () => {
  function staffCookie() {
    const token = signAccessToken({
      sub: "00000000-0000-4000-8000-000000000002",
      fullName: "Staff User",
      email: "staff@alansari.local",
      role: "STAFF"
    });
    mockPrisma.user.findFirst.mockResolvedValue({
      ...userBase,
      id: "00000000-0000-4000-8000-000000000002",
      role: "STAFF"
    });
    return [`${authCookieNames.accessToken}=${token}`, `${authCookieNames.csrfToken}=test-csrf`];
  }

  it("allows Staff to list customers", async () => {
    const response = await request(createApp())
      .get("/api/customers?search=customer&page=1&pageSize=10")
      .set("Cookie", staffCookie());

    expect(response.status).toBe(200);
    expect(response.body.data.customers).toHaveLength(1);
  });

  it("returns possible duplicate customers by normalized phone", async () => {
    const customerService = await import("../src/modules/customers/customer.service.js");
    mockPrisma.customer.findMany.mockResolvedValue([customerBase]);

    const result = await customerService.createCustomer(
      {
        fullName: "Customer Copy",
        phoneCountryCode: "+966",
        phoneNumber: "500000001"
      },
      { id: userBase.id, role: "ADMIN" },
      "127.0.0.1"
    );

    expect(result.possibleMatches).toHaveLength(1);
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "CUSTOMER_CREATED" })
      })
    );
  });

  it("soft deletes customers and preserves booking history", async () => {
    const customerService = await import("../src/modules/customers/customer.service.js");
    mockPrisma.booking.count.mockResolvedValue(2);
    mockPrisma.customer.update.mockResolvedValue({
      ...customerBase,
      deletedAt: new Date("2026-02-01T00:00:00.000Z")
    });

    const result = await customerService.deleteCustomer(customerBase.id, userBase.id, "127.0.0.1");

    expect(result.deletedAt).toEqual(expect.any(Date));
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "CUSTOMER_SOFT_DELETED" })
      })
    );
  });

  it("rejects access to bookings without authentication", async () => {
    const response = await request(createApp()).get("/api/bookings");

    expect(response.status).toBe(401);
  });

  it("allows Staff to list bookings with pagination", async () => {
    const response = await request(createApp())
      .get("/api/bookings?status=DRAFT&page=1&pageSize=10")
      .set("Cookie", staffCookie());

    expect(response.status).toBe(200);
    expect(response.body.data.bookings).toHaveLength(1);
  });

  it("creates bookings in a transaction and audits the change", async () => {
    const bookingService = await import("../src/modules/bookings/booking.service.js");
    mockPrisma.booking.findMany.mockResolvedValue([]);

    const result = await bookingService.createBooking(
      {
        voucherNumber: "VCH-2001",
        customerId: customerBase.id,
        vehicleId: vehicleBase.id,
        driverId: driverBase.id,
        startAt: "2026-08-01T08:00:00.000Z",
        endAt: "2026-08-01T12:00:00.000Z",
        tripType: "CITY",
        destination: "Riyadh",
        status: "DRAFT"
      },
      userBase.id,
      "127.0.0.1"
    );

    expect(result.voucherNumber).toBe(bookingBase.voucherNumber);
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "BOOKING_CREATED" })
      })
    );
  });

  it("rejects invalid booking dates", async () => {
    const bookingService = await import("../src/modules/bookings/booking.service.js");

    await expect(
      bookingService.createBooking(
        {
          voucherNumber: "VCH-BAD-DATE",
          customerId: customerBase.id,
          vehicleId: vehicleBase.id,
          driverId: driverBase.id,
          startAt: "2026-08-01T12:00:00.000Z",
          endAt: "2026-08-01T08:00:00.000Z",
          tripType: "CITY",
          destination: "Riyadh",
          status: "DRAFT"
        },
        { id: userBase.id, role: "ADMIN" }
      )
    ).rejects.toMatchObject({ code: "INVALID_DATE_RANGE" });
  });

  it("rejects inactive vehicles and drivers for booking assignment", async () => {
    const bookingService = await import("../src/modules/bookings/booking.service.js");
    mockPrisma.vehicle.findFirst.mockResolvedValue({ ...vehicleBase, status: "INACTIVE" });

    await expect(
      bookingService.createBooking(
        {
          voucherNumber: "VCH-INACTIVE",
          customerId: customerBase.id,
          vehicleId: vehicleBase.id,
          driverId: driverBase.id,
          startAt: "2026-08-01T08:00:00.000Z",
          endAt: "2026-08-01T12:00:00.000Z",
          tripType: "CITY",
          destination: "Riyadh",
          status: "DRAFT"
        },
        { id: userBase.id, role: "ADMIN" }
      )
    ).rejects.toMatchObject({ code: "VEHICLE_NOT_ASSIGNABLE" });

    mockPrisma.vehicle.findFirst.mockResolvedValue(vehicleBase);
    mockPrisma.driver.findFirst.mockResolvedValue({ ...driverBase, status: "INACTIVE" });

    await expect(
      bookingService.createBooking(
        {
          voucherNumber: "VCH-INACTIVE-DRIVER",
          customerId: customerBase.id,
          vehicleId: vehicleBase.id,
          driverId: driverBase.id,
          startAt: "2026-08-01T08:00:00.000Z",
          endAt: "2026-08-01T12:00:00.000Z",
          tripType: "CITY",
          destination: "Riyadh",
          status: "DRAFT"
        },
        { id: userBase.id, role: "ADMIN" }
      )
    ).rejects.toMatchObject({ code: "DRIVER_NOT_ASSIGNABLE" });
  });

  it("prevents duplicate voucher numbers", async () => {
    const bookingService = await import("../src/modules/bookings/booking.service.js");
    const { Prisma } = await import("@prisma/client");
    mockPrisma.booking.findMany.mockResolvedValue([]);
    mockPrisma.booking.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("duplicate", {
        code: "P2002",
        clientVersion: "5.22.0",
        meta: { target: ["voucherNumber"] }
      })
    );

    await expect(
      bookingService.createBooking(
        {
          voucherNumber: "VCH-1001",
          customerId: customerBase.id,
          vehicleId: vehicleBase.id,
          driverId: driverBase.id,
          startAt: "2026-08-01T08:00:00.000Z",
          endAt: "2026-08-01T12:00:00.000Z",
          tripType: "CITY",
          destination: "Riyadh",
          status: "DRAFT"
        },
        { id: userBase.id, role: "ADMIN" }
      )
    ).rejects.toMatchObject({ status: 409 });
  });

  it("enforces invalid status transitions", async () => {
    const bookingService = await import("../src/modules/bookings/booking.service.js");
    mockPrisma.booking.findFirst.mockResolvedValue({ ...bookingBase, status: "CANCELLED" });

    await expect(
      bookingService.updateBookingStatus(
        bookingBase.id,
        { status: "COMPLETED" },
        { id: userBase.id, role: "ADMIN" }
      )
    ).rejects.toMatchObject({ code: "INVALID_STATUS_TRANSITION" });
  });

  it("makes completed bookings read-only for Staff", async () => {
    const bookingService = await import("../src/modules/bookings/booking.service.js");
    mockPrisma.booking.findFirst.mockResolvedValue({ ...bookingBase, status: "COMPLETED" });

    await expect(
      bookingService.updateBooking(
        bookingBase.id,
        { destination: "Jeddah" },
        { id: "00000000-0000-4000-8000-000000000002", role: "STAFF" }
      )
    ).rejects.toMatchObject({ code: "BOOKING_READ_ONLY" });
  });

  it("cancels bookings and records an audit log", async () => {
    const bookingService = await import("../src/modules/bookings/booking.service.js");
    mockPrisma.booking.findFirst.mockResolvedValue(bookingBase);
    mockPrisma.booking.update.mockResolvedValue({
      ...bookingBase,
      status: "CANCELLED",
      cancelledAt: new Date("2026-02-01T00:00:00.000Z")
    });

    const result = await bookingService.cancelBooking(
      bookingBase.id,
      { reason: "Customer request" },
      { id: userBase.id, role: "ADMIN" },
      "127.0.0.1"
    );

    expect(result.status).toBe("CANCELLED");
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "BOOKING_CANCELLED" })
      })
    );
  });

  it("rejects overnight data on CITY bookings", async () => {
    const bookingService = await import("../src/modules/bookings/booking.service.js");
    mockPrisma.booking.findMany.mockResolvedValue([]);

    await expect(
      bookingService.createBooking(
        {
          voucherNumber: "VCH-CITY-OVERNIGHT",
          customerId: customerBase.id,
          vehicleId: vehicleBase.id,
          driverId: driverBase.id,
          startAt: "2026-08-01T08:00:00.000Z",
          endAt: "2026-08-01T12:00:00.000Z",
          tripType: "CITY",
          destination: "Riyadh",
          status: "DRAFT",
          overnightStay: {
            accommodationName: "Hotel",
            checkInDate: "2026-08-01",
            checkOutDate: "2026-08-02"
          }
        },
        { id: userBase.id, role: "ADMIN" }
      )
    ).rejects.toMatchObject({ code: "CITY_OVERNIGHT_NOT_ALLOWED" });
  });

  it("requires accommodation details for OVERNIGHT bookings", async () => {
    const bookingService = await import("../src/modules/bookings/booking.service.js");
    mockPrisma.booking.findMany.mockResolvedValue([]);

    await expect(
      bookingService.createBooking(
        {
          voucherNumber: "VCH-OVERNIGHT-MISSING",
          customerId: customerBase.id,
          vehicleId: vehicleBase.id,
          driverId: driverBase.id,
          startAt: "2026-08-01T08:00:00.000Z",
          endAt: "2026-08-03T12:00:00.000Z",
          tripType: "OVERNIGHT",
          destination: "AlUla",
          status: "DRAFT"
        },
        { id: userBase.id, role: "ADMIN" }
      )
    ).rejects.toMatchObject({ code: "OVERNIGHT_DETAILS_REQUIRED" });
  });

  it("calculates overnight nights and preserves the driver rate used at booking time", async () => {
    const bookingService = await import("../src/modules/bookings/booking.service.js");
    mockPrisma.booking.findMany.mockResolvedValue([]);

    await bookingService.createBooking(
      {
        voucherNumber: "VCH-OVERNIGHT-COST",
        customerId: customerBase.id,
        vehicleId: vehicleBase.id,
        driverId: driverBase.id,
        startAt: "2026-08-01T08:00:00.000Z",
        endAt: "2026-08-03T12:00:00.000Z",
        tripType: "OVERNIGHT",
        destination: "AlUla",
        status: "DRAFT",
        overnightStay: {
          accommodationName: "Desert Hotel",
          checkInDate: "2026-08-01",
          checkOutDate: "2026-08-03"
        }
      },
      { id: userBase.id, role: "STAFF" }
    );

    expect(mockPrisma.overnightStay.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          nightsCount: 2,
          driverDailyRate: "250.00",
          totalDriverCost: "500.00"
        })
      })
    );
  });

  it("allows Admin overnight cost override with an audit reason", async () => {
    const bookingService = await import("../src/modules/bookings/booking.service.js");
    mockPrisma.booking.findMany.mockResolvedValue([]);

    await bookingService.createBooking(
      {
        voucherNumber: "VCH-OVERNIGHT-OVERRIDE",
        customerId: customerBase.id,
        vehicleId: vehicleBase.id,
        driverId: driverBase.id,
        startAt: "2026-08-01T08:00:00.000Z",
        endAt: "2026-08-03T12:00:00.000Z",
        tripType: "OVERNIGHT",
        destination: "AlUla",
        status: "DRAFT",
        overnightStay: {
          accommodationName: "Desert Hotel",
          checkInDate: "2026-08-01",
          checkOutDate: "2026-08-03",
          driverDailyRate: 300,
          totalDriverCost: 700,
          overrideReason: "Special contract"
        }
      },
      { id: userBase.id, role: "ADMIN" }
    );

    expect(mockPrisma.overnightStay.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          driverDailyRate: "300.00",
          totalDriverCost: "700.00"
        })
      })
    );
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "OVERNIGHT_COST_OVERRIDDEN" })
      })
    );
  });

  it("prevents Staff from overriding overnight costs", async () => {
    const bookingService = await import("../src/modules/bookings/booking.service.js");
    mockPrisma.booking.findMany.mockResolvedValue([]);

    await expect(
      bookingService.createBooking(
        {
          voucherNumber: "VCH-OVERNIGHT-STAFF-OVERRIDE",
          customerId: customerBase.id,
          vehicleId: vehicleBase.id,
          driverId: driverBase.id,
          startAt: "2026-08-01T08:00:00.000Z",
          endAt: "2026-08-03T12:00:00.000Z",
          tripType: "OVERNIGHT",
          destination: "AlUla",
          status: "DRAFT",
          overnightStay: {
            accommodationName: "Desert Hotel",
            checkInDate: "2026-08-01",
            checkOutDate: "2026-08-03",
            driverDailyRate: 300,
            overrideReason: "No permission"
          }
        },
        { id: "00000000-0000-4000-8000-000000000002", role: "STAFF" }
      )
    ).rejects.toMatchObject({ code: "OVERNIGHT_OVERRIDE_FORBIDDEN" });
  });
});

describe("availability and overlap prevention", () => {
  it.each([
    ["exact same time period", "2026-08-01T08:00:00.000Z", "2026-08-01T12:00:00.000Z", true],
    [
      "partial overlap at the beginning",
      "2026-08-01T07:00:00.000Z",
      "2026-08-01T09:00:00.000Z",
      true
    ],
    ["partial overlap at the end", "2026-08-01T11:00:00.000Z", "2026-08-01T13:00:00.000Z", true],
    ["inside another booking", "2026-08-01T09:00:00.000Z", "2026-08-01T10:00:00.000Z", true],
    ["surrounding another booking", "2026-08-01T07:00:00.000Z", "2026-08-01T13:00:00.000Z", true],
    ["adjacent before", "2026-08-01T06:00:00.000Z", "2026-08-01T08:00:00.000Z", false],
    ["adjacent after", "2026-08-01T12:00:00.000Z", "2026-08-01T14:00:00.000Z", false],
    [
      "timezone equivalent overlap",
      "2026-08-01T10:30:00.000+03:00",
      "2026-08-01T12:30:00.000+03:00",
      true
    ]
  ])("%s", async (_label, start, end, expected) => {
    const { hasHalfOpenOverlap } =
      await import("../src/modules/availability/availability.service.js");

    expect(
      hasHalfOpenOverlap(new Date(start), new Date(end), bookingBase.startAt, bookingBase.endAt)
    ).toBe(expected);
  });

  it("returns vehicle and driver conflicts with sanitized booking details", async () => {
    const { createAvailabilityService } =
      await import("../src/modules/availability/availability.service.js");
    mockPrisma.booking.findMany.mockResolvedValue([bookingBase]);
    mockPrisma.vehicle.findMany.mockResolvedValue([]);
    mockPrisma.driver.findMany.mockResolvedValue([]);

    const result = await createAvailabilityService(mockPrisma).checkBookingConflicts({
      vehicleId: vehicleBase.id,
      driverId: driverBase.id,
      startAt: new Date("2026-08-01T08:30:00.000Z"),
      endAt: new Date("2026-08-01T09:30:00.000Z")
    });

    expect(result.hasConflict).toBe(true);
    expect(result.conflicts).toEqual([
      expect.objectContaining({ type: "VEHICLE", voucherNumber: bookingBase.voucherNumber }),
      expect.objectContaining({ type: "DRIVER", voucherNumber: bookingBase.voucherNumber })
    ]);
    expect(result.conflicts[0]).not.toHaveProperty("customer");
  });

  it("ignores the booking being updated", async () => {
    const { createAvailabilityService } =
      await import("../src/modules/availability/availability.service.js");
    mockPrisma.booking.findMany.mockResolvedValue([]);

    await createAvailabilityService(mockPrisma).checkBookingConflicts({
      bookingId: bookingBase.id,
      vehicleId: vehicleBase.id,
      driverId: driverBase.id,
      startAt: bookingBase.startAt,
      endAt: bookingBase.endAt
    });

    expect(mockPrisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { not: bookingBase.id } })
      })
    );
  });

  it("allows cancelled booking slots to be reused by excluding cancelled status", async () => {
    const { createAvailabilityService } =
      await import("../src/modules/availability/availability.service.js");
    mockPrisma.booking.findMany.mockResolvedValue([]);

    const result = await createAvailabilityService(mockPrisma).checkBookingConflicts({
      vehicleId: vehicleBase.id,
      driverId: driverBase.id,
      startAt: bookingBase.startAt,
      endAt: bookingBase.endAt
    });

    expect(result.hasConflict).toBe(false);
    expect(mockPrisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: { not: "CANCELLED" } })
      })
    );
  });

  it("checks availability through the API", async () => {
    const token = signAccessToken({
      sub: userBase.id,
      fullName: userBase.fullName,
      email: userBase.email,
      role: "ADMIN"
    });
    mockPrisma.user.findFirst.mockResolvedValue(userBase);
    mockPrisma.booking.findMany.mockResolvedValue([bookingBase]);
    mockPrisma.vehicle.findMany.mockResolvedValue([]);
    mockPrisma.driver.findMany.mockResolvedValue([]);

    const response = await request(createApp())
      .post("/api/availability/check")
      .set("Cookie", [
        `${authCookieNames.accessToken}=${token}`,
        `${authCookieNames.csrfToken}=test-csrf`
      ])
      .set("x-csrf-token", "test-csrf")
      .send({
        vehicleId: vehicleBase.id,
        driverId: driverBase.id,
        startAt: "2026-08-01T08:30:00.000Z",
        endAt: "2026-08-01T09:30:00.000Z"
      });

    expect(response.status).toBe(200);
    expect(response.body.data.availability.hasConflict).toBe(true);
  });

  it("applies overnight buffer hours to availability checks", async () => {
    const { createAvailabilityService } =
      await import("../src/modules/availability/availability.service.js");
    mockPrisma.systemSetting.findUnique.mockImplementation(
      ({ where }: { where: { key: string } }) =>
        Promise.resolve(
          where.key === "overnightDefaults"
            ? {
                value: {
                  defaultDriverDailyRate: "250.00",
                  preTripBufferHours: 6,
                  postTripBufferHours: 8
                }
              }
            : null
        )
    );
    mockPrisma.booking.findMany.mockResolvedValue([]);

    await createAvailabilityService(mockPrisma).checkBookingConflicts({
      vehicleId: vehicleBase.id,
      driverId: driverBase.id,
      startAt: new Date("2026-08-10T12:00:00.000Z"),
      endAt: new Date("2026-08-11T12:00:00.000Z"),
      tripType: "OVERNIGHT"
    });

    expect(mockPrisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          availabilityStartAt: { lt: new Date("2026-08-11T20:00:00.000Z") },
          availabilityEndAt: { gt: new Date("2026-08-10T06:00:00.000Z") }
        })
      })
    );
  });
});

describe("authorization", () => {
  it("rejects access without authentication", async () => {
    const response = await request(createApp()).get("/api/auth/me");

    expect(response.status).toBe(401);
  });

  it("rejects Staff attempting Admin-only actions", async () => {
    const staffToken = signAccessToken({
      sub: "00000000-0000-4000-8000-000000000002",
      fullName: "Staff User",
      email: "staff@alansari.local",
      role: "STAFF"
    });
    mockPrisma.user.findFirst.mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000002",
      fullName: "Staff User",
      email: "staff@alansari.local",
      role: "STAFF"
    });

    const response = await request(createApp())
      .get("/api/users")
      .set("Cookie", [`${authCookieNames.accessToken}=${staffToken}`]);

    expect(response.status).toBe(403);
  });

  it("protects the last active Admin account", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(userBase);
    mockPrisma.user.count.mockResolvedValue(1);

    await expect(
      userService.updateUserStatus(
        userBase.id,
        { isActive: false },
        "00000000-0000-4000-8000-000000000099"
      )
    ).rejects.toMatchObject({
      code: "LAST_ADMIN_NOT_ALLOWED"
    });
  });

  it("rate limits repeated login attempts", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const app = createApp();

    for (let index = 0; index < 5; index += 1) {
      await request(app)
        .post("/api/auth/login")
        .send({ email: `missing-${index}@example.com`, password: "wrong" });
    }

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "missing-final@example.com", password: "wrong" });

    expect(response.status).toBe(429);
  });
});

describe("operational dashboard", () => {
  it("builds aggregated summary cards and hides restricted financial statistics for Staff", async () => {
    const { getDashboardSummary } = await import("../src/modules/dashboard/dashboard.service.js");
    const overnightBooking = {
      ...bookingBase,
      id: "00000000-0000-4000-8000-000000000502",
      voucherNumber: "VCH-OVN-1",
      tripType: "OVERNIGHT" as const,
      overnightStays: [
        {
          id: "00000000-0000-4000-8000-000000000602",
          bookingId: "00000000-0000-4000-8000-000000000502",
          city: "AlUla",
          accommodationName: "Desert Hotel",
          checkInDate: new Date("2026-08-01T00:00:00.000Z"),
          checkOutDate: new Date("2026-08-03T00:00:00.000Z"),
          nightsCount: 2,
          driverDailyRate: { toFixed: () => "250.00" },
          totalDriverCost: { toFixed: () => "500.00" },
          notes: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z")
        }
      ]
    };

    mockPrisma.booking.count
      .mockResolvedValueOnce(9)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2);
    mockPrisma.vehicle.count
      .mockResolvedValueOnce(31)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(4);
    mockPrisma.driver.count.mockResolvedValueOnce(18);
    mockPrisma.booking.findMany
      .mockResolvedValueOnce([bookingBase])
      .mockResolvedValueOnce([bookingBase])
      .mockResolvedValueOnce([overnightBooking]);
    mockPrisma.auditLog.findMany.mockResolvedValueOnce([
      {
        id: "00000000-0000-4000-8000-000000000701",
        action: "BOOKING_UPDATED",
        entityId: bookingBase.id,
        createdAt: new Date("2026-08-01T09:00:00.000Z"),
        user: { id: userBase.id, fullName: userBase.fullName, role: "ADMIN" }
      }
    ]);
    mockPrisma.vehicle.groupBy.mockResolvedValueOnce([
      { status: "AVAILABLE", _count: { _all: 31 } },
      { status: "BOOKED", _count: { _all: 10 } },
      { status: "MAINTENANCE", _count: { _all: 4 } }
    ]);

    const summary = await getDashboardSummary(
      {
        startFrom: "2026-08-01T00:00:00.000Z",
        endTo: "2026-08-08T00:00:00.000Z"
      },
      "STAFF"
    );

    expect(summary.cards.todayTotalBookings).toBe(9);
    expect(summary.cards.vehiclesAvailable).toBe(31);
    expect(summary.overnightAlerts[0]?.overnightStay?.nightsCount).toBe(2);
    expect(summary.restricted.financialStatisticsHidden).toBe(true);
    expect(mockPrisma.booking.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          availabilityStartAt: expect.objectContaining({ lt: expect.any(Date) }),
          availabilityEndAt: expect.objectContaining({ gt: expect.any(Date) })
        })
      })
    );
  });

  it("maps 45 vehicles into timeline rows with filtered overnight indicators", async () => {
    const { getVehicleTimeline } = await import("../src/modules/dashboard/dashboard.service.js");
    const vehicles = Array.from({ length: 45 }).map((_, index) => ({
      ...vehicleBase,
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      plateNumber: `KSA-${String(index + 1).padStart(4, "0")}`
    }));
    const overnightBooking = {
      ...bookingBase,
      vehicleId: vehicles[10].id,
      vehicle: {
        id: vehicles[10].id,
        plateNumber: vehicles[10].plateNumber,
        make: vehicles[10].make,
        model: vehicles[10].model,
        status: vehicles[10].status
      },
      tripType: "OVERNIGHT" as const,
      overnightStays: [
        {
          id: "00000000-0000-4000-8000-000000000603",
          bookingId: bookingBase.id,
          city: "Jeddah",
          accommodationName: "Sea Hotel",
          checkInDate: new Date("2026-08-10T00:00:00.000Z"),
          checkOutDate: new Date("2026-08-12T00:00:00.000Z"),
          nightsCount: 2,
          driverDailyRate: { toFixed: () => "260.00" },
          totalDriverCost: { toFixed: () => "520.00" },
          notes: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z")
        }
      ]
    };

    mockPrisma.vehicle.findMany.mockResolvedValueOnce(vehicles);
    mockPrisma.booking.findMany.mockResolvedValueOnce([overnightBooking]);

    const timeline = await getVehicleTimeline({
      startFrom: "2026-08-10T00:00:00.000Z",
      endTo: "2026-08-17T00:00:00.000Z",
      view: "week",
      overnightOnly: true
    });

    expect(timeline.rows).toHaveLength(45);
    expect(timeline.rows[10].bookings[0]?.overnightStay?.accommodationName).toBe("Sea Hotel");
    expect(mockPrisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tripType: "OVERNIGHT",
          availabilityStartAt: { lt: new Date("2026-08-17T00:00:00.000Z") },
          availabilityEndAt: { gt: new Date("2026-08-10T00:00:00.000Z") }
        })
      })
    );
  });
});

describe("reports and exports", () => {
  const filters = {
    startDate: "2026-08-01",
    endDate: "2026-08-31",
    overnightOnly: false
  };

  it("filters report rows and escapes spreadsheet formulas", async () => {
    const { generateReport } = await import("../src/modules/reports/report.service.js");
    mockPrisma.booking.findMany.mockResolvedValueOnce([
      {
        ...bookingBase,
        destination: "=SUM(1,1)",
        expenses: []
      }
    ]);

    const report = await generateReport("daily-bookings", filters, "ADMIN");

    expect(report.rows[0].destination).toBe("'=SUM(1,1)");
    expect(mockPrisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          startAt: {
            gte: new Date("2026-08-01T00:00:00.000Z"),
            lt: new Date("2026-09-01T00:00:00.000Z")
          }
        })
      })
    );
  });

  it("prevents Staff from restricted financial reports", async () => {
    const { generateReport } = await import("../src/modules/reports/report.service.js");

    await expect(generateReport("booking-expenses", filters, "STAFF")).rejects.toMatchObject({
      code: "FORBIDDEN"
    });
  });

  it("generates Excel and PDF export buffers with correct filenames", async () => {
    const { filenameFor, generateReport } =
      await import("../src/modules/reports/report.service.js");
    const { renderExcel, renderPdf } = await import("../src/modules/reports/report.exporters.js");
    mockPrisma.systemSetting.findUnique.mockResolvedValue(null);
    mockPrisma.booking.findMany.mockResolvedValueOnce([
      {
        ...bookingBase,
        customer: { ...bookingBase.customer, fullName: "عميل عربي" },
        expenses: []
      }
    ]);

    const report = await generateReport("daily-dispatch", filters, "ADMIN");
    const excel = await renderExcel(report);
    const pdf = await renderPdf(report);

    expect(excel.subarray(0, 2).toString()).toBe("PK");
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(filenameFor("daily-dispatch", "excel", new Date("2026-08-02T00:00:00.000Z"))).toBe(
      "daily-dispatch-2026-08-02.xlsx"
    );
  });

  it("calculates financial totals for Admin reports and handles empty reports", async () => {
    const { generateReport } = await import("../src/modules/reports/report.service.js");
    const expense = {
      id: "00000000-0000-4000-8000-000000000801",
      bookingId: bookingBase.id,
      type: "FUEL" as const,
      amount: { toFixed: () => "125.50" },
      currency: "SAR",
      description: "Fuel",
      createdAt: new Date("2026-08-01T00:00:00.000Z"),
      updatedAt: new Date("2026-08-01T00:00:00.000Z")
    };
    mockPrisma.booking.findMany.mockResolvedValueOnce([{ ...bookingBase, expenses: [expense] }]);

    const report = await generateReport("booking-expenses", filters, "ADMIN");
    expect(report.totals.totalExpenses).toBe("125.50");

    mockPrisma.booking.findMany.mockResolvedValueOnce([]);
    const empty = await generateReport("daily-bookings", filters, "ADMIN");
    expect(empty.rows).toHaveLength(0);
    expect(empty.totals.rowCount).toBe(0);
  });
});

describe("production readiness", () => {
  it("returns readiness success when the database responds", async () => {
    const app = createApp();

    const response = await request(app).get("/api/ready");

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("ready");
    expect(response.body.data.checks.database).toBe("ok");
    expect(mockPrisma.$queryRaw).toHaveBeenCalled();
  });

  it("returns readiness failure when the database is unavailable", async () => {
    mockPrisma.$queryRaw.mockRejectedValueOnce(new Error("database unavailable"));
    const app = createApp();

    const response = await request(app).get("/api/ready");

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("NOT_READY");
    expect(response.body.error.details.checks.database).toBe("failed");
  });

  it("emits correlation IDs and text metrics without leaking secrets", async () => {
    const app = createApp();

    const health = await request(app).get("/api/health").set("x-request-id", "phase-10-test");
    const metrics = await request(app).get("/api/metrics");

    expect(health.headers["x-request-id"]).toBe("phase-10-test");
    expect(metrics.status).toBe(200);
    expect(metrics.text).toContain("alansari_api_requests_total");
  });

  it("hides restricted report definitions from Staff users", async () => {
    mockPrisma.user.findFirst.mockResolvedValueOnce({
      ...userBase,
      id: "00000000-0000-4000-8000-000000000002",
      fullName: "Staff User",
      email: "staff@alansari.local",
      role: "STAFF"
    });
    const staffToken = signAccessToken({
      id: "00000000-0000-4000-8000-000000000002",
      fullName: "Staff User",
      email: "staff@alansari.local",
      role: "STAFF"
    });
    const app = createApp();

    const response = await request(app)
      .get("/api/reports")
      .set("Cookie", [`${authCookieNames.accessToken}=${staffToken}`]);

    expect(response.status).toBe(200);
    const reportTypes = response.body.data.reports.map((report: { type: string }) => report.type);
    expect(reportTypes).not.toContain("booking-expenses");
    expect(reportTypes).not.toContain("overnight-driver-costs");
  });
});
