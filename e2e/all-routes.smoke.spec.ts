import { expect, test } from "@playwright/test";

const admin = {
  id: 21,
  tenantId: "tenant-local",
  name: "Local QA Admin",
  email: "qa-admin@local.example",
  role: "admin",
  status: "active",
  openId: "local:qa-admin",
};

const accountId = "00000000-0000-4000-8000-000000000001";
const operationalRoutes = [
  "/",
  "/operations",
  "/inventory",
  "/documents",
  "/integrations",
  "/terminology",
  "/compliance",
  "/bi",
  "/rep",
  "/rep/assistant",
  "/ai",
  "/analytics",
  "/marketing",
  "/routes",
  "/hr",
  "/tracking",
  "/tenants",
  `/crm/accounts/${accountId}`,
  "/crm/accounts",
  "/crm/contacts",
  "/crm/plans",
  "/crm/territories",
  "/crm/cycles",
  "/crm/opportunities",
  "/visits/new",
  "/directory",
  "/visits",
  "/samples",
  "/signatures",
];

test.beforeEach(async ({ page }) => {
  await page.route("**/api/trpc/**", async route => {
    const endpoint =
      new URL(route.request().url()).pathname
        .split("/api/trpc/")[1]
        ?.split("?")[0] ?? "";
    const procedures = endpoint.split(",").filter(Boolean);
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        procedures.map(procedure => ({
          result: { data: { json: procedure === "auth.me" ? admin : [] } },
        }))
      ),
    });
  });
});

test("every registered operational route renders a protected shell without an uncaught client error", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", error => pageErrors.push(error.message));

  for (const path of operationalRoutes) {
    await page.goto(path);
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("body")).not.toContainText(
      /application error|something went wrong/i
    );
  }

  expect(pageErrors).toEqual([]);
});
