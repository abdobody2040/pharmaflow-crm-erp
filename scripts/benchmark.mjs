import fs from "node:fs/promises";
import mysql from "mysql2/promise";

const url = process.env.BENCHMARK_DATABASE_URL;
const tenantId = process.env.BENCHMARK_TENANT_ID;
const confirmation = process.env.BENCHMARK_CONFIRM_NONPROD;
if (!url || !tenantId || confirmation !== "I_UNDERSTAND_NONPROD_ONLY") throw new Error("Set BENCHMARK_DATABASE_URL, BENCHMARK_TENANT_ID, and BENCHMARK_CONFIRM_NONPROD=I_UNDERSTAND_NONPROD_ONLY");
const databaseName = new URL(url).pathname.slice(1).toLowerCase();
if (!/(staging|benchmark|perf|test)/.test(databaseName)) throw new Error("Refusing to run against a database without a non-production marker in its name");

const pool = await mysql.createPool(url);
const timing = async (name, sql, params) => { const samples = []; for (let run = 0; run < 15; run += 1) { const started = performance.now(); const [rows] = await pool.query(sql, params); samples.push(performance.now() - started); if (run === 0) await new Promise(resolve => setTimeout(resolve, 20)); } const ordered = [...samples].sort((a, b) => a - b); return { name, samplesMs: samples.map(value => Number(value.toFixed(2))), p50Ms: Number(ordered[Math.floor(ordered.length * 0.5)].toFixed(2)), p95Ms: Number(ordered[Math.min(ordered.length - 1, Math.ceil(ordered.length * 0.95) - 1)].toFixed(2)) }; };

const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
const workload = [
  await timing("gps_latest_shift_points", "SELECT id, shiftId, latitude, longitude, capturedAt FROM repLocationEvents WHERE tenantId = ? AND capturedAt >= ? ORDER BY capturedAt DESC LIMIT 500", [tenantId, sevenDaysAgo]),
  await timing("gps_shift_history", "SELECT id, latitude, longitude, capturedAt FROM repLocationEvents WHERE tenantId = ? AND shiftId IN (SELECT id FROM repShifts WHERE tenantId = ? ORDER BY startedAt DESC LIMIT 20) ORDER BY capturedAt ASC LIMIT 5000", [tenantId, tenantId]),
  await timing("dashboard_visit_coverage", "SELECT status, COUNT(*) AS total FROM plannedVisits WHERE tenantId = ? GROUP BY status", [tenantId]),
  await timing("dashboard_visit_volume", "SELECT DATE(occurredAt) AS day, COUNT(*) AS total FROM visitLogs WHERE tenantId = ? AND occurredAt >= ? GROUP BY DATE(occurredAt) ORDER BY day", [tenantId, sevenDaysAgo]),
  await timing("dashboard_alerts", "SELECT severity, status, COUNT(*) AS total FROM anomalyAlerts WHERE tenantId = ? GROUP BY severity, status", [tenantId]),
];
const [counts] = await pool.query("SELECT (SELECT COUNT(*) FROM accounts WHERE tenantId = ?) AS accounts, (SELECT COUNT(*) FROM visitLogs WHERE tenantId = ?) AS visits, (SELECT COUNT(*) FROM repLocationEvents WHERE tenantId = ?) AS gpsPoints", [tenantId, tenantId, tenantId]);
const result = { generatedAt: new Date().toISOString(), database: databaseName, tenantId, datasetCounts: counts[0], workload };
await fs.writeFile("benchmark-results.json", `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
await pool.end();
