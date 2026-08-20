# Local Validation Notes

## Arabic sign-in visual check — 2026-08-20

The local preview was opened and switched to Arabic. The sign-in experience rendered Arabic labels, explanatory copy, heading, action label, and right-to-left shell alignment without overlap. The browser smoke suite separately confirmed the same language switch and deterministic GPS mock. Authenticated module checks remain environment-driven and are skipped until disposable `E2E_EMAIL` and `E2E_PASSWORD` credentials are supplied.
