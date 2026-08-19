import { z } from "zod";
import { changeTenantLifecycle, listTenants, provisionTenant } from "../db";
import { hashPassword } from "../security/localJwt";
import { router, superAdminProcedure } from "../_core/trpc";

const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9-]{3,96}$/, "Use 3–96 lowercase letters, digits, or hyphens.");

export const platformRouter = router({
  listTenants: superAdminProcedure.query(() => listTenants()),
  provisionTenant: superAdminProcedure.input(z.object({
    legalName: z.string().trim().min(2).max(255),
    displayName: z.string().trim().min(2).max(255),
    slug,
    planTier: z.enum(["starter", "growth", "enterprise", "regulated"]),
    region: z.string().trim().min(2).max(96),
    adminName: z.string().trim().min(2).max(255),
    adminEmail: z.string().trim().email().max(320),
    adminPassword: z.string().min(14).max(128),
  })).mutation(async ({ ctx, input }) => provisionTenant(ctx.user!.id, {
    ...input,
    adminPasswordHash: await hashPassword(input.adminPassword),
  })),
  changeLifecycle: superAdminProcedure.input(z.object({
    tenantId: z.string().uuid(),
    status: z.enum(["active", "suspended"]).optional(),
    planTier: z.enum(["starter", "growth", "enterprise", "regulated"]).optional(),
    reason: z.string().trim().min(5).max(500),
  }).refine(value => value.status || value.planTier, { message: "Provide a status or plan tier change." }))
    .mutation(({ ctx, input }) => changeTenantLifecycle(ctx.user!.id, input.tenantId, input)),
});
