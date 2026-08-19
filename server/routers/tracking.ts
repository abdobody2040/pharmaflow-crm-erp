import { randomUUID } from "crypto";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { geofenceEvents, geofences, repLocationEvents, repShifts, users } from "../../drizzle/schema";
import { appendAuditEvent, getDb } from "../db";
import { haversineMeters } from "../services/geofence";
import { resolveTenantScope } from "../security/access";
import { router, tenantRoleProcedure } from "../_core/trpc";

const managerRoles = ["admin", "manager"] as const;
const readRoles = ["admin", "manager", "exec"] as const;
export const tripMileageMeters = (points: Array<{ latitude: unknown; longitude: unknown }>) => points.reduce((total, point, index) => index === 0 ? 0 : total + haversineMeters({ latitude: Number(points[index - 1]!.latitude), longitude: Number(points[index - 1]!.longitude) }, { latitude: Number(point.latitude), longitude: Number(point.longitude) }), 0);
export const trackingRouter = router({
  geofences: router({
    list: tenantRoleProcedure(readRoles).query(async ({ ctx }) => { const scope = resolveTenantScope(ctx.user!); const db = await getDb(); if (!db) return []; return db.select().from(geofences).where(eq(geofences.tenantId, scope.tenantId)).orderBy(desc(geofences.updatedAt)); }),
    create: tenantRoleProcedure(managerRoles).input(z.object({ name: z.string().min(2).max(255), geofenceType: z.enum(["territory", "hcp_stop"]), latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), radiusMeters: z.number().int().min(25).max(100000), territoryId: z.string().uuid().optional(), accountId: z.string().uuid().optional() })).mutation(async ({ ctx, input }) => { const scope = resolveTenantScope(ctx.user!); const db = await getDb(); if (!db) throw new Error("Database unavailable"); const id = randomUUID(); await db.insert(geofences).values({ id, tenantId: scope.tenantId, ...input, latitude: String(input.latitude), longitude: String(input.longitude), createdBy: scope.userId }); await appendAuditEvent({ tenantId: scope.tenantId, actorUserId: scope.userId, entityType: "geofence", entityId: id, eventType: "geofence.created", operation: "create", oldValue: null, newValue: input, reason: "Geofence configuration" }); return { id }; }),
  }),
  live: tenantRoleProcedure(readRoles).query(async ({ ctx }) => { const scope = resolveTenantScope(ctx.user!); const db = await getDb(); if (!db) return []; return db.select({ location: repLocationEvents, rep: users }).from(repLocationEvents).innerJoin(users, eq(repLocationEvents.repUserId, users.id)).where(eq(repLocationEvents.tenantId, scope.tenantId)).orderBy(desc(repLocationEvents.capturedAt)).limit(250); }),
  alerts: tenantRoleProcedure(readRoles).query(async ({ ctx }) => { const scope = resolveTenantScope(ctx.user!); const db = await getDb(); if (!db) return []; return db.select().from(geofenceEvents).where(eq(geofenceEvents.tenantId, scope.tenantId)).orderBy(desc(geofenceEvents.observedAt)).limit(150); }),
  trip: tenantRoleProcedure(readRoles).input(z.object({ shiftId: z.string().uuid() })).query(async ({ ctx, input }) => { const scope = resolveTenantScope(ctx.user!); const db = await getDb(); if (!db) return { points: [], mileageMeters: 0, idleEvents: [] }; const [shift] = await db.select().from(repShifts).where(and(eq(repShifts.id, input.shiftId), eq(repShifts.tenantId, scope.tenantId))).limit(1); if (!shift || shift.tenantId !== scope.tenantId) throw new Error("Shift not found in active tenant"); const points = await db.select().from(repLocationEvents).where(and(eq(repLocationEvents.tenantId, scope.tenantId), eq(repLocationEvents.shiftId, input.shiftId))).orderBy(asc(repLocationEvents.capturedAt)); const mileageMeters = tripMileageMeters(points); const idleEvents = await db.select().from(geofenceEvents).where(and(eq(geofenceEvents.tenantId, scope.tenantId), eq(geofenceEvents.shiftId, input.shiftId), eq(geofenceEvents.eventType, "idle_started"))).orderBy(asc(geofenceEvents.observedAt)); return { points, mileageMeters: Math.round(mileageMeters), idleEvents }; }),
});
