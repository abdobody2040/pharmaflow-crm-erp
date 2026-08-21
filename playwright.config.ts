import { defineConfig } from "@playwright/test";
import { randomBytes } from "crypto";

const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const localBaseUrl = "http://127.0.0.1:3200";
const ephemeralJwtSecret = randomBytes(48).toString("hex");

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  workers: 1,
  use: {
    baseURL: externalBaseUrl ?? localBaseUrl,
    headless: true,
    screenshot: "only-on-failure",
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_PATH ?? "/usr/bin/chromium",
    },
  },
  webServer: externalBaseUrl
    ? undefined
    : {
        command: `JWT_SECRET=${ephemeralJwtSecret} PORT=3200 pnpm dev`,
        url: localBaseUrl,
        reuseExistingServer: false,
        timeout: 120_000,
      },
  reporter: [["list"], ["html", { open: "never" }]],
});
