import { expect, test } from "./auth.fixture";

const configuredPaths = (
  process.env.E2E_MAJOR_PATHS ??
  "/operations,/inventory,/documents,/integrations,/compliance"
)
  .split(",")
  .map(path => path.trim())
  .filter(Boolean);

const knownEnglishLabels =
  /Warehouse Inventory|Document Register|Integrations|Compliance Review|Operations Expansion|Inventory control|Document register|Record compensating movement|Create scorecard|Issue v1 API key/i;

test.describe("authenticated Arabic major-module localization", () => {
  test("renders each role-accessible configured module in RTL without known English operational labels", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage
      .getByRole("button", { name: "Open profile menu" })
      .first()
      .click();
    await authenticatedPage
      .getByRole("button", { name: /Arabic|العربية/i })
      .click();
    await expect(authenticatedPage.locator("html")).toHaveAttribute(
      "dir",
      "rtl"
    );

    for (const path of configuredPaths) {
      await authenticatedPage.goto(path);
      await expect(authenticatedPage.locator("html")).toHaveAttribute(
        "lang",
        "ar"
      );
      const body = authenticatedPage.locator("body");
      const denied = await body
        .getByText("دورك الحالي لا يمكنه فتح هذه الوحدة.")
        .count();
      if (denied) continue;
      await expect(body).not.toContainText(knownEnglishLabels);
    }
  });
});
