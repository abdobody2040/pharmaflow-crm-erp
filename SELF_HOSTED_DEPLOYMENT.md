# PharmaFlow Self-Hosted Deployment

This repository includes a **three-service Docker Compose stack**: the Node.js application, MySQL 8.4, and an Nginx reverse proxy. The services share an isolated Docker network, and only Nginx publishes a host port. The database is therefore not exposed directly to the internet.

| Service | Responsibility | Persistent state |
|---|---|---|
| `app` | React build, Express/tRPC API, JWT validation, tenant-scoped authorization | None; designed to be replaced safely |
| `mysql` | Authoritative transactional and compliance data | Named `mysql_data` volume |
| `nginx` | Reverse proxy, basic API rate limiting, response security headers | Configuration from a read-only template |

## First Deployment

Copy the repository to the VPS, then create the runtime environment file with `cp deploy/env.template .env`. Replace every placeholder with strong, unique values. In particular, generate a random `JWT_SECRET` with at least 32 characters, and use separate long random credentials for the application database user and MySQL root account. Passwords used in `DATABASE_URL` must be URL-safe or percent-encoded.

Start the environment with `docker compose up -d --build`. Once MySQL is healthy, apply the reviewed Drizzle migrations from the application container using `docker compose exec app pnpm drizzle-kit migrate`. The included migration creates the tenant, workforce, audit, visit, sample, and electronic-signature tables. It also creates MySQL triggers that reject `UPDATE` and `DELETE` statements against immutable compliance evidence.

> The managed development database used during app construction is TiDB-compatible and does not support MySQL triggers. The production Compose stack uses **MySQL 8.4**, where the committed migration installs the append-only trigger guards. Application procedures enforce the same restriction in all environments by exposing create-only compliance operations.

## TLS and VPS Hardening

The supplied Nginx configuration intentionally listens on HTTP only, allowing a VPS operator to choose their organization’s certificate-management approach. Before production use, terminate TLS in Nginx or a trusted network edge, redirect HTTP to HTTPS, and update `APP_URL` to the canonical `https://` URL. Restrict firewall ingress to ports 80 and 443, allow SSH only from approved administration networks, set host time synchronization to UTC/NTP, and perform encrypted, restore-tested backups of the `mysql_data` volume.

| Variable | Purpose | Example |
|---|---|---|
| `MYSQL_DATABASE` | Application database name | `pharmaflow` |
| `MYSQL_USER` / `MYSQL_PASSWORD` | Least-privilege application credentials | Environment-specific secret |
| `MYSQL_ROOT_PASSWORD` | Database administration credential | Separate long random secret |
| `JWT_SECRET` | HMAC key for local JWT issuance and validation | 48-byte random value |
| `APP_PORT` | Internal Node.js listener consumed by Nginx | `3000` |
| `PUBLIC_HTTP_PORT` | Host port published by Nginx | `80` |
| `APP_URL` | Canonical public application URL | `https://crm.example.com` |

## Compliance Architecture Boundary

The foundation applies strict application-side tenant predicates and role checks before tenant queries. Global super-admin operations use a separate procedure class and do not grant a tenant user cross-tenant access. Regulated visit logs, sample transactions, electronic signatures, and audit events have no update or deletion procedures. Corrections must use a newly inserted superseding or compensating record, while employee and tenant removal is represented by a lifecycle status transition plus a hash-linked audit event.

This architecture is designed to support later validation work, but **does not itself certify the deployment as compliant with 21 CFR Part 11**. Formal validation requires the customer’s controlled SOPs, risk assessment, access reviews, qualification evidence, deployment controls, training records, and retained validation documentation.
