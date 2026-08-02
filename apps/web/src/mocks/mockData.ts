// Development-only mock data for exercising the full Alansari Luxury Travel UI.
// Enable with VITE_USE_MOCK_DATA=true. Real API integration remains unchanged.

import type { BookingStatus, TripType, UserRole, VehicleStatus } from "@alansari/shared";
import type { DriverStatus } from "../features/fleet/fleet.types";
import type { ReportDefinition } from "../features/reports/reports.api";

const now = new Date("2026-08-01T09:00:00.000Z");

export interface MockUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface MockCustomer {
  id: string;
  fullName: string;
  phoneCountryCode: string;
  phoneNumber: string;
  nationality: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MockVehicle {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
  year: number;
  passengerCapacity: number;
  status: VehicleStatus;
  notes: string | null;
  availability: { selectableForFutureBookings: boolean; reason: string | null };
  createdAt: string;
  updatedAt: string;
}

export interface MockDriver {
  id: string;
  fullName: string;
  phoneNumber: string;
  status: DriverStatus;
  overnightDailyRate: string;
  notes: string | null;
  availability: { assignableForFutureBookings: boolean; reason: string | null };
  createdAt: string;
  updatedAt: string;
}

export interface MockBooking {
  id: string;
  voucherNumber: string;
  customerId: string;
  vehicleId: string;
  driverId: string;
  startAt: string;
  endAt: string;
  availabilityStartAt: string;
  availabilityEndAt: string;
  tripType: TripType;
  destination: string;
  status: BookingStatus;
  notes: string | null;
  createdById: string;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
  overnightStay: {
    id: string;
    bookingId: string;
    city: string;
    accommodationName: string;
    checkInDate: string;
    checkOutDate: string;
    nightsCount: number;
    driverDailyRate: string;
    totalDriverCost: string;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
}

export function daysFromNow(days: number, hour = 9): string {
  const date = new Date(now);
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hour, 0, 0, 0);
  return date.toISOString();
}

export const mockUsers: MockUser[] = [
  {
    id: "usr-admin-001",
    fullName: "سارة الأنصاري",
    email: "admin@alansari.travel",
    role: "ADMIN" as UserRole,
    isActive: true,
    lastLoginAt: daysFromNow(0, 7),
    createdAt: daysFromNow(-180, 10),
    updatedAt: daysFromNow(-1, 14),
    deletedAt: null
  },
  {
    id: "usr-staff-001",
    fullName: "خالد العتيبي",
    email: "operations@alansari.travel",
    role: "STAFF" as UserRole,
    isActive: true,
    lastLoginAt: daysFromNow(-1, 16),
    createdAt: daysFromNow(-120, 11),
    updatedAt: daysFromNow(-4, 9),
    deletedAt: null
  },
  {
    id: "usr-staff-002",
    fullName: "مريم الحربي",
    email: "dispatch@alansari.travel",
    role: "STAFF" as UserRole,
    isActive: false,
    lastLoginAt: daysFromNow(-21, 13),
    createdAt: daysFromNow(-95, 8),
    updatedAt: daysFromNow(-12, 17),
    deletedAt: null
  }
];

export const mockCustomers: MockCustomer[] = [
  {
    id: "cus-001",
    fullName: "عبدالله بن راشد",
    phoneCountryCode: "+966",
    phoneNumber: "550123456",
    nationality: "السعودية",
    notes: "يفضل سيارة فاخرة هادئة مع ماء بارد ومقاعد خلفية واسعة.",
    createdAt: daysFromNow(-95, 12),
    updatedAt: daysFromNow(-6, 10)
  },
  {
    id: "cus-002",
    fullName: "Nora Whitman",
    phoneCountryCode: "+44",
    phoneNumber: "7700 900221",
    nationality: "United Kingdom",
    notes: "VIP guest. English communication preferred.",
    createdAt: daysFromNow(-80, 9),
    updatedAt: daysFromNow(-2, 16)
  },
  {
    id: "cus-003",
    fullName: "شركة المدار للاستشارات",
    phoneCountryCode: "+966",
    phoneNumber: "112004455",
    nationality: null,
    notes: "حساب شركات، عادة يطلبون عدة مركبات في نفس اليوم.",
    createdAt: daysFromNow(-70, 15),
    updatedAt: daysFromNow(-7, 11)
  },
  {
    id: "cus-004",
    fullName: "Hiro Tanaka",
    phoneCountryCode: "+81",
    phoneNumber: "90-1234-7788",
    nationality: "Japan",
    notes: null,
    createdAt: daysFromNow(-44, 13),
    updatedAt: daysFromNow(-10, 13)
  },
  {
    id: "cus-005",
    fullName: "ليلى الزهراني",
    phoneCountryCode: "+966",
    phoneNumber: "505778899",
    nationality: "السعودية",
    notes: "تحتاج مقعد طفل عند توفره في رحلات المطار.",
    createdAt: daysFromNow(-28, 11),
    updatedAt: daysFromNow(-3, 18)
  },
  {
    id: "cus-006",
    fullName: "Omar Al Fayed",
    phoneCountryCode: "+971",
    phoneNumber: "50 882 4421",
    nationality: "United Arab Emirates",
    notes: "Long note for layout testing: requests precise pickup timing, hotel concierge coordination, bilingual driver, and printed itinerary for multi-stop executive visits.",
    createdAt: daysFromNow(-18, 14),
    updatedAt: daysFromNow(-1, 12)
  }
];

export const mockVehicles: MockVehicle[] = [
  {
    id: "veh-001",
    plateNumber: "RDA 7284",
    make: "Mercedes-Benz",
    model: "S 500",
    year: 2025,
    passengerCapacity: 4,
    status: "AVAILABLE" as VehicleStatus,
    notes: "Executive sedan with rear comfort package.",
    availability: { selectableForFutureBookings: true, reason: null },
    createdAt: daysFromNow(-160, 9),
    updatedAt: daysFromNow(-2, 9)
  },
  {
    id: "veh-002",
    plateNumber: "LUX 4419",
    make: "BMW",
    model: "740Li",
    year: 2024,
    passengerCapacity: 4,
    status: "BOOKED" as VehicleStatus,
    notes: "Preferred for airport executive arrivals.",
    availability: { selectableForFutureBookings: true, reason: "محجوز حاليا لكن متاح لاحقا" },
    createdAt: daysFromNow(-150, 10),
    updatedAt: daysFromNow(0, 8)
  },
  {
    id: "veh-003",
    plateNumber: "VAN 9021",
    make: "Mercedes-Benz",
    model: "V-Class",
    year: 2023,
    passengerCapacity: 7,
    status: "AVAILABLE" as VehicleStatus,
    notes: "Suitable for family and delegation transfers.",
    availability: { selectableForFutureBookings: true, reason: null },
    createdAt: daysFromNow(-140, 12),
    updatedAt: daysFromNow(-5, 14)
  },
  {
    id: "veh-004",
    plateNumber: "SUV 3188",
    make: "Cadillac",
    model: "Escalade",
    year: 2025,
    passengerCapacity: 6,
    status: "MAINTENANCE" as VehicleStatus,
    notes: "Scheduled tire replacement and interior detailing.",
    availability: { selectableForFutureBookings: false, reason: "صيانة مجدولة حتى مساء الغد" },
    createdAt: daysFromNow(-120, 10),
    updatedAt: daysFromNow(-1, 15)
  },
  {
    id: "veh-005",
    plateNumber: "ECO 5520",
    make: "Toyota",
    model: "Camry",
    year: 2022,
    passengerCapacity: 4,
    status: "INACTIVE" as VehicleStatus,
    notes: null,
    availability: { selectableForFutureBookings: false, reason: "غير نشطة في النظام" },
    createdAt: daysFromNow(-90, 8),
    updatedAt: daysFromNow(-30, 8)
  }
];

export const mockDrivers: MockDriver[] = [
  {
    id: "drv-001",
    fullName: "ماجد المطيري",
    phoneNumber: "+966 55 320 9876",
    status: "AVAILABLE" as DriverStatus,
    overnightDailyRate: "275.00",
    notes: "English speaking, experienced with VIP airport protocol.",
    availability: { assignableForFutureBookings: true, reason: null },
    createdAt: daysFromNow(-150, 11),
    updatedAt: daysFromNow(-2, 12)
  },
  {
    id: "drv-002",
    fullName: "فهد الغامدي",
    phoneNumber: "+966 50 741 3350",
    status: "ASSIGNED" as DriverStatus,
    overnightDailyRate: "250.00",
    notes: "Assigned to current city tour.",
    availability: { assignableForFutureBookings: true, reason: "مكلف حاليا ومتاح بعد نهاية الرحلة" },
    createdAt: daysFromNow(-132, 10),
    updatedAt: daysFromNow(0, 7)
  },
  {
    id: "drv-003",
    fullName: "يوسف سالم",
    phoneNumber: "+966 56 880 2221",
    status: "AVAILABLE" as DriverStatus,
    overnightDailyRate: "300.00",
    notes: "Strong knowledge of Makkah, Madinah, and western region hotels.",
    availability: { assignableForFutureBookings: true, reason: null },
    createdAt: daysFromNow(-122, 9),
    updatedAt: daysFromNow(-1, 10)
  },
  {
    id: "drv-004",
    fullName: "ناصر القحطاني",
    phoneNumber: "+966 54 223 7710",
    status: "ON_LEAVE" as DriverStatus,
    overnightDailyRate: "240.00",
    notes: "Annual leave.",
    availability: { assignableForFutureBookings: false, reason: "إجازة حتى الأسبوع القادم" },
    createdAt: daysFromNow(-88, 13),
    updatedAt: daysFromNow(-4, 15)
  },
  {
    id: "drv-005",
    fullName: "Sami Haddad",
    phoneNumber: "+966 53 901 1188",
    status: "INACTIVE" as DriverStatus,
    overnightDailyRate: "225.00",
    notes: null,
    availability: { assignableForFutureBookings: false, reason: "الحساب غير نشط" },
    createdAt: daysFromNow(-70, 8),
    updatedAt: daysFromNow(-20, 10)
  }
];

export const mockBookings: MockBooking[] = [
  {
    id: "bkg-001",
    voucherNumber: "ALT-2026-0801",
    customerId: "cus-001",
    vehicleId: "veh-002",
    driverId: "drv-002",
    startAt: daysFromNow(0, 10),
    endAt: daysFromNow(0, 16),
    availabilityStartAt: daysFromNow(0, 10),
    availabilityEndAt: daysFromNow(0, 16),
    tripType: "CITY" as TripType,
    destination: "جولة اجتماعات داخل الرياض",
    status: "IN_PROGRESS" as BookingStatus,
    notes: "Pickup from Four Seasons, second stop at KAFD.",
    createdById: "usr-staff-001",
    updatedById: "usr-admin-001",
    createdAt: daysFromNow(-4, 12),
    updatedAt: daysFromNow(0, 8),
    cancelledAt: null,
    overnightStay: null
  },
  {
    id: "bkg-002",
    voucherNumber: "ALT-2026-0802",
    customerId: "cus-002",
    vehicleId: "veh-001",
    driverId: "drv-001",
    startAt: daysFromNow(1, 6),
    endAt: daysFromNow(1, 11),
    availabilityStartAt: daysFromNow(1, 5),
    availabilityEndAt: daysFromNow(1, 12),
    tripType: "CITY" as TripType,
    destination: "King Khalid International Airport to Diplomatic Quarter",
    status: "CONFIRMED" as BookingStatus,
    notes: "Flight BA263. Meet-and-greet sign required.",
    createdById: "usr-staff-001",
    updatedById: null,
    createdAt: daysFromNow(-3, 15),
    updatedAt: daysFromNow(-3, 15),
    cancelledAt: null,
    overnightStay: null
  },
  {
    id: "bkg-003",
    voucherNumber: "ALT-2026-0803",
    customerId: "cus-003",
    vehicleId: "veh-003",
    driverId: "drv-003",
    startAt: daysFromNow(2, 8),
    endAt: daysFromNow(4, 20),
    availabilityStartAt: daysFromNow(1, 20),
    availabilityEndAt: daysFromNow(5, 8),
    tripType: "OVERNIGHT" as TripType,
    destination: "الرياض إلى العلا",
    status: "CONFIRMED" as BookingStatus,
    notes: "Delegation of five passengers with luggage.",
    createdById: "usr-admin-001",
    updatedById: "usr-admin-001",
    createdAt: daysFromNow(-10, 10),
    updatedAt: daysFromNow(-1, 11),
    cancelledAt: null,
    overnightStay: {
      id: "ovn-003",
      bookingId: "bkg-003",
      city: "العلا",
      accommodationName: "Banyan Tree AlUla",
      checkInDate: daysFromNow(2, 0),
      checkOutDate: daysFromNow(5, 0),
      nightsCount: 3,
      driverDailyRate: "300.00",
      totalDriverCost: "900.00",
      notes: "Driver accommodation arranged by client.",
      createdAt: daysFromNow(-10, 10),
      updatedAt: daysFromNow(-1, 11)
    }
  },
  {
    id: "bkg-004",
    voucherNumber: "ALT-2026-0804",
    customerId: "cus-004",
    vehicleId: "veh-001",
    driverId: "drv-001",
    startAt: daysFromNow(6, 9),
    endAt: daysFromNow(6, 18),
    availabilityStartAt: daysFromNow(6, 8),
    availabilityEndAt: daysFromNow(6, 19),
    tripType: "OUTSIDE_CITY" as TripType,
    destination: "Riyadh to Edge of the World",
    status: "DRAFT" as BookingStatus,
    notes: null,
    createdById: "usr-staff-001",
    updatedById: null,
    createdAt: daysFromNow(-1, 9),
    updatedAt: daysFromNow(-1, 9),
    cancelledAt: null,
    overnightStay: null
  },
  {
    id: "bkg-005",
    voucherNumber: "ALT-2026-0728",
    customerId: "cus-005",
    vehicleId: "veh-003",
    driverId: "drv-002",
    startAt: daysFromNow(-3, 13),
    endAt: daysFromNow(-3, 17),
    availabilityStartAt: daysFromNow(-3, 13),
    availabilityEndAt: daysFromNow(-3, 17),
    tripType: "CITY" as TripType,
    destination: "Airport transfer and shopping stop",
    status: "COMPLETED" as BookingStatus,
    notes: "Child seat was provided.",
    createdById: "usr-staff-001",
    updatedById: "usr-staff-001",
    createdAt: daysFromNow(-8, 10),
    updatedAt: daysFromNow(-3, 18),
    cancelledAt: null,
    overnightStay: null
  },
  {
    id: "bkg-006",
    voucherNumber: "ALT-2026-0725",
    customerId: "cus-006",
    vehicleId: "veh-004",
    driverId: "drv-004",
    startAt: daysFromNow(-6, 7),
    endAt: daysFromNow(-6, 20),
    availabilityStartAt: daysFromNow(-6, 7),
    availabilityEndAt: daysFromNow(-6, 20),
    tripType: "OUTSIDE_CITY" as TripType,
    destination: "Dammam corporate roadshow",
    status: "CANCELLED" as BookingStatus,
    notes: "Cancelled by client due to meeting postponement.",
    createdById: "usr-admin-001",
    updatedById: "usr-admin-001",
    createdAt: daysFromNow(-12, 8),
    updatedAt: daysFromNow(-6, 9),
    cancelledAt: daysFromNow(-6, 9),
    overnightStay: null
  }
];

export let mockSettings = {
  defaultDriverDailyRate: "250.00",
  preTripBufferHours: 12,
  postTripBufferHours: 12,
  currency: "SAR",
  timezone: "Asia/Riyadh"
};

export function setMockSettings(next: typeof mockSettings): void {
  mockSettings = next;
}

export const reportDefinitions: ReportDefinition[] = [
  {
    type: "daily-bookings",
    title: "الحجوزات اليومية",
    columns: [
      { key: "voucherNumber", label: "الفاوتشر" },
      { key: "customerName", label: "العميل" },
      { key: "startAt", label: "البداية", type: "datetime" },
      { key: "destination", label: "الوجهة" },
      { key: "status", label: "الحالة" },
      { key: "estimatedRevenue", label: "الإيراد التقديري", type: "money", restrictedTo: ["ADMIN"] }
    ]
  },
  {
    type: "daily-dispatch",
    title: "إرسال اليوم",
    columns: [
      { key: "time", label: "الوقت" },
      { key: "vehicle", label: "المركبة" },
      { key: "driver", label: "السائق" },
      { key: "customerName", label: "العميل" },
      { key: "destination", label: "المسار" },
      { key: "status", label: "الحالة" }
    ]
  },
  {
    type: "overnight-stays",
    title: "رحلات المبيت",
    columns: [
      { key: "voucherNumber", label: "الفاوتشر" },
      { key: "city", label: "المدينة" },
      { key: "hotel", label: "السكن" },
      { key: "nights", label: "الليالي", type: "number" },
      { key: "driverCost", label: "تكلفة السائق", type: "money", restrictedTo: ["ADMIN"] },
      { key: "status", label: "الحالة" }
    ]
  },
  {
    type: "vehicle-utilization",
    title: "استخدام المركبات",
    columns: [
      { key: "vehicle", label: "المركبة" },
      { key: "plateNumber", label: "اللوحة" },
      { key: "bookingCount", label: "عدد الحجوزات", type: "number" },
      { key: "utilizationHours", label: "ساعات التشغيل", type: "number" },
      { key: "status", label: "الحالة" }
    ]
  }
];
