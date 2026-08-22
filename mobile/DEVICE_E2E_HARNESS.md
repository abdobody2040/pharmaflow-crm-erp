# Rep App Device E2E Harness

## Status

The test harness is prepared but **not executed** in this Linux sandbox: no Android SDK/emulator, `adb`, macOS/Xcode, or iOS simulator is available. Execute this protocol only with a disposable tenant, a test HCP, a disposable sample lot, and a controlled GPS coordinate. Do not use a customer account or a production tenant.

## Shared setup

Set the app API base URL to the approved staging endpoint, create a local test rep account, and activate a planned visit at the controlled HCP location. On a mobile development workstation, run:

```bash
cd mobile
pnpm install
pnpm start
```

Retain the environment values, app build version, test device model/OS version, permission state, and tenant identifier in the test evidence. Do not collect location outside an explicitly started test shift.

## Android execution

Install Android Studio and an API-level-compatible Android image. Start an emulator, then run `pnpm android`. In the emulator’s location controls, set the planned HCP coordinates. Execute: sign in → grant consent → start shift → confirm visible tracking status → emit a standard ping → move to the HCP coordinate → confirm near-stop cadence → create visit → perform explicit signature action → create sample hand-off → disable network → create queued visit → restore network → trigger sync → verify deduplicated server records and dashboard visibility → stop shift.

Capture Android permission dialogs, active-shift notice, queue state before/after sync, API/audit record IDs, and battery/network behavior. Test location permission denial and consent revocation as separate negative scenarios.

## iOS execution

Use macOS with Xcode and an iOS simulator or signed development device, then run `pnpm ios`. Use Xcode’s simulated location facility or a device test location. Repeat the Android sequence, with particular attention to background-location permission wording, foreground/background shift transitions, and immediate halt after Stop Shift. Capture the same audit and queue evidence.

## Acceptance criteria

The rep cannot start tracking without consent and an active shift. Each accepted ping remains tenant/rep/shift scoped. Offline mutations replay idempotently after connectivity returns. The signature procedure requires both credential confirmation and explicit action. Visit/sample records, GPS evidence, and dashboard aggregates are visible only to authorized users in the disposable tenant. Record any discrepancy as an OQ deviation; do not mark the mobile path passed without device artifacts.

## Network-outage and retry evidence

For both Android and iOS, create one disposable planned visit, start the explicitly consented shift, and disable the emulator/device network immediately before submitting the visit. Confirm the UI or system notification reports the offline state and that the queued operation retains its immutable client mutation ID. Restore connectivity, trigger the queue retry, and capture the transition from syncing to completed. Record the queue count before and after replay, the attempt count, the last-attempt timestamp, the failure reason captured during the outage, and the server-side visit/audit identifiers. Repeat once with the server endpoint unavailable while the device remains online to distinguish a transport/server failure from a device-offline failure.

These device runs remain staging-dependent in this Linux sandbox. Do not claim Android or iOS execution until emulator/device artifacts, API logs, and tenant-scoped server evidence are attached to the test record.
