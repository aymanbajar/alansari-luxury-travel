import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthContext } from "./auth-context";
import { LoginPage } from "./LoginPage";

describe("LoginPage", () => {
  it("shows validation errors before calling login", async () => {
    const login = vi.fn();

    render(
      <AuthContext.Provider
        value={{
          user: null,
          isLoading: false,
          login,
          logout: async () => undefined,
          reloadUser: async () => undefined
        }}
      >
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    await userEvent.click(screen.getByRole("button"));

    expect(login).not.toHaveBeenCalled();
    expect(await screen.findAllByText(/مطلوبة|صحيح/)).not.toHaveLength(0);
  });
});
