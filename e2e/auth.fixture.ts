import { expect, test as base } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const tenantSlug = process.env.E2E_TENANT_SLUG;
const configured = Boolean(email && password);

export const test = base.extend<{ authenticatedPage: import("@playwright/test").Page }>({
  authenticatedPage: async ({ page, baseURL }, use) => {
    if (!configured) throw new Error("Authenticated E2E requires E2E_EMAIL and E2E_PASSWORD for a disposable local test user.");
    const response = await page.request.post(`${baseURL}/api/trpc/auth.localLogin?batch=1`, { data: { "0": { json: { email, password, ...(tenantSlug ? { tenantSlug } : {}) } } } });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    const token = body?.[0]?.result?.data?.json?.token;
    if (!token) throw new Error("Authenticated E2E localLogin did not return a token");
    await page.addInitScript(value => sessionStorage.setItem("pharmaflow-local-token", value), token);
    await page.goto("/");
    await use(page);
  },
});
export { expect };
export const authenticatedConfigured = configured;
