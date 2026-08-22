import { expect, test } from "./auth.fixture";

const account = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Network Outage HCP",
  accountType: "doctor",
  specialty: "Cardiology",
};

const trpcSuccess = (json: unknown) =>
  JSON.stringify([{ result: { data: { json } } }]);

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

  test("queues a submitted visit offline and replays it after reconnection", async ({
    authenticatedPage: page,
  }) => {
    await page.route("**/api/trpc/rep.hcpLookup**", async route => {
      await route.fulfill({
        contentType: "application/json",
        body: trpcSuccess([account]),
      });
    });
    await page.route("**/api/trpc/rep.syncVisit**", async route => {
      await route.fulfill({
        contentType: "application/json",
        body: trpcSuccess({ id: "visit-network-replayed" }),
      });
    });

    await page.goto("/rep");
    await page.getByPlaceholder("Search HCP or account").fill("Network");
    await page.getByRole("button", { name: /Network Outage HCP/i }).click();
    await page.context().setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event("offline")));

    await page
      .getByPlaceholder("Visit objective")
      .fill("Confirm outage replay");
    await page
      .getByPlaceholder("Products discussed, comma separated")
      .fill("Cardio sample");
    await page.getByRole("button", { name: "Record visit" }).click();

    const status = page.getByTestId("sync-connection-status");
    await expect(status).toContainText(/1 visit record|سجل زيارة واحد/i);
    await expect(status).toContainText(/offline|غير متصل/i);

    await page.context().setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await page
      .getByRole("button", { name: /Retry sync|إعادة محاولة المزامنة/i })
      .click();
    await expect(status).toContainText(/no visit data|لا توجد بيانات زيارة/i);
    await expect(
      page.getByText(/all queued visit data is now synced|تمت الآن مزامنة/i)
    ).toBeVisible();
  });
});
