import { expect, test } from "./auth.fixture";

test.describe("authenticated role-safe web workflows", () => {
  test("authenticated user reaches the protected dashboard and operations workspace", async ({
    authenticatedPage: page,
  }) => {
    await expect(
      page.getByRole("heading", { name: /command center|مركز القيادة/i })
    ).toBeVisible();
    await page.goto("/operations");
    await expect(
      page.getByText(/forecast, procure, operate|تنبأ، اشترِ/i)
    ).toBeVisible();
  });
});
