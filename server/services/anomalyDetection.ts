import { and, eq, gte, inArray } from "drizzle-orm";
import { anomalyAlerts, anomalyMonitorConfigs, expenseReports, geofenceEvents, geofences, sampleTransactions } from "../../drizzle/schema";
import { appendAuditEvent, getDb } from "../db";

export type AnomalyCandidate = { anomalyType: "sample_distribution" | "expense_outlier" | "territory_exception"; severity: "medium" | "high" | "critical"; subjectType: string; subjectId: string; dedupeKey: string; evidence: Record<string, unknown> };
const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000);
const period = () => new Date().toISOString().slice(0, 10);
const median = (values: number[]) => { const sorted = [...values].sort((a, b) => a - b); if (!sorted.length) return 0; const middle = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2; };

export function detectSampleOutliers(items: Array<{ repUserId: number | null; productName: string; quantity: number }>, multiplier: number): AnomalyCandidate[] {
  const productRep = new Map<string, Map<number, number>>(); for (const item of items) { if (!item.repUserId) continue; const reps = productRep.get(item.productName) ?? new Map<number, number>(); reps.set(item.repUserId, (reps.get(item.repUserId) ?? 0) + item.quantity); productRep.set(item.productName, reps); }
  const alerts: AnomalyCandidate[] = []; for (const [product, reps] of Array.from(productRep.entries())) { const baseline = median(Array.from(reps.values())); if (baseline <= 0 || reps.size < 2) continue; for (const [repUserId, quantity] of Array.from(reps.entries())) if (quantity > baseline * multiplier) alerts.push({ anomalyType: "sample_distribution", severity: quantity > baseline * multiplier * 2 ? "critical" : "high", subjectType: "user", subjectId: String(repUserId), dedupeKey: `sample:${repUserId}:${product}:${period()}`, evidence: { product, quantity, peerMedian: baseline, multiplier } }); }
  return alerts;
}

export function detectExpenseOutliers(items: Array<{ id: string; employeeUserId: number; category: string; amount: number }>, multiplier: number): AnomalyCandidate[] {
  const categoryValues = new Map<string, number[]>(); for (const item of items) categoryValues.set(item.category, [...(categoryValues.get(item.category) ?? []), item.amount]); const alerts: AnomalyCandidate[] = [];
  for (const item of items) { const baseline = median(categoryValues.get(item.category) ?? []); if (baseline > 0 && item.amount > baseline * multiplier) alerts.push({ anomalyType: "expense_outlier", severity: item.amount > baseline * multiplier * 2 ? "critical" : "high", subjectType: "expense_report", subjectId: item.id, dedupeKey: `expense:${item.id}`, evidence: { category: item.category, amount: item.amount, categoryMedian: baseline, multiplier } }); }
  return alerts;
}

export async function runDailyAnomalyDetection(config: typeof anomalyMonitorConfigs.$inferSelect) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable"); const [samples, expenses, events, territoryFences] = await Promise.all([
    db.select().from(sampleTransactions).where(and(eq(sampleTransactions.tenantId, config.tenantId), eq(sampleTransactions.transactionType, "handoff"), gte(sampleTransactions.occurredAt, daysAgo(30)))),
    db.select().from(expenseReports).where(and(eq(expenseReports.tenantId, config.tenantId), inArray(expenseReports.status, ["submitted", "approved", "reimbursed"]))),
    db.select().from(geofenceEvents).where(and(eq(geofenceEvents.tenantId, config.tenantId), inArray(geofenceEvents.eventType, ["far", "exit"]), gte(geofenceEvents.observedAt, daysAgo(config.territoryLookbackHours / 24)))),
    db.select().from(geofences).where(and(eq(geofences.tenantId, config.tenantId), eq(geofences.geofenceType, "territory"))),
  ]);
  const territoryIds = new Set(territoryFences.map(item => item.id)); const candidates = [
    ...detectSampleOutliers(samples.map(item => ({ repUserId: item.fromUserId, productName: item.productName, quantity: Number(item.quantity) })), config.sampleMultiplier),
    ...detectExpenseOutliers(expenses.map(item => ({ id: item.id, employeeUserId: item.employeeUserId, category: item.category, amount: Number(item.amount) })), config.expenseMultiplier),
    ...events.filter(item => item.geofenceId && territoryIds.has(item.geofenceId)).map(item => ({ anomalyType: "territory_exception" as const, severity: item.eventType === "far" ? "high" as const : "medium" as const, subjectType: "location_event", subjectId: item.locationEventId, dedupeKey: `territory:${item.locationEventId}`, evidence: { repUserId: item.repUserId, geofenceId: item.geofenceId, eventType: item.eventType, distanceMeters: item.distanceMeters, observedAt: item.observedAt.toISOString() } })),
  ];
  let created = 0; for (const candidate of candidates) { const [existing] = await db.select({ id: anomalyAlerts.id }).from(anomalyAlerts).where(and(eq(anomalyAlerts.tenantId, config.tenantId), eq(anomalyAlerts.dedupeKey, candidate.dedupeKey))).limit(1); if (existing) continue; await db.insert(anomalyAlerts).values({ id: crypto.randomUUID(), tenantId: config.tenantId, monitorConfigId: config.id, ...candidate, detectedAt: new Date(), createdBy: config.createdBy }); created++; }
  await db.update(anomalyMonitorConfigs).set({ lastRunAt: new Date() }).where(and(eq(anomalyMonitorConfigs.id, config.id), eq(anomalyMonitorConfigs.tenantId, config.tenantId)));
  await appendAuditEvent({ tenantId: config.tenantId, actorUserId: config.createdBy, entityType: "anomaly_monitor", entityId: config.id, eventType: "anomaly.daily_scan_completed", operation: "create", oldValue: null, newValue: { candidates: candidates.length, created }, reason: "Daily deterministic anomaly monitor completed" }); return { candidates: candidates.length, created };
}
