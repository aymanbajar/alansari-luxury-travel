import { expect, type Page, test } from "@playwright/test";

const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "admin@alansari.local";
const staffEmail = process.env.E2E_STAFF_EMAIL ?? "staff@alansari.local";
const password = process.env.E2E_PASSWORD ?? "ChangeMe123!";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel(/البريد|Email/i).fill(email);
  await page.getByLabel(/كلمة|Password/i).fill(password);
  await page.getByRole("button").click();
  await expect(page).toHaveURL(/\/$/);
}

test.describe("controlled production readiness journey", () => {
  test("Admin operational journey through setup, timeline, reports, and logout", async ({
    page
  }) => {
    test.skip(
      !process.env.RUN_E2E,
      "Requires seeded database, running API, browser binaries, and RUN_E2E=1."
    );

    await login(page, adminEmail);
    await page.goto("/vehicles");
    await expect(page.getByText(/المركبات|Vehicles/i)).toBeVisible();

    await page.goto("/drivers");
    await expect(page.getByText(/السائقين|Drivers/i)).toBeVisible();

    await page.goto("/customers");
    await expect(page.getByText(/العملاء|Customers/i)).toBeVisible();

    await page.goto("/bookings");
    await expect(page.getByText(/الحجوزات|Bookings/i)).toBeVisible();

    await page.goto("/");
    await expect(page.getByText(/VCH|الفاوتشر/i).first()).toBeVisible();

    await page.goto("/reports");
    await page.getByRole("button", { name: /Excel|إكسل/i }).click();

    await page.getByRole("button", { name: /خروج|Logout/i }).click();
    await expect(page).toHaveURL(/login/);
  });

  test("Staff can log in without admin-only navigation", async ({ page }) => {
    test.skip(!process.env.RUN_E2E, "Requires seeded database and RUN_E2E=1.");

    await login(page, staffEmail);
    await expect(page.getByText(/الموظفين|Staff/i)).toHaveCount(0);
  });
});
