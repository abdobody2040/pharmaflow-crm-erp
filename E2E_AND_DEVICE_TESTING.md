# Local E2E and Device-Test Readiness

## Web browser suite

Run `pnpm test:e2e` while the local server is listening on `http://127.0.0.1:3000`, or set `PLAYWRIGHT_BASE_URL` to an approved local/staging endpoint. The suite uses the installed local Chromium binary by default; set `PLAYWRIGHT_CHROMIUM_PATH` if your runner uses a different executable. It currently proves the unauthenticated entry path and deterministic browser geolocation mocking without a device.

Authenticated E2E flows must use **disposable tenant accounts** and a test-only auth fixture. Once such a tenant is available, expand the suite in this order: login, start shift, mocked GPS ping, visit capture, explicit signature action, offline queue replay, sample hand-off, dashboard verification, campaign approval, anomaly lifecycle.

## Android and iOS boundary

The repository’s Expo app contains the field-workflow foundation, but this Linux sandbox has neither Android `adb`/emulator nor macOS/Xcode/iOS simulator. Do not mark Android/iOS E2E as passed here. Execute the same scenario on Android using a development build with mock location enabled, and on macOS using an iOS simulator or physical device. Capture permission prompts, background/foreground behavior, offline queue data, and server audit evidence as OQ attachments.
