import { randomUUID } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  accounts,
  plannedVisits,
  repLocationConsents,
  repLocationEvents,
  repShifts,
  repSyncOperations,
  sampleTransactions,
} from "../../drizzle/schema";
import { appendAuditEvent, createVisit, getDb } from "../db";
import { resolveTenantScope } from "../security/access";
import { evaluateLocationGeofences } from "../services/geofence";
import { autoMarkAttendance } from "../services/attendance";
import { router, tenantRoleProcedure } from "../_core/trpc";

const repRoles = ["admin", "manager", "rep"] as const;
export const cadenceFor = (nearPlannedStop: boolean) =>
  nearPlannedStop ? 15 : 60;

async function appliedSync(
  scope: ReturnType<typeof resolveTenantScope>,
  clientMutationId: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return (
    await db
      .select()
      .from(repSyncOperations)
      .where(
        and(
          eq(repSyncOperations.tenantId, scope.tenantId),
          eq(repSyncOperations.repUserId, scope.userId),
          eq(repSyncOperations.clientMutationId, clientMutationId)
        )
      )
      .limit(1)
  )[0];
}

async function recordSync(
  scope: ReturnType<typeof resolveTenantScope>,
  clientMutationId: string,
  operationType: "visit" | "sample" | "location",
  operationPayload: unknown
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db
    .insert(repSyncOperations)
    .values({
      id: randomUUID(),
      tenantId: scope.tenantId,
      repUserId: scope.userId,
      clientMutationId,
      operationType,
      operationPayload,
      status: "applied",
      createdBy: scope.userId,
    });
}

export const repRouter = router({
  dailyPlan: tenantRoleProcedure(repRoles).query(async ({ ctx }) => {
    const scope = resolveTenantScope(ctx.user!);
    const db = await getDb();
    if (!db) return [];
    return db
      .select({ plan: plannedVisits, account: accounts })
      .from(plannedVisits)
      .leftJoin(accounts, eq(plannedVisits.accountId, accounts.id))
      .where(
        and(
          eq(plannedVisits.tenantId, scope.tenantId),
          eq(plannedVisits.repUserId, scope.userId),
          eq(plannedVisits.status, "planned")
        )
      )
      .orderBy(plannedVisits.plannedStartAt)
      .limit(100);
  }),
  hcpLookup: tenantRoleProcedure(repRoles)
    .input(
      z.object({ query: z.string().trim().max(255).optional() }).optional()
    )
    .query(async ({ ctx }) => {
      const scope = resolveTenantScope(ctx.user!);
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(accounts)
        .where(
          and(
            eq(accounts.tenantId, scope.tenantId),
            eq(accounts.status, "active")
          )
        )
        .orderBy(desc(accounts.updatedAt))
        .limit(100);
    }),
  shift: router({
    current: tenantRoleProcedure(repRoles).query(async ({ ctx }) => {
      const scope = resolveTenantScope(ctx.user!);
      const db = await getDb();
      if (!db) return null;
      return (
        (
          await db
            .select()
            .from(repShifts)
            .where(
              and(
                eq(repShifts.tenantId, scope.tenantId),
                eq(repShifts.repUserId, scope.userId),
                eq(repShifts.status, "active")
              )
            )
            .limit(1)
        )[0] ?? null
      );
    }),
    consent: tenantRoleProcedure(repRoles)
      .input(
        z.object({
          policyVersion: z.string().min(1).max(64),
          retentionDays: z.number().int().min(1).max(3650),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const scope = resolveTenantScope(ctx.user!);
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        const id = randomUUID();
        await db
          .insert(repLocationConsents)
          .values({
            id,
            tenantId: scope.tenantId,
            repUserId: scope.userId,
            ...input,
            status: "consented",
            consentedAt: new Date(),
            createdBy: scope.userId,
          });
        await appendAuditEvent({
          tenantId: scope.tenantId,
          actorUserId: scope.userId,
          entityType: "rep_location_consent",
          entityId: id,
          eventType: "rep.location_consent_recorded",
          operation: "create",
          oldValue: null,
          newValue: input,
          reason: "Rep explicitly consented to active-shift location tracking",
        });
        return { id };
      }),
    start: tenantRoleProcedure(repRoles)
      .input(z.object({ consentId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const scope = resolveTenantScope(ctx.user!);
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        const [consent] = await db
          .select()
          .from(repLocationConsents)
          .where(
            and(
              eq(repLocationConsents.id, input.consentId),
              eq(repLocationConsents.tenantId, scope.tenantId),
              eq(repLocationConsents.repUserId, scope.userId),
              eq(repLocationConsents.status, "consented")
            )
          )
          .limit(1);
        if (!consent)
          throw new Error(
            "An active tracking consent is required to start a shift"
          );
        const existing = (
          await db
            .select()
            .from(repShifts)
            .where(
              and(
                eq(repShifts.tenantId, scope.tenantId),
                eq(repShifts.repUserId, scope.userId),
                eq(repShifts.status, "active")
              )
            )
            .limit(1)
        )[0];
        if (existing) return { id: existing.id, alreadyActive: true };
        const id = randomUUID();
        await db
          .insert(repShifts)
          .values({
            id,
            tenantId: scope.tenantId,
            repUserId: scope.userId,
            consentId: input.consentId,
            startedAt: new Date(),
            status: "active",
            createdBy: scope.userId,
          });
        await appendAuditEvent({
          tenantId: scope.tenantId,
          actorUserId: scope.userId,
          entityType: "rep_shift",
          entityId: id,
          eventType: "rep.shift_started",
          operation: "create",
          oldValue: null,
          newValue: { consentId: input.consentId },
          reason: "Rep explicitly started a tracked shift",
        });
        return { id, alreadyActive: false };
      }),
    stop: tenantRoleProcedure(repRoles).mutation(async ({ ctx }) => {
      const scope = resolveTenantScope(ctx.user!);
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const [shift] = await db
        .select()
        .from(repShifts)
        .where(
          and(
            eq(repShifts.tenantId, scope.tenantId),
            eq(repShifts.repUserId, scope.userId),
            eq(repShifts.status, "active")
          )
        )
        .limit(1);
      if (!shift) return { stopped: false };
      await db
        .update(repShifts)
        .set({ status: "ended", endedAt: new Date() })
        .where(
          and(
            eq(repShifts.id, shift.id),
            eq(repShifts.tenantId, scope.tenantId)
          )
        );
      await appendAuditEvent({
        tenantId: scope.tenantId,
        actorUserId: scope.userId,
        entityType: "rep_shift",
        entityId: shift.id,
        eventType: "rep.shift_stopped",
        operation: "status_change",
        oldValue: { status: "active" },
        newValue: { status: "ended" },
        reason: "Rep explicitly stopped location tracking",
      });
      return { stopped: true };
    }),
  }),
  location: tenantRoleProcedure(repRoles)
    .input(
      z.object({
        clientMutationId: z.string().uuid(),
        shiftId: z.string().uuid(),
        latitude: z.string().regex(/^-?\d{1,2}(\.\d+)?$/),
        longitude: z.string().regex(/^-?\d{1,3}(\.\d+)?$/),
        accuracyMeters: z.number().int().nonnegative().optional(),
        nearPlannedStop: z.boolean(),
        capturedAt: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const scope = resolveTenantScope(ctx.user!);
      const prior = await appliedSync(scope, input.clientMutationId);
      if (prior) return { applied: false, idempotent: true };
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const [shift] = await db
        .select()
        .from(repShifts)
        .where(
          and(
            eq(repShifts.id, input.shiftId),
            eq(repShifts.tenantId, scope.tenantId),
            eq(repShifts.repUserId, scope.userId),
            eq(repShifts.status, "active")
          )
        )
        .limit(1);
      if (!shift || shift.tenantId !== scope.tenantId)
        throw new Error(
          "Location capture is permitted only during the active shift"
        );
      const cadenceSeconds = cadenceFor(input.nearPlannedStop);
      const id = randomUUID();
      await db
        .insert(repLocationEvents)
        .values({
          id,
          tenantId: scope.tenantId,
          shiftId: input.shiftId,
          repUserId: scope.userId,
          latitude: input.latitude,
          longitude: input.longitude,
          accuracyMeters: input.accuracyMeters ?? null,
          cadenceSeconds,
          nearPlannedStop: input.nearPlannedStop ? 1 : 0,
          capturedAt: input.capturedAt,
          createdBy: scope.userId,
        });
      const geofenceEventIds = await evaluateLocationGeofences(scope, {
        id,
        shiftId: input.shiftId,
        latitude: Number(input.latitude),
        longitude: Number(input.longitude),
        capturedAt: input.capturedAt,
      });
      const attendance = await autoMarkAttendance(scope, {
        id,
        latitude: Number(input.latitude),
        longitude: Number(input.longitude),
        capturedAt: input.capturedAt,
      });
      await recordSync(scope, input.clientMutationId, "location", {
        eventId: id,
        cadenceSeconds,
        geofenceEventIds,
        attendanceId: attendance?.id ?? null,
      });
      await appendAuditEvent({
        tenantId: scope.tenantId,
        actorUserId: scope.userId,
        entityType: "rep_location_event",
        entityId: id,
        eventType: "rep.location_recorded",
        operation: "create",
        oldValue: null,
        newValue: {
          shiftId: input.shiftId,
          cadenceSeconds,
          nearPlannedStop: input.nearPlannedStop,
          geofenceEventIds,
          attendanceId: attendance?.id ?? null,
        },
        reason: "Active-shift location telemetry",
      });
      return {
        applied: true,
        idempotent: false,
        id,
        cadenceSeconds,
        geofenceEventIds,
        attendance,
      };
    }),
  syncVisit: tenantRoleProcedure(repRoles)
    .input(
      z.object({
        clientMutationId: z.string().uuid(),
        accountName: z.string().min(2),
        accountId: z.string().uuid().optional(),
        objective: z.string().min(2),
        productsDiscussed: z.array(z.string().min(1)).min(1),
        sampleTransactionIds: z.array(z.string().uuid()).optional(),
        nextSteps: z.string().optional(),
        occurredAt: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const scope = resolveTenantScope(ctx.user!);
      const prior = await appliedSync(scope, input.clientMutationId);
      if (prior) return { applied: false, idempotent: true };
      const visit = await createVisit(scope, input);
      await recordSync(scope, input.clientMutationId, "visit", {
        visitId: visit.id,
      });
      return { applied: true, idempotent: false, ...visit };
    }),
  sampleCheckout: tenantRoleProcedure(repRoles)
    .input(
      z.object({
        clientMutationId: z.string().uuid(),
        productName: z.string().min(1).max(255),
        lotNumber: z.string().min(1).max(128),
        expiryDate: z.date(),
        quantity: z.string().min(1).max(16),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const scope = resolveTenantScope(ctx.user!);
      const prior = await appliedSync(scope, input.clientMutationId);
      if (prior) return { applied: false, idempotent: true };
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const id = randomUUID();
      await db
        .insert(sampleTransactions)
        .values({
          id,
          tenantId: scope.tenantId,
          transactionType: "allocation",
          productName: input.productName,
          lotNumber: input.lotNumber,
          expiryDate: input.expiryDate,
          quantity: input.quantity,
          toUserId: scope.userId,
          occurredAt: new Date(),
          status: "recorded",
          createdBy: scope.userId,
        });
      await recordSync(scope, input.clientMutationId, "sample", {
        sampleTransactionId: id,
      });
      await appendAuditEvent({
        tenantId: scope.tenantId,
        actorUserId: scope.userId,
        entityType: "sample_transaction",
        entityId: id,
        eventType: "rep.sample_checked_out",
        operation: "create",
        oldValue: null,
        newValue: {
          productName: input.productName,
          lotNumber: input.lotNumber,
          quantity: input.quantity,
        },
        reason: "Rep sample inventory check-out",
      });
      return { applied: true, idempotent: false, id };
    }),
  sampleInventory: tenantRoleProcedure(repRoles).query(async ({ ctx }) => {
    const scope = resolveTenantScope(ctx.user!);
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(sampleTransactions)
      .where(
        and(
          eq(sampleTransactions.tenantId, scope.tenantId),
          eq(sampleTransactions.toUserId, scope.userId)
        )
      )
      .orderBy(desc(sampleTransactions.occurredAt))
      .limit(200);
  }),
});
