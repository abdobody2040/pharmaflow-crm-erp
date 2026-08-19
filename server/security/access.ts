import { TRPCError } from "@trpc/server";
import type { User, UserRole } from "../../drizzle/schema";
import { getTenantById } from "../db";

export type TenantScope = {
  tenantId: string;
  userId: number;
  role: Exclude<UserRole, "super_admin">;
};

export function resolveTenantScope(user: User): TenantScope {
  if (user.status !== "active") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Your account is not active." });
  }
  if (!user.tenantId || user.role === "super_admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Tenant-scoped data is not available to this platform account." });
  }
  return { tenantId: user.tenantId, userId: user.id, role: user.role };
}

export async function resolveActiveTenantScope(user: User): Promise<TenantScope> {
  const scope = resolveTenantScope(user);
  const tenant = await getTenantById(scope.tenantId);
  if (!tenant || tenant.status !== "active") {
    throw new TRPCError({ code: "FORBIDDEN", message: "The current tenant is not active." });
  }
  return scope;
}

export function assertSuperAdmin(user: User): void {
  if (user.status !== "active" || user.role !== "super_admin" || user.tenantId !== null) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Super-admin access is required." });
  }
}

export function assertTenantRole(scope: TenantScope, allowedRoles: readonly TenantScope["role"][]): void {
  if (!allowedRoles.includes(scope.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Your role is not authorized for this action." });
  }
}

export function isSameTenant(scope: TenantScope, recordTenantId: string): boolean {
  return scope.tenantId === recordTenantId;
}
