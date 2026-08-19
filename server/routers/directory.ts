import { z } from "zod";
import { changeEmployeeStatus, listTenantEmployees } from "../db";
import { resolveTenantScope } from "../security/access";
import { router, tenantRoleProcedure } from "../_core/trpc";

export const directoryRouter = router({
  list: tenantRoleProcedure(["admin", "manager", "hr", "exec"]).query(({ ctx }) =>
    listTenantEmployees(resolveTenantScope(ctx.user!)),
  ),
  changeStatus: tenantRoleProcedure(["admin", "hr"]).input(z.object({
    userId: z.number().int().positive(),
    status: z.enum(["active", "suspended", "archived"]),
    reason: z.string().trim().min(5).max(500),
  })).mutation(({ ctx, input }) => changeEmployeeStatus(resolveTenantScope(ctx.user!), input.userId, input.status, input.reason)),
});
