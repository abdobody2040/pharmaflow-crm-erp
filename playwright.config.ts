import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000", headless: true, screenshot: "only-on-failure", launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH ?? "/usr/bin/chromium" } },
  reporter: [["list"], ["html", { open: "never" }]],
});
