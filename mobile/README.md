# PharmaFlow Rep Mobile

This Expo React Native workspace targets **Android and iOS from one codebase**. It provides a SQLite-backed immutable mutation queue and active-shift location task design. Run `pnpm install` then `npx expo start` from this directory after setting the production API base URL and session handoff.

The app requests location permission only after the rep accepts the disclosure and selects **Start Shift**. It immediately removes the native location task on **Stop Shift**. The mobile operating systems remain the final authority on background scheduling; 60-second reporting is the baseline and the task switches to 15 seconds only within 200 metres of cached planned-stop coordinates.
