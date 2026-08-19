# Project TODO

- [x] Define MySQL tenant-aware schema with foreign keys, plan tiers, status lifecycles, and append-only compliance tables.
- [x] Generate and apply a MySQL migration for the foundational schema.
- [x] Implement tenant-scoped database helpers and role-gated tRPC procedures with no hard-delete paths.
- [x] Implement super-admin tenant provisioning, tenant listing, suspension, plan assignment, and first-admin bootstrap flows.
- [x] Implement tenant-scoped employee directory procedures and audit-ready metadata.
- [x] Build the premium React admin dashboard with dashboard navigation, compliance registry views, and tenant provisioning console.
- [x] Add route-level role guards and state-aware dashboard navigation.
- [x] Add MySQL, Node.js, and Nginx self-hosted VPS Docker Compose configuration with environment templates.
- [x] Write self-hosted deployment and architecture documentation.
- [x] Write and run Vitest coverage for authorization, tenant scoping, immutability, and provisioning guardrails.
- [x] Save the final project checkpoint after final validation.
- [x] Document the target MySQL 8.4 migration and append-only trigger validation procedure required before production go-live.
- [x] Add a secured super-admin plan-tier change action to the tenant console.
- [x] Extend Vitest coverage for super-admin provisioning/lifecycle authorization and immutable procedure guardrails.
