import { randomUUID } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { accounts, geofenceEvents, geofences, plannedVisits, repGeofenceStates, repLocationEvents, territories, users } from "../../drizzle/schema";
import { appendAuditEvent, getDb } from "../db";
import type { TenantScope } from "../security/access";

export const IDLE_DISTANCE_METERS = 25;
export const IDLE_WINDOW_SECONDS = 300;
const radians = (n: number) => n * Math.PI / 180;
export const haversineMeters = (from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) => {
  const dLat = radians(to.latitude - from.latitude); const dLon = radians(to.longitude - from.longitude); const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(dLon / 2) ** 2; return 6371000 * 2 * Math.asin(Math.sqrt(a));
};
export const isIdlePair = (distanceMeters: number, elapsedSeconds: number) => distanceMeters <= IDLE_DISTANCE_METERS && elapsedSeconds >= IDLE_WINDOW_SECONDS;
export const geofenceTransition = (geofenceType: "territory" | "hcp_stop", inside: boolean) => geofenceType === "territory" ? (inside ? "enter" : "exit") : (inside ? "near" : "far");

export async function evaluateLocationGeofences(scope: TenantScope, location: { id: string; shiftId: string; latitude: number; longitude: number; capturedAt: Date }) {
  const db = await getDb(); if (!db) return [];
  const [rep] = await db.select({ territory: users.territory }).from(users).where(eq(users.id, scope.userId)).limit(1);
  const [assignedTerritory] = rep?.territory ? await db.select().from(territories).where(and(eq(territories.tenantId, scope.tenantId), eq(territories.code, rep.territory), eq(territories.status, "active"))).limit(1) : [];
  const fences = await db.select().from(geofences).where(and(eq(geofences.tenantId, scope.tenantId), eq(geofences.status, "active")));
  const plannedStops = await db.select({ plan: plannedVisits, account: accounts }).from(plannedVisits).innerJoin(accounts, eq(plannedVisits.accountId, accounts.id)).where(and(eq(plannedVisits.tenantId, scope.tenantId), eq(plannedVisits.repUserId, scope.userId), eq(plannedVisits.status, "planned")));
  for (const stop of plannedStops) {
    if (stop.account.latitude === null || stop.account.longitude === null || fences.some(fence => fence.accountId === stop.account.id)) continue;
    const id = randomUUID(); await db.insert(geofences).values({ id, tenantId: scope.tenantId, accountId: stop.account.id, name: `Planned HCP: ${stop.account.name}`, geofenceType: "hcp_stop", latitude: stop.account.latitude, longitude: stop.account.longitude, radiusMeters: 200, createdBy: scope.userId });
    fences.push({ id, tenantId: scope.tenantId, territoryId: null, accountId: stop.account.id, name: `Planned HCP: ${stop.account.name}`, geofenceType: "hcp_stop", latitude: stop.account.latitude, longitude: stop.account.longitude, radiusMeters: 200, status: "active", createdAt: new Date(), updatedAt: new Date(), createdBy: scope.userId });
  }
  const emitted: string[] = [];
  for (const fence of fences.filter(fence => !fence.territoryId || fence.territoryId === assignedTerritory?.id)) {
    const distanceMeters = Math.round(haversineMeters(location, { latitude: Number(fence.latitude), longitude: Number(fence.longitude) })); const inside = distanceMeters <= fence.radiusMeters;
    const [state] = await db.select().from(repGeofenceStates).where(and(eq(repGeofenceStates.tenantId, scope.tenantId), eq(repGeofenceStates.repUserId, scope.userId), eq(repGeofenceStates.geofenceId, fence.id))).limit(1);
    const changed = !state || Boolean(state.isInside) !== inside;
    if (changed) {
      const eventType = geofenceTransition(fence.geofenceType, inside); const eventId = randomUUID();
      await db.insert(geofenceEvents).values({ id: eventId, tenantId: scope.tenantId, repUserId: scope.userId, shiftId: location.shiftId, locationEventId: location.id, geofenceId: fence.id, eventType, distanceMeters, observedAt: location.capturedAt, createdBy: scope.userId });
      await appendAuditEvent({ tenantId: scope.tenantId, actorUserId: scope.userId, entityType: "geofence_event", entityId: eventId, eventType: `rep.geofence_${eventType}`, operation: "create", oldValue: state ? { isInside: Boolean(state.isInside) } : null, newValue: { fenceId: fence.id, inside, distanceMeters }, reason: "Location geofence evaluation" }); emitted.push(eventId);
    }
    await db.insert(repGeofenceStates).values({ id: state?.id ?? randomUUID(), tenantId: scope.tenantId, repUserId: scope.userId, geofenceId: fence.id, lastLocationEventId: location.id, isInside: inside ? 1 : 0, lastDistanceMeters: distanceMeters, lastObservedAt: location.capturedAt }).onDuplicateKeyUpdate({ set: { lastLocationEventId: location.id, isInside: inside ? 1 : 0, lastDistanceMeters: distanceMeters, lastObservedAt: location.capturedAt } });
  }
  const prior = (await db.select().from(repLocationEvents).where(and(eq(repLocationEvents.tenantId, scope.tenantId), eq(repLocationEvents.shiftId, location.shiftId))).orderBy(desc(repLocationEvents.capturedAt)).limit(2))[1];
  if (prior) { const distanceMeters = Math.round(haversineMeters(location, { latitude: Number(prior.latitude), longitude: Number(prior.longitude) })); const elapsedSeconds = Math.max(0, Math.floor((location.capturedAt.getTime() - prior.capturedAt.getTime()) / 1000)); const idle = isIdlePair(distanceMeters, elapsedSeconds); const [lastIdleEvent] = await db.select().from(geofenceEvents).where(and(eq(geofenceEvents.tenantId, scope.tenantId), eq(geofenceEvents.shiftId, location.shiftId))).orderBy(desc(geofenceEvents.observedAt)).limit(1); if (idle || lastIdleEvent?.eventType === "idle_started") { const eventType = idle ? "idle_started" : "idle_ended"; const eventId = randomUUID(); await db.insert(geofenceEvents).values({ id: eventId, tenantId: scope.tenantId, repUserId: scope.userId, shiftId: location.shiftId, locationEventId: location.id, eventType, distanceMeters, observedAt: location.capturedAt, createdBy: scope.userId }); await appendAuditEvent({ tenantId: scope.tenantId, actorUserId: scope.userId, entityType: "geofence_event", entityId: eventId, eventType: `rep.${eventType}`, operation: "create", oldValue: null, newValue: { distanceMeters, elapsedSeconds }, reason: "Active-shift idle detection" }); emitted.push(eventId); } }
  return emitted;
}
