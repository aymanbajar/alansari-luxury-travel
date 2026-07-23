import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DashboardPage } from "./DashboardPage";

vi.mock("../features/dashboard/dashboard.api", () => ({
  getDashboardSummary: vi.fn(async () => ({
    dashboard: {
      range: {
        startFrom: "2026-08-01T00:00:00.000Z",
        endTo: "2026-08-02T00:00:00.000Z"
      },
      cards: {
        todayTotalBookings: 1,
        todayConfirmedBookings: 1,
        vehiclesAvailable: 44,
        vehiclesBooked: 1,
        vehiclesUnderMaintenance: 0,
        activeDrivers: 5,
        upcomingBookings: 1,
        overnightBookings: 1,
        bookingsRequiringAttention: 0
      },
      todaysDispatch: [],
      upcomingBookings: [],
      recentChanges: [],
      overnightAlerts: [],
      vehicleStatusOverview: [],
      restricted: { financialStatisticsHidden: false }
    }
  })),
  getVehicleTimeline: vi.fn(async () => ({
    timeline: {
      range: {
        startFrom: "2026-08-01T00:00:00.000Z",
        endTo: "2026-08-02T00:00:00.000Z"
      },
      view: "day",
      rows: [
        {
          vehicle: {
            id: "vehicle-1",
            plateNumber: "KSA-1001",
            make: "Toyota",
            model: "Hiace",
            status: "AVAILABLE",
            passengerCapacity: 12
          },
          bookings: [
            {
              id: "booking-1",
              voucherNumber: "VCH-1001",
              customerId: "customer-1",
              vehicleId: "vehicle-1",
              driverId: "driver-1",
              customer: {
                id: "customer-1",
                fullName: "Customer One",
                phoneCountryCode: "+966",
                phoneNumber: "500000001"
              },
              vehicle: {
                id: "vehicle-1",
                plateNumber: "KSA-1001",
                make: "Toyota",
                model: "Hiace",
                status: "AVAILABLE"
              },
              driver: {
                id: "driver-1",
                fullName: "Driver One",
                phoneNumber: "+966500000002",
                status: "AVAILABLE"
              },
              status: "CONFIRMED",
              tripType: "OVERNIGHT",
              destination: "Jeddah",
              notes: null,
              startAt: "2026-08-01T08:00:00.000Z",
              endAt: "2026-08-01T12:00:00.000Z",
              availabilityStartAt: "2026-08-01T08:00:00.000Z",
              availabilityEndAt: "2026-08-01T12:00:00.000Z",
              overnightStay: {
                id: "overnight-1",
                city: "Jeddah",
                accommodationName: "Sea Hotel",
                checkInDate: "2026-08-01",
                checkOutDate: "2026-08-02",
                nightsCount: 1,
                driverDailyRate: "250.00",
                totalDriverCost: "250.00",
                notes: null
              }
            }
          ]
        }
      ]
    }
  }))
}));

vi.mock("../features/fleet/vehicles.api", () => ({
  listVehicles: vi.fn(async () => ({ vehicles: [], total: 0, page: 1, pageSize: 100 }))
}));

vi.mock("../features/fleet/drivers.api", () => ({
  listDrivers: vi.fn(async () => ({ drivers: [], total: 0, page: 1, pageSize: 100 }))
}));

vi.mock("../features/customers/customers.api", () => ({
  listCustomers: vi.fn(async () => ({ customers: [], total: 0, page: 1, pageSize: 100 }))
}));

describe("DashboardPage", () => {
  it("renders timeline bookings and opens booking details", async () => {
    render(<DashboardPage />);

    expect(await screen.findByText("KSA-1001")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /VCH-1001/ }));

    await waitFor(() => {
      expect(screen.getByText("Sea Hotel")).toBeTruthy();
    });
  });
});
