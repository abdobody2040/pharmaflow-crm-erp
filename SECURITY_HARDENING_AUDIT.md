# PharmaFlow Security Hardening & Multi-Tenant Audit

## Scope and result

This audit covers the application’s tRPC routers, platform procedures, HTTP entry points, reverse proxy, Compose packaging, and tenant-operator workflows. The review found that feature routers use authenticated role procedures, tenant-scoped procedures resolve the active tenant server-side, and inputs are defined using Zod contracts. The hardening release adds defense-in-depth HTTP limits and documents the operator boundary; it does not claim that configuration alone replaces a customer’s security assessment or operational controls.

| Surface | Input contract | Access control | Tenant boundary | Rate-limit posture |
|---|---|---|---|---|
| `auth` | Typed login/session inputs | Public only for session establishment; protected for identity state | Tenant selected through controlled login/session context | Application and Nginx API limits |
| `platform` | Zod legal name, slug, plan, region, password, lifecycle reason | `superAdminProcedure` only | Platform scope; no tenant-user cross-tenant grant | Application and Nginx API limits |
| `directory` | Zod employee and lifecycle inputs | Tenant-role procedures | Active tenant scope and tenant predicates | Application and Nginx API limits |
| `compliance` | Zod regulated-record, signature, review, and change-control inputs | Role-specific tenant procedures | Tenant predicates and immutable evidence links | Application and Nginx API limits |
| `crm` | Zod account, contact, territory, cycle, and opportunity inputs | Role-specific tenant procedures | Tenant predicates and referenced-record validation | Application and Nginx API limits |
| `rep` | Zod offline mutation and location inputs | Rep-capable tenant procedures | User and tenant scope checks; idempotent mutation controls | Application and Nginx API limits |
| `tracking` / `routing` | Zod coordinate, route, and plan inputs | Role-specific tenant procedures | Tenant ownership checks for routes, shifts, and telemetry | Application and Nginx API limits |
| `hr` | Zod employee, leave, expense, attendance, and export inputs | HR/admin/manager role procedures | Active tenant scope on employee and workflow access | Application and Nginx API limits |
| `marketing` | Zod campaign, segment, approved-content, and delivery inputs | Role-specific tenant procedures | Tenant ownership and status checks | Application and Nginx API limits |
| `ai` / `analytics` / `bi` | Bounded Zod task, filter, export, and view inputs | Role-specific tenant procedures | Tenant-scoped data queries and allow-listed analytics plans | Application and Nginx API limits |
| Scheduled anomaly endpoint | Internal scheduled handler | Authenticated scheduling boundary | Tenant-specific monitor execution | Reverse-proxy API limit plus scheduler authentication |

## Implemented HTTP controls

The Express server removes `X-Powered-By`, limits JSON/form request bodies to 1 MB, returns no-store headers on API responses, and adds CSP, framing, MIME, referrer, permissions, and opener-policy headers. It applies an in-process per-IP API limit of 300 requests per minute. Nginx supplies a separate 20 requests-per-second API limit with a bounded burst and a 6 MB body limit, preserving the 5 MB receipt-upload requirement while restricting oversized requests.

The operator must set `TRUST_PROXY=true` only when the bundled Nginx instance is the immediate proxy. Trusting arbitrary forwarded headers would weaken client-IP rate limiting. In production, TLS termination, firewall restriction, host patching, time synchronization, encrypted backups, and secret rotation remain operator responsibilities.

## Multi-tenant packaging assurance

Tenant provisioning is limited to `super_admin` through the Tenant Management workspace and a dedicated router. Provisioning is transactional and creates the tenant, first administrator, initial roles, and audit event together. Tenant suspension and plan changes require a reason and create audit evidence. Tenant identity is a database key and server-side scope, not merely a URL or subdomain convention.

## Regression evidence

The hardening release includes HTTP header and rate-limit tests as well as the existing cross-tenant, role-routing, immutability, compliance, and export test suites. The release gate is `pnpm check && pnpm test` and must be run again after any routing, middleware, deployment, or role-policy change.
