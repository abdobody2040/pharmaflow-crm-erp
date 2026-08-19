import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { assertSuperAdmin, assertTenantRole, resolveActiveTenantScope } from "../security/access";
import type { UserRole } from "../../drizzle/schema";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const superAdminProcedure = protectedProcedure.use(
  t.middleware(({ ctx, next }) => {
    assertSuperAdmin(ctx.user!);
    return next({ ctx: { ...ctx, user: ctx.user! } });
  }),
);

export const tenantProcedure = protectedProcedure.use(
  t.middleware(async ({ ctx, next }) => {
    await resolveActiveTenantScope(ctx.user!);
    return next({ ctx: { ...ctx, user: ctx.user! } });
  }),
);

export function tenantRoleProcedure(allowedRoles: readonly Exclude<UserRole, "super_admin">[]) {
  return tenantProcedure.use(
    t.middleware(({ ctx, next }) => {
      // The immediately preceding tenantProcedure already verified an active tenant.
      assertTenantRole({ tenantId: ctx.user!.tenantId!, userId: ctx.user!.id, role: ctx.user!.role as Exclude<UserRole, "super_admin"> }, allowedRoles);
      return next({ ctx: { ...ctx, user: ctx.user! } });
    }),
  );
}

/** @deprecated Use superAdminProcedure or tenantRoleProcedure for explicit tenant-safe authorization. */
export const adminProcedure = tenantRoleProcedure(["admin"]);
