# Prompt 14 — Operational Test Boundaries and Required Infrastructure

## Purpose

Prompt 14 requires **measured operational evidence**, not estimates: a large-data benchmark, browser and mobile end-to-end execution, NTP and database restore tests, DAST, and multi-instance rate-limit validation. This document records what is available in the current sandbox and the minimum non-production infrastructure required to make each claimed result reproducible.

| Evidence item | Current sandbox status | What is required for a valid result |
|---|---|---|
| MySQL large-data benchmark | MySQL client is available; no isolated MySQL benchmark database or approved staging tenant is connected for destructive seed/reset work. | Dedicated MySQL 8.4 staging database with an empty benchmark tenant and a named database URL supplied through the project secret store. |
| GPS/map/BI timing | Application source and tests are available, but no approved large dataset exists. | Controlled benchmark dataset, fixed VPS size, database/index snapshot, warm-up policy, and recorded p50/p95/p99 timings. |
| Android emulator E2E | Android SDK, `adb`, and emulator are not installed. | Android SDK/emulator image or connected device, Expo development build, test account, and controlled mock-location permission. |
| iOS simulator E2E | iOS simulator tooling is unavailable on Linux. | macOS runner with Xcode simulator or physical iOS device and an Expo development build. |
| Web browser E2E | A browser preview exists, but no dedicated Playwright setup was previously committed. | Playwright suite, disposable tenant fixtures, authenticated test accounts, and CI browser dependencies. |
| NTP evidence | Server code uses server-side time; host NTP status cannot be asserted from application tests alone. | Target VPS chrony/systemd-timesyncd status, drift policy, monitor output, and signed operator capture. |
| MySQL backup/restore | No isolated MySQL 8.4 staging instance is provisioned here. | Staging database, encrypted backup location, restore target, row-count/checksum assertions, and retention approval. |
| DAST | No approved scanner target or scanner installation is available. | Isolated authenticated staging URL, written scope, ZAP/Burp/approved scanner, and a remediation acceptance process. |
| Distributed rate limit | Current implementation is deliberately in-memory per instance. | Two or more app instances, shared Redis-compatible limiter, load generator, and test isolation. |

## Safety gates

The benchmark and restore scripts must refuse to run unless the operator supplies an explicit non-production confirmation and a database name that includes a staging/benchmark marker. They must create and clean only a dedicated benchmark tenant; they must never seed an existing customer tenant or a production database. DAST must run against an approved staging URL only.

> The absence of a non-production database, device simulator, scanner, or multi-node environment is recorded as a **blocked operational proof**, not as a passing result.

## Requested operator inputs

To execute the measured parts of Prompt 14, supply the following through the project’s secure configuration flow: a dedicated MySQL 8.4 staging connection, an empty database/tenant reserved for benchmarks, the staging web URL for DAST, and confirmation of whether Android and/or macOS/iOS runners are available. No customer data or production credentials are required.
