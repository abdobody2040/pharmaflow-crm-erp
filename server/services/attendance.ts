import { randomUUID } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { attendanceRecords, geofences } from "../../drizzle/schema";
import { appendAuditEvent, getDb } from "../db";
import type { TenantScope } from "../security/access";
import { decideAttendance } from "./hrWorkflow";

export async function autoMarkAttendance(scope: TenantScope, location: { id: string; latitude: number; longitude: number; capturedAt: Date }) {
  try {
    const db = await getDb();
    if (!db) return null;
    const startOfDay = new Date(location.capturedAt);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const latest = await db.select().from(attendanceRecords).where(and(eq(attendanceRecords.tenantId, scope.tenantId), eq(attendanceRecords.userId, scope.userId))).orderBy(desc(attendanceRecords.createdAt)).limit(1);
    if (latest[0]?.eventType === "check_in" && latest[0].attendanceDate.toISOString().slice(0, 10) === startOfDay.toISOString().slice(0, 10)) return null;
    const fences = await db.select().from(geofences).where(and(eq(geofences.tenantId, scope.tenantId), eq(geofences.status, "active")));
    const decision = decideAttendance({ latitude: location.latitude, longitude: location.longitude }, fences);
    const id = randomUUID();
    await db.insert(attendanceRecords).values({ id, tenantId: scope.tenantId, userId: scope.userId, locationEventId: location.id, geofenceId: decision.geofenceId, attendanceDate: startOfDay, eventType: decision.eligible ? "check_in" : "outside_geofence", latitude: String(location.latitude), longitude: String(location.longitude), distanceMeters: decision.distanceMeters, createdBy: scope.userId });
    await appendAuditEvent({ tenantId: scope.tenantId, actorUserId: scope.userId, entityType: "attendance_record", entityId: id, eventType: decision.eligible ? "attendance.auto_check_in" : "attendance.auto_outside_geofence", operation: "create", oldValue: null, newValue: { locationEventId: location.id, geofenceId: decision.geofenceId, distanceMeters: decision.distanceMeters }, reason: "Automatic active-shift GPS attendance evaluation" });
    return { id, eligible: decision.eligible, distanceMeters: decision.distanceMeters };
  } catch (error) {
    console.warn("[Attendance] Automatic attendance evaluation was skipped", error);
    return null;
  }
}
