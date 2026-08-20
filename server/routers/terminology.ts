import { randomUUID } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { tenantTerminology } from "../../drizzle/schema";
import { appendAuditEvent, getDb } from "../db";
import { resolveTenantScope } from "../security/access";
import { router, tenantRoleProcedure } from "../_core/trpc";

const readers = ["admin", "manager", "rep", "hr", "exec"] as const;
const editors = ["admin", "manager"] as const;
const input = z.object({
  termKey: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9_.-]{1,119}$/),
  englishTerm: z.string().trim().min(1).max(255),
  arabicTerm: z.string().trim().min(1).max(255),
  context: z.string().trim().max(255).optional(),
});

export const terminologyRouter = router({
  list: tenantRoleProcedure(readers).query(async ({ ctx }) => {
    const scope = resolveTenantScope(ctx.user!); const db = await getDb();
    return db ? db.select().from(tenantTerminology).where(and(eq(tenantTerminology.tenantId, scope.tenantId), eq(tenantTerminology.status, "active"))).orderBy(desc(tenantTerminology.updatedAt)) : [];
  }),
  save: tenantRoleProcedure(editors).input(input).mutation(async ({ ctx, input }) => {
    const scope = resolveTenantScope(ctx.user!); const db = await getDb(); if (!db) throw new Error("Database unavailable");
    const [existing] = await db.select().from(tenantTerminology).where(and(eq(tenantTerminology.tenantId, scope.tenantId), eq(tenantTerminology.termKey, input.termKey))).limit(1);
    const id = existing?.id ?? randomUUID();
    if (existing) await db.update(tenantTerminology).set({ englishTerm: input.englishTerm, arabicTerm: input.arabicTerm, context: input.context ?? null, status: "active" }).where(and(eq(tenantTerminology.id, id), eq(tenantTerminology.tenantId, scope.tenantId)));
    else await db.insert(tenantTerminology).values({ id, tenantId: scope.tenantId, ...input, context: input.context ?? null, createdBy: scope.userId });
    await appendAuditEvent({ tenantId: scope.tenantId, actorUserId: scope.userId, entityType: "tenant_terminology", entityId: id, eventType: existing ? "terminology.updated" : "terminology.created", operation: existing ? "status_change" : "create", oldValue: existing ? { englishTerm: existing.englishTerm, arabicTerm: existing.arabicTerm, context: existing.context } : null, newValue: input, reason: existing ? "Tenant terminology updated" : "Tenant terminology created" });
    return { id };
  }),
  archive: tenantRoleProcedure(editors).input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const scope = resolveTenantScope(ctx.user!); const db = await getDb(); if (!db) throw new Error("Database unavailable");
    const [row] = await db.select().from(tenantTerminology).where(and(eq(tenantTerminology.tenantId, scope.tenantId), eq(tenantTerminology.id, input.id))).limit(1);
    if (!row) throw new Error("Terminology entry was not found in the active tenant");
    await db.update(tenantTerminology).set({ status: "archived" }).where(and(eq(tenantTerminology.id, input.id), eq(tenantTerminology.tenantId, scope.tenantId)));
    await appendAuditEvent({ tenantId: scope.tenantId, actorUserId: scope.userId, entityType: "tenant_terminology", entityId: input.id, eventType: "terminology.archived", operation: "status_change", oldValue: { status: row.status }, newValue: { status: "archived" }, reason: "Tenant terminology archived" });
    return { success: true };
  }),
});
