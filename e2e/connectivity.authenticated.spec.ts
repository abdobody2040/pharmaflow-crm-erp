import { expect, test } from "./auth.fixture";

test.describe("rep synchronization connection status", () => {
  test("shows protected queue messaging when the network is lost and restored", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/rep");
    const status = page.getByTestId("sync-connection-status");
    await expect(status).toContainText(/connected to server|متصل بالخادم/i);

    await page.evaluate(() => window.dispatchEvent(new Event("offline")));
    await expect(status).toContainText(/offline|غير متصل/i);
    await expect(status).toContainText(/protected|محفوظة/i);

    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await expect(status).toContainText(
      /connection restored|تمت استعادة الاتصال/i
    );
  });
});
