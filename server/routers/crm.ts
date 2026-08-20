import { randomUUID } from "crypto";
import { and, desc, eq, or } from "drizzle-orm";
import { z } from "zod";
import {
  accountAffiliations,
  accountCommercialSignals,
  accounts,
  contacts,
  cyclePlans,
  opportunities,
  plannedVisits,
  territories,
  visitLogs,
} from "../../drizzle/schema";
import { appendAuditEvent, getDb } from "../db";
import { resolveTenantScope } from "../security/access";
import { router, tenantRoleProcedure } from "../_core/trpc";

const managerRoles = ["admin", "manager"] as const;
const readableRoles = ["admin", "manager", "rep", "exec"] as const;
export function opportunityStatusForStage(
  stage:
    | "qualification"
    | "discovery"
    | "proposal"
    | "negotiation"
    | "won"
    | "lost"
) {
  return stage === "won" ? "won" : stage === "lost" ? "lost" : "open";
}
const accountInput = z.object({
  accountType: z.enum([
    "hcp",
    "pharmacy",
    "hospital",
    "distributor",
    "organization",
  ]),
  name: z.string().trim().min(2).max(255),
  specialty: z.string().trim().max(160).optional(),
  tier: z.enum(["a", "b", "c", "unclassified"]).default("unclassified"),
  territoryId: z.string().uuid().optional(),
  email: z.string().email().optional(),
  phone: z.string().max(64).optional(),
  address: z.string().max(3000).optional(),
});

async function accountForTenant(tenantId: string, accountId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [row] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.tenantId, tenantId), eq(accounts.id, accountId)))
    .limit(1);
  if (!row) throw new Error("CRM account not found in the active tenant");
  return row;
}

export const crmRouter = router({
  accounts: router({
    list: tenantRoleProcedure(readableRoles).query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(accounts)
        .where(eq(accounts.tenantId, resolveTenantScope(ctx.user!).tenantId))
        .orderBy(desc(accounts.updatedAt))
        .limit(200);
    }),
    create: tenantRoleProcedure(managerRoles)
      .input(accountInput)
      .mutation(async ({ ctx, input }) => {
        const scope = resolveTenantScope(ctx.user!);
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        const id = randomUUID();
        await db
          .insert(accounts)
          .values({
            id,
            tenantId: scope.tenantId,
            ...input,
            specialty: input.specialty ?? null,
            territoryId: input.territoryId ?? null,
            email: input.email ?? null,
            phone: input.phone ?? null,
            address: input.address ?? null,
            createdBy: scope.userId,
          });
        await appendAuditEvent({
          tenantId: scope.tenantId,
          actorUserId: scope.userId,
          entityType: "account",
          entityId: id,
          eventType: "account.created",
          operation: "create",
          oldValue: null,
          newValue: { name: input.name, accountType: input.accountType },
          reason: "CRM account created",
        });
        return { id };
      }),
  }),
  contacts: router({
    list: tenantRoleProcedure(readableRoles)
      .input(z.object({ accountId: z.string().uuid().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return [];
        const scope = resolveTenantScope(ctx.user!);
        return db
          .select()
          .from(contacts)
          .where(
            input?.accountId
              ? and(
                  eq(contacts.tenantId, scope.tenantId),
                  eq(contacts.accountId, input.accountId)
                )
              : eq(contacts.tenantId, scope.tenantId)
          )
          .orderBy(desc(contacts.updatedAt))
          .limit(200);
      }),
    create: tenantRoleProcedure(managerRoles)
      .input(
        z.object({
          accountId: z.string().uuid(),
          firstName: z.string().trim().min(1).max(128),
          lastName: z.string().trim().min(1).max(128),
          title: z.string().max(160).optional(),
          email: z.string().email().optional(),
          phone: z.string().max(64).optional(),
          preferredChannel: z
            .enum(["email", "phone", "in_person", "whatsapp", "other"])
            .default("email"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const scope = resolveTenantScope(ctx.user!);
        await accountForTenant(scope.tenantId, input.accountId);
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        const id = randomUUID();
        await db
          .insert(contacts)
          .values({
            id,
            tenantId: scope.tenantId,
            ...input,
            title: input.title ?? null,
            email: input.email ?? null,
            phone: input.phone ?? null,
            createdBy: scope.userId,
          });
        return { id };
      }),
  }),
  affiliations: router({
    list: tenantRoleProcedure(readableRoles)
      .input(z.object({ accountId: z.string().uuid() }))
      .query(async ({ ctx, input }) => {
        const scope = resolveTenantScope(ctx.user!);
        await accountForTenant(scope.tenantId, input.accountId);
        const db = await getDb();
        if (!db) return [];
        return db
          .select()
          .from(accountAffiliations)
          .where(
            and(
              eq(accountAffiliations.tenantId, scope.tenantId),
              or(
                eq(accountAffiliations.sourceAccountId, input.accountId),
                eq(accountAffiliations.targetAccountId, input.accountId)
              ),
              eq(accountAffiliations.status, "active")
            )
          )
          .orderBy(desc(accountAffiliations.updatedAt))
          .limit(100);
      }),
    create: tenantRoleProcedure(managerRoles)
      .input(
        z
          .object({
            sourceAccountId: z.string().uuid(),
            targetAccountId: z.string().uuid(),
            relationshipType: z.enum([
              "employs",
              "affiliated_with",
              "member_of",
              "refers_to",
              "influences",
              "parent_of",
              "other",
            ]),
            startDate: z.date().optional(),
            endDate: z.date().optional(),
            notes: z.string().trim().max(3000).optional(),
          })
          .refine(value => value.sourceAccountId !== value.targetAccountId, {
            message: "An account cannot be affiliated with itself",
          })
          .refine(
            value =>
              !value.startDate ||
              !value.endDate ||
              value.endDate >= value.startDate,
            { message: "Affiliation end date must follow its start date" }
          )
      )
      .mutation(async ({ ctx, input }) => {
        const scope = resolveTenantScope(ctx.user!);
        await accountForTenant(scope.tenantId, input.sourceAccountId);
        await accountForTenant(scope.tenantId, input.targetAccountId);
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        const id = randomUUID();
        await db
          .insert(accountAffiliations)
          .values({
            id,
            tenantId: scope.tenantId,
            ...input,
            startDate: input.startDate ?? null,
            endDate: input.endDate ?? null,
            notes: input.notes ?? null,
            createdBy: scope.userId,
          });
        await appendAuditEvent({
          tenantId: scope.tenantId,
          actorUserId: scope.userId,
          entityType: "account_affiliation",
          entityId: id,
          eventType: "account.affiliation_created",
          operation: "create",
          oldValue: null,
          newValue: input,
          reason: "Customer 360 affiliation created",
        });
        return { id };
      }),
    end: tenantRoleProcedure(managerRoles)
      .input(
        z.object({
          id: z.string().uuid(),
          endDate: z.date(),
          reason: z.string().trim().min(3).max(1000),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const scope = resolveTenantScope(ctx.user!);
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        const [row] = await db
          .select()
          .from(accountAffiliations)
          .where(
            and(
              eq(accountAffiliations.tenantId, scope.tenantId),
              eq(accountAffiliations.id, input.id)
            )
          )
          .limit(1);
        if (!row || row.status !== "active")
          throw new Error("Active affiliation not found in the tenant");
        await db
          .update(accountAffiliations)
          .set({ status: "ended", endDate: input.endDate })
          .where(
            and(
              eq(accountAffiliations.id, input.id),
              eq(accountAffiliations.tenantId, scope.tenantId)
            )
          );
        await appendAuditEvent({
          tenantId: scope.tenantId,
          actorUserId: scope.userId,
          entityType: "account_affiliation",
          entityId: input.id,
          eventType: "account.affiliation_ended",
          operation: "status_change",
          oldValue: { status: row.status, endDate: row.endDate },
          newValue: { status: "ended", endDate: input.endDate },
          reason: input.reason,
        });
        return { success: true };
      }),
  }),
  account360: tenantRoleProcedure(readableRoles)
    .input(z.object({ accountId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const scope = resolveTenantScope(ctx.user!);
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const account = await accountForTenant(scope.tenantId, input.accountId);
      const [
        accountContacts,
        affiliations,
        recentVisits,
        plannedActivity,
        accountOpportunities,
        commercialSignals,
      ] = await Promise.all([
        db
          .select()
          .from(contacts)
          .where(
            and(
              eq(contacts.tenantId, scope.tenantId),
              eq(contacts.accountId, input.accountId),
              eq(contacts.status, "active")
            )
          )
          .orderBy(desc(contacts.updatedAt))
          .limit(100),
        db
          .select()
          .from(accountAffiliations)
          .where(
            and(
              eq(accountAffiliations.tenantId, scope.tenantId),
              or(
                eq(accountAffiliations.sourceAccountId, input.accountId),
                eq(accountAffiliations.targetAccountId, input.accountId)
              ),
              eq(accountAffiliations.status, "active")
            )
          )
          .orderBy(desc(accountAffiliations.updatedAt))
          .limit(100),
        db
          .select()
          .from(visitLogs)
          .where(
            and(
              eq(visitLogs.tenantId, scope.tenantId),
              eq(visitLogs.accountId, input.accountId)
            )
          )
          .orderBy(desc(visitLogs.occurredAt))
          .limit(20),
        db
          .select()
          .from(plannedVisits)
          .where(
            and(
              eq(plannedVisits.tenantId, scope.tenantId),
              eq(plannedVisits.accountId, input.accountId)
            )
          )
          .orderBy(desc(plannedVisits.plannedStartAt))
          .limit(20),
        db
          .select()
          .from(opportunities)
          .where(
            and(
              eq(opportunities.tenantId, scope.tenantId),
              eq(opportunities.accountId, input.accountId)
            )
          )
          .orderBy(desc(opportunities.updatedAt))
          .limit(50),
        db
          .select()
          .from(accountCommercialSignals)
          .where(
            and(
              eq(accountCommercialSignals.tenantId, scope.tenantId),
              eq(accountCommercialSignals.accountId, input.accountId),
              eq(accountCommercialSignals.status, "active")
            )
          )
          .orderBy(desc(accountCommercialSignals.observedAt))
          .limit(24),
      ]);
      const relatedIds = Array.from(
        new Set(
          affiliations.map(item =>
            item.sourceAccountId === input.accountId
              ? item.targetAccountId
              : item.sourceAccountId
          )
        )
      );
      const relatedAccounts = relatedIds.length
        ? await db
            .select()
            .from(accounts)
            .where(
              and(
                eq(accounts.tenantId, scope.tenantId),
                or(...relatedIds.map(id => eq(accounts.id, id)))
              )
            )
        : [];
      return {
        account,
        contacts: accountContacts,
        affiliations: affiliations.map(item => ({
          ...item,
          relatedAccount:
            relatedAccounts.find(
              related =>
                related.id ===
                (item.sourceAccountId === input.accountId
                  ? item.targetAccountId
                  : item.sourceAccountId)
            ) ?? null,
        })),
        recentVisits,
        plannedActivity,
        opportunities: accountOpportunities,
        commercialSignals,
      };
    }),
  territories: router({
    list: tenantRoleProcedure(readableRoles).query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(territories)
        .where(eq(territories.tenantId, resolveTenantScope(ctx.user!).tenantId))
        .orderBy(desc(territories.updatedAt))
        .limit(200);
    }),
    create: tenantRoleProcedure(managerRoles)
      .input(
        z.object({
          name: z.string().trim().min(2).max(180),
          code: z.string().trim().toUpperCase().min(2).max(64),
          region: z.string().max(120).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const scope = resolveTenantScope(ctx.user!);
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        const id = randomUUID();
        await db
          .insert(territories)
          .values({
            id,
            tenantId: scope.tenantId,
            ...input,
            region: input.region ?? null,
            createdBy: scope.userId,
          });
        return { id };
      }),
  }),
  plans: router({
    list: tenantRoleProcedure(readableRoles).query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(cyclePlans)
        .where(eq(cyclePlans.tenantId, resolveTenantScope(ctx.user!).tenantId))
        .orderBy(desc(cyclePlans.startDate))
        .limit(200);
    }),
    create: tenantRoleProcedure(managerRoles)
      .input(
        z
          .object({
            name: z.string().trim().min(2).max(255),
            description: z.string().max(3000).optional(),
            startDate: z.date(),
            endDate: z.date(),
          })
          .refine(v => v.endDate >= v.startDate, {
            message: "End date must be after start date.",
          })
      )
      .mutation(async ({ ctx, input }) => {
        const scope = resolveTenantScope(ctx.user!);
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        const id = randomUUID();
        await db
          .insert(cyclePlans)
          .values({
            id,
            tenantId: scope.tenantId,
            ...input,
            description: input.description ?? null,
            createdBy: scope.userId,
          });
        return { id };
      }),
    schedule: tenantRoleProcedure(managerRoles)
      .input(
        z.object({
          cyclePlanId: z.string().uuid(),
          accountId: z.string().uuid(),
          repUserId: z.number().int().positive(),
          plannedStartAt: z.date(),
          priority: z
            .enum(["critical", "high", "normal", "low"])
            .default("normal"),
          objective: z.string().max(3000).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const scope = resolveTenantScope(ctx.user!);
        await accountForTenant(scope.tenantId, input.accountId);
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        const id = randomUUID();
        await db
          .insert(plannedVisits)
          .values({
            id,
            tenantId: scope.tenantId,
            ...input,
            objective: input.objective ?? null,
            createdBy: scope.userId,
          });
        return { id };
      }),
  }),
  opportunities: router({
    list: tenantRoleProcedure(readableRoles).query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(opportunities)
        .where(
          eq(opportunities.tenantId, resolveTenantScope(ctx.user!).tenantId)
        )
        .orderBy(desc(opportunities.updatedAt))
        .limit(200);
    }),
    create: tenantRoleProcedure(managerRoles)
      .input(
        z.object({
          name: z.string().trim().min(2).max(255),
          accountId: z.string().uuid().optional(),
          value: z
            .string()
            .regex(/^\d+(\.\d{1,2})?$/)
            .default("0.00"),
          probability: z.number().int().min(0).max(100).default(10),
          expectedCloseDate: z.date().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const scope = resolveTenantScope(ctx.user!);
        if (input.accountId)
          await accountForTenant(scope.tenantId, input.accountId);
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        const id = randomUUID();
        await db
          .insert(opportunities)
          .values({
            id,
            tenantId: scope.tenantId,
            ...input,
            accountId: input.accountId ?? null,
            expectedCloseDate: input.expectedCloseDate ?? null,
            ownerUserId: scope.userId,
            createdBy: scope.userId,
          });
        return { id };
      }),
    moveStage: tenantRoleProcedure(managerRoles)
      .input(
        z.object({
          id: z.string().uuid(),
          stage: z.enum([
            "qualification",
            "discovery",
            "proposal",
            "negotiation",
            "won",
            "lost",
          ]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const scope = resolveTenantScope(ctx.user!);
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        const [opportunity] = await db
          .select()
          .from(opportunities)
          .where(
            and(
              eq(opportunities.tenantId, scope.tenantId),
              eq(opportunities.id, input.id)
            )
          )
          .limit(1);
        if (!opportunity)
          throw new Error("Opportunity not found in the active tenant");
        const status = opportunityStatusForStage(input.stage);
        await db
          .update(opportunities)
          .set({ stage: input.stage, status })
          .where(
            and(
              eq(opportunities.id, input.id),
              eq(opportunities.tenantId, scope.tenantId)
            )
          );
        await appendAuditEvent({
          tenantId: scope.tenantId,
          actorUserId: scope.userId,
          entityType: "opportunity",
          entityId: input.id,
          eventType: "opportunity.stage_changed",
          operation: "status_change",
          oldValue: { stage: opportunity.stage },
          newValue: { stage: input.stage, status },
          reason: "Opportunity Kanban stage transition",
        });
        return { id: input.id };
      }),
  }),
});
