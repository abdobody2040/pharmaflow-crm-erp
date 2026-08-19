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
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` | Optional customer-approved hosted-provider credentials | Leave each unused provider blank |
| `APP_PORT` | Internal Node.js listener consumed by Nginx | `3000` |
| `PUBLIC_HTTP_PORT` | Host port published by Nginx | `80` |
| `APP_URL` | Canonical public application URL | `https://crm.example.com` |
| `OSM_TILE_BACKEND` | Internal URL of the organization’s self-hosted OpenStreetMap tile service | `http://tiles:8080/` |
| `OSRM_BASE_URL` | Internal URL of the self-hosted OSRM service | `http://osrm:5000` |
| `OSRM_DATA_DIR` / `OSRM_DATASET` | Host directory and prepared regional OSRM dataset name | `./osrm-data` / `region-latest.osrm` |
| `AI_LOCAL_MODEL_BASE_URL` / `AI_LOCAL_MODEL_API_KEY` | Private OpenAI-compatible inference endpoint and access key | `http://local-ai:8000` / private secret |
| `AI_LOCAL_MODEL_MODEL` | Open-weight model served by the optional GPU profile | `Qwen/Qwen2.5-7B-Instruct` |

## Self-Hosted Map Tiles

The GPS Operations map intentionally requests tiles through the relative path `/tiles/{z}/{x}/{y}.png`. Nginx proxies that path to `OSM_TILE_BACKEND`, keeping the map free of public tile-provider dependencies. Operate a tile server inside the same private network or VPS environment, set `OSM_TILE_BACKEND` in `.env`, and verify that `https://<host>/tiles/0/0/0.png` returns a tile before enabling the production map. The tile service is infrastructure operated by the customer; it is not part of the application’s three-service Compose stack.

## Self-Hosted OSRM Routing

The Compose stack includes a private **OSRM** service used only by the application container. Before starting it, place a regional OpenStreetMap `.osm.pbf` extract into `OSRM_DATA_DIR` and prepare the dataset on the VPS using the same OSRM image: `osrm-extract -p /opt/car.lua /data/<region>.osm.pbf`, followed by `osrm-partition /data/<region>.osrm` and `osrm-customize /data/<region>.osrm`. Set `OSRM_DATASET` to the generated `.osrm` base filename, then start the stack. The API preserves priority groups (critical through low) and sends each group to OSRM’s trip service; it gracefully returns a Haversine fallback when the private routing service is unavailable.

## Private AI Inference

The `local-ai` Compose profile is an optional **GPU-only** OpenAI-compatible vLLM service. On a VPS with the NVIDIA Container Toolkit installed, set a private `AI_LOCAL_MODEL_API_KEY`, select an approved Llama/Qwen-class model in `AI_LOCAL_MODEL_MODEL`, then run `docker compose --profile local-ai up -d`. The service remains on the private Docker network and is not published through Nginx. AI tenant policies marked `sensitive` always select this local route, even when a hosted provider is configured as the tenant default. If the service is unavailable, the application blocks the sensitive request rather than falling back to a hosted model.

## MySQL Geospatial Architecture

This deployment remains **MySQL-only**. PostGIS is not used because it is a PostgreSQL extension and would require replacing or adding a second transactional database. GPS operations therefore persist tenant-scoped latitude and longitude evidence in MySQL and evaluate radius-based HCP and territory geofences with a server-side Haversine calculation. This produces distance, near/far, enter/exit, mileage, and idle-rule outcomes without introducing cross-database replication or weakening the existing tenant model. If future requirements need polygon topology, routing, or large-scale spatial joins, evaluate a separately governed PostgreSQL/PostGIS analytics service rather than altering regulated transactional records in place.

## Production MySQL 8.4 Validation

Before production go-live, run the migration from the application container with `docker compose exec app pnpm drizzle-kit migrate`. Then verify that MySQL registered the immutable-record guards using `docker compose exec mysql mysql -u root -p -e "USE <MYSQL_DATABASE>; SHOW TRIGGERS;"`. The result must include two triggers—one `BEFORE UPDATE` and one `BEFORE DELETE`—for each of `auditEvents`, `visitLogs`, `sampleTransactions`, and `electronicSignatures`.

Use a controlled non-production tenant record on the target MySQL instance to execute negative tests. First select one identifier from each affected table. Then issue an `UPDATE` and a `DELETE` against that identifier inside a disposable verification session. MySQL must reject every operation with the configured append-only message; roll back or discard the controlled data afterward. Record the migration output, trigger listing, rejection results, server timestamp/NTP status, image version, and operator identity in the deployment qualification evidence. Do not perform these negative tests against live regulated records.

## Compliance Architecture Boundary

The foundation applies strict application-side tenant predicates and role checks before tenant queries. Global super-admin operations use a separate procedure class and do not grant a tenant user cross-tenant access. Regulated visit logs, sample transactions, electronic signatures, and audit events have no update or deletion procedures. Corrections must use a newly inserted superseding or compensating record, while employee and tenant removal is represented by a lifecycle status transition plus a hash-linked audit event.

This architecture is designed to support later validation work, but **does not itself certify the deployment as compliant with 21 CFR Part 11**. Formal validation requires the customer’s controlled SOPs, risk assessment, access reviews, qualification evidence, deployment controls, training records, and retained validation documentation.
