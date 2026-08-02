// Development-only mock API adapter. It mirrors backend response shapes while keeping
// the real API modules untouched. Enable with VITE_USE_MOCK_DATA=true.

import type { BookingStatus, TripType, VehicleStatus } from "@alansari/shared";
import type { DriverStatus, Pagination } from "../features/fleet/fleet.types";
import {
  daysFromNow,
  mockBookings,
  mockCustomers,
  mockDrivers,
  mockSettings,
  mockUsers,
  mockVehicles,
  type MockBooking,
  type MockCustomer,
  type MockDriver,
  type MockUser,
  type MockVehicle,
  reportDefinitions,
  setMockSettings
} from "./mockData";

type ReportRow = Record<string, string | number | null>;

const delayMs = 240;
const sessionKey = "alansari-mock-session-user-id";

const db = {
  bookings: [...mockBookings] as MockBooking[],
  customers: [...mockCustomers] as MockCustomer[],
  drivers: [...mockDrivers] as MockDriver[],
  users: [...mockUsers] as MockUser[],
  vehicles: [...mockVehicles] as MockVehicle[]
};

function wait(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, delayMs));
}

function readBody(init: RequestInit): Record<string, unknown> {
  if (typeof init.body !== "string") {
    return {};
  }

  try {
    return JSON.parse(init.body) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function getCurrentUser(): MockUser {
  const savedId = window.localStorage.getItem(sessionKey);
  return db.users.find((user) => user.id === savedId && user.isActive) ?? db.users[0];
}

function authUser(user: MockUser) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    isActive: user.isActive
  };
}

function paginate<T>(items: T[], page = 1, pageSize = 10): { items: T[]; pagination: Pagination } {
  const total = items.length;
  const pageCount = Math.max(Math.ceil(total / pageSize), 1);
  const safePage = Math.min(Math.max(page, 1), pageCount);
  return {
    items: items.slice((safePage - 1) * pageSize, safePage * pageSize),
    pagination: { page: safePage, pageSize, total, pageCount }
  };
}

function sortBy<T extends object>(items: T[], key: string, direction = "desc"): T[] {
  return [...items].sort((left, right) => {
    const a = String((left as Record<string, unknown>)[key] ?? "");
    const b = String((right as Record<string, unknown>)[key] ?? "");
    return direction === "asc" ? a.localeCompare(b) : b.localeCompare(a);
  });
}

function queryNumber(params: URLSearchParams, key: string, fallback: number): number {
  const value = Number(params.get(key));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function withRelations(booking: MockBooking) {
  const customer = db.customers.find((item) => item.id === booking.customerId) ?? db.customers[0];
  const vehicle = db.vehicles.find((item) => item.id === booking.vehicleId) ?? db.vehicles[0];
  const driver = db.drivers.find((item) => item.id === booking.driverId) ?? db.drivers[0];
  const createdBy = db.users.find((item) => item.id === booking.createdById) ?? db.users[0];
  const updatedBy = booking.updatedById ? db.users.find((item) => item.id === booking.updatedById) ?? null : null;

  return {
    ...booking,
    customer: {
      id: customer.id,
      fullName: customer.fullName,
      phoneCountryCode: customer.phoneCountryCode,
      phoneNumber: customer.phoneNumber
    },
    vehicle: {
      id: vehicle.id,
      plateNumber: vehicle.plateNumber,
      make: vehicle.make,
      model: vehicle.model,
      status: vehicle.status
    },
    driver: {
      id: driver.id,
      fullName: driver.fullName,
      phoneNumber: driver.phoneNumber,
      status: driver.status
    },
    createdBy: {
      id: createdBy.id,
      fullName: createdBy.fullName,
      email: createdBy.email
    },
    updatedBy: updatedBy
      ? {
          id: updatedBy.id,
          fullName: updatedBy.fullName,
          email: updatedBy.email
        }
      : null
  };
}

function overlaps(leftStart: string, leftEnd: string, rightStart: string, rightEnd: string): boolean {
  return new Date(leftStart) < new Date(rightEnd) && new Date(leftEnd) > new Date(rightStart);
}

function filterBookings(params: URLSearchParams) {
  return db.bookings.filter((booking) => {
    const voucher = params.get("voucherNumber")?.toLowerCase();
    const destination = params.get("destination")?.toLowerCase();
    const status = params.get("status") || params.get("bookingStatus");
    const tripType = params.get("tripType");
    const overnightOnly = params.get("overnightOnly") === "true";
    const startFrom = params.get("startFrom") || params.get("startDate");
    const startTo = params.get("startTo") || params.get("endTo") || params.get("endDate");

    return (
      (!voucher || booking.voucherNumber.toLowerCase().includes(voucher)) &&
      (!destination || booking.destination.toLowerCase().includes(destination)) &&
      (!status || booking.status === status) &&
      (!tripType || booking.tripType === tripType) &&
      (!params.get("vehicleId") || booking.vehicleId === params.get("vehicleId")) &&
      (!params.get("driverId") || booking.driverId === params.get("driverId")) &&
      (!params.get("customerId") || booking.customerId === params.get("customerId")) &&
      (!overnightOnly || Boolean(booking.overnightStay)) &&
      (!startFrom || new Date(booking.startAt) >= new Date(startFrom)) &&
      (!startTo || new Date(booking.startAt) <= new Date(startTo))
    );
  });
}

function listCustomers(params: URLSearchParams) {
  const search = params.get("search")?.toLowerCase();
  const filtered = db.customers.filter(
    (customer) =>
      !search ||
      customer.fullName.toLowerCase().includes(search) ||
      customer.phoneNumber.toLowerCase().includes(search)
  );
  const sorted = sortBy(filtered, params.get("sortBy") ?? "createdAt", params.get("sortDirection") ?? "desc");
  const result = paginate(sorted, queryNumber(params, "page", 1), queryNumber(params, "pageSize", 10));
  return { customers: result.items, pagination: result.pagination };
}

function listVehicles(params: URLSearchParams) {
  const search = params.get("search")?.toLowerCase();
  const status = params.get("status");
  const filtered = db.vehicles.filter(
    (vehicle) =>
      (!search ||
        vehicle.plateNumber.toLowerCase().includes(search) ||
        vehicle.make.toLowerCase().includes(search) ||
        vehicle.model.toLowerCase().includes(search)) &&
      (!status || vehicle.status === status)
  );
  const sorted = sortBy(filtered, params.get("sortBy") ?? "createdAt", params.get("sortDirection") ?? "desc");
  const result = paginate(sorted, queryNumber(params, "page", 1), queryNumber(params, "pageSize", 10));
  return { vehicles: result.items, pagination: result.pagination };
}

function listDrivers(params: URLSearchParams) {
  const search = params.get("search")?.toLowerCase();
  const status = params.get("status");
  const filtered = db.drivers.filter(
    (driver) =>
      (!search ||
        driver.fullName.toLowerCase().includes(search) ||
        driver.phoneNumber.toLowerCase().includes(search)) &&
      (!status || driver.status === status)
  );
  const sorted = sortBy(filtered, params.get("sortBy") ?? "createdAt", params.get("sortDirection") ?? "desc");
  const result = paginate(sorted, queryNumber(params, "page", 1), queryNumber(params, "pageSize", 10));
  return { drivers: result.items, pagination: result.pagination };
}

function createBooking(input: Record<string, unknown>, existing?: MockBooking): MockBooking {
  const tripType = (input.tripType as TripType | undefined) ?? "CITY";
  const startAt = String(input.startAt ?? daysFromNow(7, 10));
  const endAt = String(input.endAt ?? daysFromNow(7, 16));
  const overnight = input.overnightStay as Record<string, unknown> | undefined;
  const currentUser = getCurrentUser();
  const id = existing?.id ?? makeId("bkg");
  const booking: MockBooking = {
    id,
    voucherNumber: String(input.voucherNumber ?? existing?.voucherNumber ?? `ALT-${Date.now()}`),
    customerId: String(input.customerId ?? existing?.customerId ?? db.customers[0].id),
    vehicleId: String(input.vehicleId ?? existing?.vehicleId ?? db.vehicles[0].id),
    driverId: String(input.driverId ?? existing?.driverId ?? db.drivers[0].id),
    startAt,
    endAt,
    availabilityStartAt: tripType === "OVERNIGHT" ? daysFromNow(6, 20) : startAt,
    availabilityEndAt: tripType === "OVERNIGHT" ? daysFromNow(9, 8) : endAt,
    tripType,
    destination: String(input.destination ?? existing?.destination ?? "مشوار داخل الرياض"),
    status: existing?.status ?? "DRAFT",
    notes: typeof input.notes === "string" && input.notes ? input.notes : null,
    createdById: existing?.createdById ?? currentUser.id,
    updatedById: existing ? currentUser.id : null,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    cancelledAt: existing?.cancelledAt ?? null,
    overnightStay:
      tripType === "OVERNIGHT"
        ? {
            id: existing?.overnightStay?.id ?? makeId("ovn"),
            bookingId: id,
            city: String(overnight?.city ?? "الرياض"),
            accommodationName: String(overnight?.accommodationName ?? "فندق فيرمونت الرياض"),
            checkInDate: String(overnight?.checkInDate ?? startAt),
            checkOutDate: String(overnight?.checkOutDate ?? endAt),
            nightsCount: 2,
            driverDailyRate: String(overnight?.driverDailyRate ?? mockSettings.defaultDriverDailyRate),
            totalDriverCost: String(overnight?.totalDriverCost ?? "500.00"),
            notes: typeof overnight?.notes === "string" && overnight.notes ? overnight.notes : null,
            createdAt: existing?.createdAt ?? new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        : null
  };

  if (booking.overnightStay) {
    booking.overnightStay.bookingId = booking.id;
  }

  return booking;
}

function dashboardSummary(params: URLSearchParams) {
  const bookings = filterBookings(params).map(withRelations);
  const todayBookings = bookings.filter((booking) => booking.startAt.slice(0, 10) === daysFromNow(0).slice(0, 10));
  return {
    dashboard: {
      range: {
        startFrom: params.get("startFrom") ?? daysFromNow(0),
        endTo: params.get("endTo") ?? daysFromNow(7)
      },
      cards: {
        todayTotalBookings: todayBookings.length,
        todayConfirmedBookings: todayBookings.filter((booking) => booking.status === "CONFIRMED").length,
        vehiclesAvailable: db.vehicles.filter((vehicle) => vehicle.status === "AVAILABLE").length,
        vehiclesBooked: db.vehicles.filter((vehicle) => vehicle.status === "BOOKED").length,
        vehiclesUnderMaintenance: db.vehicles.filter((vehicle) => vehicle.status === "MAINTENANCE").length,
        activeDrivers: db.drivers.filter((driver) => driver.status !== "INACTIVE").length,
        upcomingBookings: bookings.filter((booking) => new Date(booking.startAt) >= new Date()).length,
        overnightBookings: bookings.filter((booking) => booking.overnightStay).length,
        bookingsRequiringAttention: bookings.filter((booking) => booking.status === "DRAFT" || booking.status === "CANCELLED").length
      },
      todaysDispatch: todayBookings,
      upcomingBookings: bookings.filter((booking) => new Date(booking.startAt) >= new Date()).slice(0, 6),
      recentChanges: [
        { id: "act-001", action: "تأكيد حجز مطار لكبار الشخصيات", entityId: "bkg-002", createdAt: daysFromNow(0, 8), user: { id: "usr-staff-001", fullName: "خالد العتيبي" } },
        { id: "act-002", action: "تحديث حالة مركبة إلى صيانة", entityId: "veh-004", createdAt: daysFromNow(-1, 15), user: { id: "usr-admin-001", fullName: "سارة الأنصاري" } },
        { id: "act-003", action: "إلغاء حجز رحلة خارجية بطلب العميل", entityId: "bkg-006", createdAt: daysFromNow(-6, 9), user: null }
      ],
      overnightAlerts: bookings.filter((booking) => booking.overnightStay),
      vehicleStatusOverview: ["AVAILABLE", "BOOKED", "MAINTENANCE", "OUT_OF_SERVICE", "INACTIVE"].map((status) => ({
        status: status as VehicleStatus,
        count: db.vehicles.filter((vehicle) => vehicle.status === status).length
      })),
      restricted: { financialStatisticsHidden: false }
    }
  };
}

function timeline(params: URLSearchParams) {
  const bookings = filterBookings(params).map(withRelations);
  const status = params.get("vehicleStatus");
  return {
    timeline: {
      range: {
        startFrom: params.get("startFrom") ?? daysFromNow(0),
        endTo: params.get("endTo") ?? daysFromNow(7)
      },
      view: (params.get("view") ?? "week") as "day" | "week" | "month",
      rows: db.vehicles
        .filter((vehicle) => (!params.get("vehicleId") || vehicle.id === params.get("vehicleId")) && (!status || vehicle.status === status))
        .map((vehicle) => ({
          vehicle: {
            id: vehicle.id,
            plateNumber: vehicle.plateNumber,
            make: vehicle.make,
            model: vehicle.model,
            status: vehicle.status,
            passengerCapacity: vehicle.passengerCapacity
          },
          bookings: bookings.filter((booking) => booking.vehicleId === vehicle.id)
        }))
    }
  };
}

function reportRows(type: string, params: URLSearchParams): ReportRow[] {
  const bookings = filterBookings(params).map(withRelations);
  if (type === "vehicle-utilization") {
    return db.vehicles.map((vehicle) => ({
      vehicle: `${vehicle.make} ${vehicle.model}`,
      plateNumber: vehicle.plateNumber,
      bookingCount: db.bookings.filter((booking) => booking.vehicleId === vehicle.id).length,
      utilizationHours: db.bookings.filter((booking) => booking.vehicleId === vehicle.id).length * 6,
      status: vehicle.status
    }));
  }
  if (type === "overnight-stays") {
    return bookings
      .filter((booking) => booking.overnightStay)
      .map((booking) => ({
        voucherNumber: booking.voucherNumber,
        city: booking.overnightStay?.city ?? "",
        hotel: booking.overnightStay?.accommodationName ?? "",
        nights: booking.overnightStay?.nightsCount ?? 0,
        driverCost: Number(booking.overnightStay?.totalDriverCost ?? 0),
        status: booking.status
      }));
  }
  if (type === "daily-dispatch") {
    return bookings.map((booking) => ({
      time: new Intl.DateTimeFormat("ar", { hour: "2-digit", minute: "2-digit" }).format(new Date(booking.startAt)),
      vehicle: `${booking.vehicle.plateNumber} - ${booking.vehicle.make}`,
      driver: booking.driver.fullName,
      customerName: booking.customer.fullName,
      destination: booking.destination,
      status: booking.status
    }));
  }
  return bookings.map((booking, index) => ({
    voucherNumber: booking.voucherNumber,
    customerName: booking.customer.fullName,
    startAt: booking.startAt,
    destination: booking.destination,
    status: booking.status,
    estimatedRevenue: [850, 1200, 4300, 690, 975, 0][index] ?? 650
  }));
}

export async function mockApiRequest<TData>(path: string, init: RequestInit = {}): Promise<TData> {
  await wait();

  const url = new URL(path, "http://mock.local");
  const params = url.searchParams;
  const segments = url.pathname.split("/").filter(Boolean);
  const method = init.method?.toUpperCase() ?? "GET";
  const body = readBody(init);

  if (segments[0] === "auth") {
    if (segments[1] === "login") {
      const email = String(body.email ?? "").toLowerCase();
      const user = db.users.find((item) => item.email.toLowerCase() === email && item.isActive);
      if (!user || !body.password) throw new Error("بيانات الدخول غير صحيحة.");
      window.localStorage.setItem(sessionKey, user.id);
      return { user: authUser(user) } as TData;
    }
    if (segments[1] === "logout") {
      window.localStorage.removeItem(sessionKey);
      return { loggedOut: true } as TData;
    }
    if (segments[1] === "me" || segments[1] === "refresh") {
      const user = getCurrentUser();
      window.localStorage.setItem(sessionKey, user.id);
      return { user: authUser(user) } as TData;
    }
    if (segments[1] === "change-password") return { passwordChanged: true } as TData;
  }

  if (segments[0] === "customers") {
    if (method === "GET" && segments.length === 1) return listCustomers(params) as TData;
    const id = segments[1];
    if (method === "GET" && segments[2] === "bookings") {
      return {
        bookings: db.bookings.filter((booking) => booking.customerId === id).map((booking) => {
          const related = withRelations(booking);
          return {
            id: related.id,
            voucherNumber: related.voucherNumber,
            startAt: related.startAt,
            endAt: related.endAt,
            tripType: related.tripType,
            destination: related.destination,
            status: related.status,
            vehicle: related.vehicle,
            driver: related.driver
          };
        })
      } as TData;
    }
    if (method === "GET") return { customer: db.customers.find((item) => item.id === id) } as TData;
    if (method === "POST") {
      const customer = {
        id: makeId("cus"),
        fullName: String(body.fullName ?? "عميل جديد"),
        phoneCountryCode: String(body.phoneCountryCode ?? "+966"),
        phoneNumber: String(body.phoneNumber ?? ""),
        nationality: typeof body.nationality === "string" && body.nationality ? body.nationality : null,
        notes: typeof body.notes === "string" && body.notes ? body.notes : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.customers.unshift(customer);
      return { customer, possibleMatches: db.customers.filter((item) => item.phoneNumber === customer.phoneNumber && item.id !== customer.id) } as TData;
    }
    if (method === "PATCH") {
      const index = db.customers.findIndex((item) => item.id === id);
      db.customers[index] = { ...db.customers[index], ...body, updatedAt: new Date().toISOString() } as MockCustomer;
      return { customer: db.customers[index], possibleMatches: [] } as TData;
    }
    if (method === "DELETE") {
      const index = db.customers.findIndex((item) => item.id === id);
      const [customer] = db.customers.splice(index, 1);
      return { customer } as TData;
    }
  }

  if (segments[0] === "vehicles") {
    if (method === "GET" && segments.length === 1) return listVehicles(params) as TData;
    const id = segments[1];
    if (method === "GET") return { vehicle: db.vehicles.find((item) => item.id === id) } as TData;
    if (method === "POST") {
      const vehicle = {
        id: makeId("veh"),
        plateNumber: String(body.plateNumber ?? "NEW 1000"),
        make: String(body.make ?? "Mercedes-Benz"),
        model: String(body.model ?? "E-Class"),
        year: Number(body.year ?? 2026),
        passengerCapacity: Number(body.passengerCapacity ?? 4),
        status: "AVAILABLE" as VehicleStatus,
        notes: typeof body.notes === "string" && body.notes ? body.notes : null,
        availability: { selectableForFutureBookings: true, reason: null },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.vehicles.unshift(vehicle);
      return { vehicle } as TData;
    }
    const index = db.vehicles.findIndex((item) => item.id === id);
    if (method === "PATCH" && segments[2] === "status") {
      db.vehicles[index] = { ...db.vehicles[index], status: body.status as VehicleStatus, updatedAt: new Date().toISOString() };
      return { vehicle: db.vehicles[index] } as TData;
    }
    if (method === "PATCH") {
      db.vehicles[index] = { ...db.vehicles[index], ...body, updatedAt: new Date().toISOString() } as MockVehicle;
      return { vehicle: db.vehicles[index] } as TData;
    }
    if (method === "DELETE") {
      const [vehicle] = db.vehicles.splice(index, 1);
      return { vehicle } as TData;
    }
  }

  if (segments[0] === "drivers") {
    if (method === "GET" && segments.length === 1) return listDrivers(params) as TData;
    const id = segments[1];
    if (method === "GET") return { driver: db.drivers.find((item) => item.id === id) } as TData;
    if (method === "POST") {
      const driver = {
        id: makeId("drv"),
        fullName: String(body.fullName ?? "سائق جديد"),
        phoneNumber: String(body.phoneNumber ?? "+966 50 000 0000"),
        status: "AVAILABLE" as DriverStatus,
        overnightDailyRate: Number(body.overnightDailyRate ?? 250).toFixed(2),
        notes: typeof body.notes === "string" && body.notes ? body.notes : null,
        availability: { assignableForFutureBookings: true, reason: null },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.drivers.unshift(driver);
      return { driver } as TData;
    }
    const index = db.drivers.findIndex((item) => item.id === id);
    if (method === "PATCH" && segments[2] === "status") {
      db.drivers[index] = { ...db.drivers[index], status: body.status as DriverStatus, updatedAt: new Date().toISOString() };
      return { driver: db.drivers[index] } as TData;
    }
    if (method === "PATCH") {
      db.drivers[index] = { ...db.drivers[index], ...body, overnightDailyRate: Number(body.overnightDailyRate ?? db.drivers[index].overnightDailyRate).toFixed(2), updatedAt: new Date().toISOString() } as MockDriver;
      return { driver: db.drivers[index] } as TData;
    }
    if (method === "DELETE") {
      const [driver] = db.drivers.splice(index, 1);
      return { driver } as TData;
    }
  }

  if (segments[0] === "bookings") {
    if (method === "GET" && segments.length === 1) {
      const sorted = sortBy(filterBookings(params), params.get("sortBy") ?? "startAt", params.get("sortDirection") ?? "desc");
      const result = paginate(sorted.map(withRelations), queryNumber(params, "page", 1), queryNumber(params, "pageSize", 10));
      return { bookings: result.items, pagination: result.pagination } as TData;
    }
    const id = segments[1];
    if (method === "GET") return { booking: withRelations(db.bookings.find((item) => item.id === id) ?? db.bookings[0]) } as TData;
    if (method === "POST") {
      const booking = createBooking(body);
      db.bookings.unshift(booking);
      return { booking: withRelations(booking) } as TData;
    }
    const index = db.bookings.findIndex((item) => item.id === id);
    if (method === "PATCH" && segments[2] === "status") {
      db.bookings[index] = { ...db.bookings[index], status: body.status as BookingStatus, updatedAt: new Date().toISOString(), updatedById: getCurrentUser().id };
      return { booking: withRelations(db.bookings[index]) } as TData;
    }
    if (method === "POST" && segments[2] === "cancel") {
      db.bookings[index] = { ...db.bookings[index], status: "CANCELLED", cancelledAt: new Date().toISOString(), updatedAt: new Date().toISOString(), notes: String(body.reason ?? db.bookings[index].notes ?? "") };
      return { booking: withRelations(db.bookings[index]) } as TData;
    }
    if (method === "PATCH") {
      db.bookings[index] = createBooking(body, db.bookings[index]);
      return { booking: withRelations(db.bookings[index]) } as TData;
    }
  }

  if (segments[0] === "availability") {
    const startAt = String(body.startAt ?? daysFromNow(0));
    const endAt = String(body.endAt ?? daysFromNow(1));
    const bookingId = String(body.bookingId ?? "");
    const conflicts = db.bookings
      .filter((booking) => booking.id !== bookingId && booking.status !== "CANCELLED")
      .filter((booking) => overlaps(startAt, endAt, booking.availabilityStartAt, booking.availabilityEndAt))
      .flatMap((booking) => [
        ...(booking.vehicleId === body.vehicleId ? [{ type: "VEHICLE" as const, booking }] : []),
        ...(booking.driverId === body.driverId ? [{ type: "DRIVER" as const, booking }] : [])
      ]);
    return {
      availability: {
        hasConflict: conflicts.length > 0,
        availabilityStartAt: startAt,
        availabilityEndAt: endAt,
        conflicts: conflicts.map(({ type, booking }) => ({
          type,
          bookingId: booking.id,
          voucherNumber: booking.voucherNumber,
          startAt: booking.startAt,
          endAt: booking.endAt,
          availabilityStartAt: booking.availabilityStartAt,
          availabilityEndAt: booking.availabilityEndAt,
          status: booking.status
        })),
        alternativeVehicles: db.vehicles.filter((vehicle) => vehicle.status === "AVAILABLE" && vehicle.id !== body.vehicleId).map((vehicle) => ({
          id: vehicle.id,
          plateNumber: vehicle.plateNumber,
          make: vehicle.make,
          model: vehicle.model,
          passengerCapacity: vehicle.passengerCapacity
        })),
        alternativeDrivers: db.drivers.filter((driver) => driver.status === "AVAILABLE" && driver.id !== body.driverId).map((driver) => ({
          id: driver.id,
          fullName: driver.fullName,
          phoneNumber: driver.phoneNumber
        }))
      }
    } as TData;
  }

  if (segments[0] === "dashboard") {
    if (segments[1] === "summary") return dashboardSummary(params) as TData;
    if (segments[1] === "timeline") return timeline(params) as TData;
  }

  if (segments[0] === "reports") {
    if (segments.length === 1) return { reports: reportDefinitions } as TData;
    const type = segments[1];
    if (segments[2] === "export") return undefined as TData;
    const definition = reportDefinitions.find((item) => item.type === type) ?? reportDefinitions[0];
    const rows = reportRows(type, params);
    return {
      report: {
        definition,
        filters: Object.fromEntries(params.entries()),
        rows,
        totals: {
          "إجمالي السجلات": rows.length,
          "إجمالي تقديري": rows.reduce(
            (sum, row) => sum + Number(row.estimatedRevenue ?? row.driverCost ?? 0),
            0
          )
        },
        rowCount: rows.length,
        generatedAt: new Date().toISOString()
      }
    } as TData;
  }

  if (segments[0] === "settings" && segments[1] === "overnight") {
    if (method === "PATCH") {
      setMockSettings({
        defaultDriverDailyRate: Number(body.defaultDriverDailyRate ?? 250).toFixed(2),
        preTripBufferHours: Number(body.preTripBufferHours ?? 12),
        postTripBufferHours: Number(body.postTripBufferHours ?? 12),
        currency: String(body.currency ?? "SAR"),
        timezone: String(body.timezone ?? "Asia/Riyadh")
      });
    }
    return { settings: mockSettings } as TData;
  }

  if (segments[0] === "users") {
    if (method === "GET") return { users: db.users } as TData;
    if (method === "POST") {
      const user = {
        id: makeId("usr"),
        fullName: String(body.fullName ?? "موظف جديد"),
        email: String(body.email ?? "new@alansari.travel"),
        role: (body.role as "ADMIN" | "STAFF") ?? "STAFF",
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null
      };
      db.users.unshift(user);
      return { user } as TData;
    }
    const id = segments[1];
    const index = db.users.findIndex((item) => item.id === id);
    if (method === "PATCH" && segments[2] === "status") {
      db.users[index] = { ...db.users[index], isActive: Boolean(body.isActive), updatedAt: new Date().toISOString() };
      return { user: db.users[index] } as TData;
    }
    if (method === "POST" && segments[2] === "reset-password") return { passwordReset: true } as TData;
    if (method === "PATCH") {
      db.users[index] = { ...db.users[index], ...body, updatedAt: new Date().toISOString() } as MockUser;
      return { user: db.users[index] } as TData;
    }
  }

  throw new Error(`Mock API route is not implemented: ${method} ${path}`);
}
