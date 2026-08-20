# Staging-Only Performance Benchmark Runbook

This harness does not insert, alter, or delete data. It measures actual MySQL query timings on an already approved tenant dataset and writes `benchmark-results.json`. It refuses a database name that does not contain `staging`, `benchmark`, `perf`, or `test`.

> **Deferred operational proof:** No latency number has been produced in the current sandbox because no approved non-production dataset is available. Do not replace this statement with an estimate.

## Preparation

Prepare a non-production MySQL 8.4 database that has a single benchmark tenant with agreed realistic volumes. Record host specifications, MySQL configuration, app image version, table/index definitions, cache warm-up procedure, and the immutable tenant identifier. Ensure the database includes GPS points, planned/completed visits, and anomaly records; the harness measures the data it finds and never fabricates a volume.

## Execution

Run the following only after the database owner confirms the target is non-production:

```bash
BENCHMARK_DATABASE_URL='mysql://…/pharmaflow_benchmark' \
BENCHMARK_TENANT_ID='tenant-uuid' \
BENCHMARK_CONFIRM_NONPROD='I_UNDERSTAND_NONPROD_ONLY' \
node scripts/benchmark.mjs
```

Attach the resulting `benchmark-results.json`, MySQL `EXPLAIN ANALYZE` output for any query with an unacceptable p95, server CPU/memory/disk metrics, and the index decision. Only add an index after an observed slow path and a before/after re-measurement. The existing schema already uses tenant-first indexes for GPS history, planned visits, visit logs, anomaly alerts, and the new MVP modules.
