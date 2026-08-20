import { expect, test } from "@playwright/test";

const manager = {
  id: 21,
  tenantId: "tenant-local",
  name: "Local Manager",
  email: "manager@local.example",
  role: "admin",
  status: "active",
  openId: "local:manager",
};

const majorPaths = [
  "/crm/accounts",
  "/operations",
  "/inventory",
  "/documents",
  "/integrations",
  "/compliance",
  "/hr",
  "/marketing",
  "/tracking",
  "/routes",
  "/analytics",
  "/bi",
];

const knownEnglishOperationalCopy =
  /(?:Warehouse Inventory|Document Register|Integrations|Compliance Review|Operations Expansion|Inventory control|Document register|Record compensating movement|Issue v1 API key|Marketing & approved content|GPS tracking & geofencing|Business intelligence|ERP \/ HR workspace|Routing operations|Ask your operational data)/i;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("pharmaflow-language", "ar")
  );
  await page.route("**/api/trpc/**", async route => {
    const endpoint =
      new URL(route.request().url()).pathname
        .split("/api/trpc/")[1]
        ?.split("?")[0] ?? "";
    const procedures = endpoint.split(",").filter(Boolean);
    const result = procedures.map(procedure => ({
      result: { data: { json: procedure === "auth.me" ? manager : [] } },
    }));
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(result),
    });
  });
});

test("major application modules render their static operational shell in Arabic with RTL under local mocked contracts", async ({
  page,
}) => {
  for (const path of majorPaths) {
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("body")).not.toContainText(
      knownEnglishOperationalCopy
    );
  }
});
