# Local E2E and Device-Test Readiness

## Web browser suite

Run `pnpm test:e2e` while the local server is listening on `http://127.0.0.1:3000`, or set `PLAYWRIGHT_BASE_URL` to an approved local/staging endpoint. The suite uses the installed local Chromium binary by default; set `PLAYWRIGHT_CHROMIUM_PATH` if your runner uses a different executable. It currently proves the unauthenticated entry path and deterministic browser geolocation mocking without a device.

Authenticated E2E flows must use **disposable tenant accounts** and a test-only auth fixture. Once such a tenant is available, expand the suite in this order: login, start shift, mocked GPS ping, visit capture, explicit signature action, offline queue replay, sample hand-off, dashboard verification, campaign approval, anomaly lifecycle.

## Authenticated web fixture

The repository now includes `e2e/auth.fixture.ts`, which calls the real `auth.localLogin` tRPC endpoint and passes the returned JWT through the same session-storage bearer-token path used by the web application. It does not hardcode credentials. Run the protected-route tests with a disposable, active local account:

```bash
E2E_EMAIL='e2e-admin@example.test' \
E2E_PASSWORD='replace-with-disposable-test-password' \
E2E_TENANT_SLUG='e2e-tenant' \
pnpm test:e2e
```

Without these environment variables the authenticated test is intentionally reported as skipped; the unauthenticated and GPS mock tests still run. Do not use a customer account or production password for E2E.

## Android and iOS boundary

The repository’s Expo app contains the field-workflow foundation, but this Linux sandbox has neither Android `adb`/emulator nor macOS/Xcode/iOS simulator. Do not mark Android/iOS E2E as passed here. Execute the same scenario on Android using a development build with mock location enabled, and on macOS using an iOS simulator or physical device. Capture permission prompts, background/foreground behavior, offline queue data, and server audit evidence as OQ attachments.
