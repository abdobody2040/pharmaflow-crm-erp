import { authenticatedConfigured, expect, test } from "./auth.fixture";

test.describe("authenticated role-safe web workflows", () => {
  test.skip(!authenticatedConfigured, "Set E2E_EMAIL and E2E_PASSWORD for a disposable local test account.");
  test("authenticated user reaches the protected dashboard and operations workspace", async ({ authenticatedPage: page }) => {
    await expect(page.getByText(/command center|مركز القيادة/i)).toBeVisible();
    await page.goto("/operations");
    await expect(page.getByText(/forecast, procure, operate|تنبأ، اشترِ/i)).toBeVisible();
  });
});
