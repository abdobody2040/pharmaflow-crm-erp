import { expect, test } from "@playwright/test";

test("the protected web application redirects unauthenticated users to its sign-in experience", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toContainText(/sign in|login|continue/i);
});

test("browser GPS can be deterministically mocked for local field-workflow tests", async ({ browser }) => {
  const context = await browser.newContext({ permissions: ["geolocation"], geolocation: { latitude: 30.0444, longitude: 31.2357, accuracy: 5 } });
  const page = await context.newPage();
  await page.goto("/");
  const coordinates = await page.evaluate(() => new Promise<string>((resolve, reject) => navigator.geolocation.getCurrentPosition(position => resolve(`${position.coords.latitude},${position.coords.longitude}`), error => reject(new Error(error.message)))));
  expect(coordinates).toBe("30.0444,31.2357");
  await context.close();
});
