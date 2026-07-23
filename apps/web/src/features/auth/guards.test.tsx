import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AuthContext, type AuthContextValue } from "./auth-context";
import { ProtectedRoute, RoleGuard } from "./guards";

const admin = {
  id: "user-admin",
  fullName: "Admin User",
  email: "admin@example.com",
  role: "ADMIN" as const,
  isActive: true
};

const baseAuth = {
  user: null,
  isLoading: false,
  login: async () => undefined,
  logout: async () => undefined,
  reloadUser: async () => undefined
} satisfies AuthContextValue;

function renderWithAuth(value: AuthContextValue, initialPath = "/protected") {
  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/login" element={<div>login-page</div>} />
          <Route path="/unauthorized" element={<div>unauthorized-page</div>} />
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div>protected-content</div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <RoleGuard roles={["ADMIN"]}>
                <div>admin-content</div>
              </RoleGuard>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe("route protection", () => {
  it("redirects anonymous users to login", () => {
    renderWithAuth(baseAuth);

    expect(screen.getByText("login-page")).toBeTruthy();
  });

  it("allows authenticated users into protected routes", () => {
    renderWithAuth({ ...baseAuth, user: admin });

    expect(screen.getByText("protected-content")).toBeTruthy();
  });

  it("redirects Staff users away from Admin routes", () => {
    renderWithAuth(
      {
        ...baseAuth,
        user: { ...admin, id: "user-staff", role: "STAFF" }
      },
      "/admin"
    );

    expect(screen.getByText("unauthorized-page")).toBeTruthy();
  });
});
