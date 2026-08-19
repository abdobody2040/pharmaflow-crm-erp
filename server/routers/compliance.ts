import { z } from "zod";
import {
  createSampleTransaction,
  createSignature,
  createVisit,
  listSampleTransactions,
  listSignatures,
  listVisits,
} from "../db";
import { resolveTenantScope } from "../security/access";
import { router, tenantRoleProcedure } from "../_core/trpc";

const readableRoles = ["admin", "manager", "exec"] as const;
const operationalRoles = ["admin", "manager", "rep"] as const;

export const complianceRouter = router({
  visits: router({
    list: tenantRoleProcedure(readableRoles).query(({ ctx }) => listVisits(resolveTenantScope(ctx.user!))),
    create: tenantRoleProcedure(operationalRoles).input(z.object({
      accountName: z.string().trim().min(2).max(255),
      accountId: z.string().uuid().optional(),
      cyclePlanId: z.string().uuid().optional(),
      plannedVisitId: z.string().uuid().optional(),
      objective: z.string().trim().min(2).max(5000),
      productsDiscussed: z.array(z.string().trim().min(1).max(120)).min(1).max(40),
      sampleTransactionIds: z.array(z.string().uuid()).max(100).optional(),
      nextSteps: z.string().trim().max(5000).optional(),
      eSignatureId: z.string().uuid().optional(),
      occurredAt: z.date(),
      supersedesId: z.string().uuid().optional(),
    })).mutation(({ ctx, input }) => createVisit(resolveTenantScope(ctx.user!), input)),
  }),
  samples: router({
    list: tenantRoleProcedure(readableRoles).query(({ ctx }) => listSampleTransactions(resolveTenantScope(ctx.user!))),
    create: tenantRoleProcedure(operationalRoles).input(z.object({
      transactionType: z.enum(["allocation", "handoff", "return", "adjustment"]),
      productName: z.string().trim().min(2).max(255),
      lotNumber: z.string().trim().min(1).max(128),
      expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      quantity: z.string().regex(/^\d+(\.\d{1,3})?$/).max(16),
      toUserId: z.number().int().positive().optional(),
      visitLogId: z.string().uuid().optional(),
      occurredAt: z.date(),
      compensatesId: z.string().uuid().optional(),
    })).mutation(({ ctx, input }) => createSampleTransaction(resolveTenantScope(ctx.user!), input)),
  }),
  signatures: router({
    list: tenantRoleProcedure(readableRoles).query(({ ctx }) => listSignatures(resolveTenantScope(ctx.user!))),
    create: tenantRoleProcedure(operationalRoles).input(z.object({
      subjectType: z.string().trim().min(2).max(96),
      subjectId: z.string().uuid(),
      meaning: z.enum(["authorship", "approval", "review", "attestation"]),
      intentStatement: z.string().trim().min(5).max(500),
      signatureSecret: z.string().min(6).max(128),
    })).mutation(({ ctx, input }) => createSignature(resolveTenantScope(ctx.user!), input)),
  }),
});
