import type { Request, Response } from "express";
import { and, eq } from "drizzle-orm";
import { anomalyMonitorConfigs } from "../../drizzle/schema";
import { getDb } from "../db";
import { sdk } from "../_core/sdk";
import { runDailyAnomalyDetection } from "../services/anomalyDetection";
export async function dailyAnomalyMonitor(req: Request, res: Response) { try { const user = await sdk.authenticateRequest(req as any); if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" }); const db = await getDb(); if (!db) throw new Error("Database unavailable"); const [config] = await db.select().from(anomalyMonitorConfigs).where(and(eq(anomalyMonitorConfigs.scheduleCronTaskUid, user.taskUid), eq(anomalyMonitorConfigs.enabled, 1))).limit(1); if (!config) return res.json({ ok: true, skipped: "orphan_or_disabled" }); return res.json({ ok: true, ...(await runDailyAnomalyDetection(config)) }); } catch (error) { return res.status(500).json({ error: error instanceof Error ? error.message : String(error), timestamp: new Date().toISOString() }); } }
