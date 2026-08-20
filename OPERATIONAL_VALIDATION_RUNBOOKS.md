# Deferred Operational Validation Runbooks

## Status and safety boundary

These runbooks are **ready for execution** when an approved non-production MySQL 8.4 and staging URL exist. They have not been executed in the current environment. Record actual commands, timestamps, operator identity, target name, evidence files, deviations, and approval signatures when executing them. Never run them against production customer records.

## OQ-NTP-01 — Trusted server time

| Field | Required value |
|---|---|
| Target | Approved VPS or staging host only |
| Precondition | Host uses chrony or systemd-timesyncd and outbound NTP is permitted by policy |
| Acceptance | System is synchronized; selected source, offset, and capture time meet the customer-approved drift threshold |

Run `timedatectl status` and, where installed, `chronyc tracking` and `chronyc sources -v`. Capture output before and after an application audit/signature action. Compare the server-generated audit `createdAt`, signature timestamps, and host UTC time; do not use client-device time as evidence. If unsynchronized or above the approved drift threshold, open a deviation and do not rely on affected timestamp evidence until resolved.

## OQ-DBR-01 — Encrypted MySQL backup and restore

| Field | Required value |
|---|---|
| Target | Dedicated non-production MySQL 8.4 database |
| Precondition | Empty restore database, approved encrypted backup location, tested key access, and database name containing `staging` or `benchmark` |
| Acceptance | Restore completes, migration version/schema match, row-count and sample checksum match, and regulated mutation guards remain present |

1. Record database name, MySQL version, free disk, application image version, and operator.
2. Create a consistent dump with `mysqldump --single-transaction --routines --triggers --set-gtid-purged=OFF` using a least-privilege backup account; encrypt it with the organization-approved mechanism.
3. Calculate and retain a SHA-256 checksum of the encrypted dump.
4. Restore into an empty, separately named staging database. Do not overwrite a production or shared QA database.
5. Run schema migration validation, table row counts, and sampled record checks. Run `SHOW TRIGGERS` and perform controlled negative `UPDATE`/`DELETE` checks only on disposable evidence rows.
6. Record restore duration, checksum, exceptions, evidence paths, reviewer, and disposition.

## OQ-DAST-01 — Authenticated API dynamic scan

| Field | Required value |
|---|---|
| Target | Approved staging URL only; never production |
| Precondition | Written scan scope, maintenance window, disposable tenant, scanner approved by security owner, rate-limit contact |
| Acceptance | Scan report classified; confirmed findings have owner/severity/remediation; false positives have rationale |

Use an approved scanner such as OWASP ZAP or Burp Suite. Configure authenticated sessions with **disposable** users for `rep`, `manager`, `admin`, `hr`, `exec`, and `super_admin`; do not place real user passwords in scan scripts. Include `/api/trpc` mutation/query coverage, malformed Zod inputs, authorization-object tests using another tenant’s identifiers, response headers, and rate-limit behavior. Constrain concurrency to the staging policy and retain scanner version/config/report. Re-test every confirmed finding after remediation.

## OQ-RL-01 — Distributed rate-limit test

| Field | Required value |
|---|---|
| Target | Two or more staging application instances behind a test load balancer |
| Precondition | Shared Redis-compatible rate-limit store enabled and isolated load-generator identity |
| Acceptance | A client cannot bypass a configured aggregate limit by alternating instances; valid requests recover after the configured window |

The present release uses an in-memory limiter intentionally suitable for a single VPS process. Before horizontal scale, replace it with a shared Redis-compatible implementation. Execute a round-robin load test across at least two instances from one source IP, collect instance identifiers and `RateLimit-*` response headers, verify an aggregate `429`, then confirm recovery after the window. Include an authenticated endpoint and an unauthenticated/expensive endpoint in scope.

## Manual code-review record

The current code review confirms tenant-first composite indexes on high-frequency GPS, visit, BI, audit, campaign, and new MVP tables; scoped query predicates in the feature routers; Zod bounded inputs; no raw user-authored SQL execution path; allow-listed analytics plans; and per-process plus Nginx API limits. Review again after every new router, raw query, report export, or index change. The outstanding production proof is load-plan execution with `EXPLAIN ANALYZE`/MySQL query evidence against the dedicated staging dataset.
