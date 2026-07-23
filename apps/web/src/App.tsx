import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { AuthProvider } from "./features/auth/AuthProvider";
import { ProtectedRoute, RoleGuard } from "./features/auth/guards";
import { LoginPage } from "./features/auth/LoginPage";
import { AppLayout } from "./layout/AppLayout";
import { BookingsPage } from "./pages/BookingsPage";
import { ChangePasswordPage } from "./pages/ChangePasswordPage";
import { CustomersPage } from "./pages/CustomersPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DriversPage } from "./pages/DriversPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { StaffManagementPage } from "./pages/StaffManagementPage";
import { UnauthorizedPage } from "./pages/UnauthorizedPage";
import { VehiclesPage } from "./pages/VehiclesPage";

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/unauthorized", element: <UnauthorizedPage /> },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "bookings", element: <BookingsPage /> },
      { path: "customers", element: <CustomersPage /> },
      { path: "vehicles", element: <VehiclesPage /> },
      { path: "drivers", element: <DriversPage /> },
      { path: "reports", element: <ReportsPage /> },
      { path: "change-password", element: <ChangePasswordPage /> },
      {
        path: "staff",
        element: (
          <RoleGuard roles={["ADMIN"]}>
            <StaffManagementPage />
          </RoleGuard>
        )
      },
      {
        path: "settings",
        element: (
          <RoleGuard roles={["ADMIN"]}>
            <SettingsPage />
          </RoleGuard>
        )
      },
      { path: "*", element: <Navigate to="/" replace /> }
    ]
  }
]);

export function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
