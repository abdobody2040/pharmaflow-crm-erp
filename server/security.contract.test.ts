import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it } from "vitest";
import type { User } from "../drizzle/schema";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { assertSuperAdmin, isSameTenant, resolveTenantScope } from "./security/access";
import { hashPassword, recordHash, verifyAccessToken, verifyPassword } from "./security/localJwt";

function user(overrides: Partial<User> = {}): User {
  return { id: 7, openId: "local:7", tenantId: "tenant-a", name: "Tenant Admin", email: "admin@example.com", passwordHash: null, loginMethod: "local_jwt", role: "admin", department: null, territory: null, hireDate: null, status: "active", createdAt: new Date(), updatedAt: new Date(), createdBy: null, lastSignedIn: new Date(), ...overrides };
}

function context(activeUser: User): TrpcContext {
  return { user: activeUser, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("tenant authorization contracts", () => {
  it("derives scope exclusively from the authenticated user tenant", () => {
    const scope = resolveTenantScope(user());
    expect(scope).toEqual({ tenantId: "tenant-a", userId: 7, role: "admin" });
    expect(isSameTenant(scope, "tenant-a")).toBe(true);
    expect(isSameTenant(scope, "tenant-b")).toBe(false);
  });

  it("rejects global and inactive identities from tenant operations", () => {
    expect(() => resolveTenantScope(user({ role: "super_admin", tenantId: null }))).toThrow(TRPCError);
    expect(() => resolveTenantScope(user({ status: "suspended" }))).toThrow(TRPCError);
  });

  it("allows only an active global super-admin through the platform guard", () => {
    expect(() => assertSuperAdmin(user({ role: "super_admin", tenantId: null }))).not.toThrow();
    expect(() => assertSuperAdmin(user())).toThrow(TRPCError);
  });

  it("rejects a tenant administrator before any platform data procedure runs", async () => {
    const caller = appRouter.createCaller(context(user()));
    await expect(caller.platform.listTenants()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.platform.provisionTenant({ legalName: "Tenant One", displayName: "Tenant One", slug: "tenant-one", planTier: "starter", region: "global", adminName: "Admin One", adminEmail: "admin@tenant.one", adminPassword: "fourteen-or-more" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.platform.changeLifecycle({ tenantId: "bc490c50-8d50-4ec8-9a57-dc57ebaf1c01", planTier: "regulated", reason: "Upgrade to regulated plan." })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("immutable compliance API contract", () => {
  it("registers create and list endpoints but no compliance update or delete endpoints", () => {
    const procedures = Object.keys((appRouter as any)._def.procedures);
    expect(procedures).toContain("compliance.visits.create");
    expect(procedures).toContain("compliance.samples.create");
    expect(procedures).toContain("compliance.signatures.create");
    expect(procedures.some(path => path.startsWith("compliance.") && /(update|delete|remove)/i.test(path))).toBe(false);
  });
});

describe("self-hosted JWT primitives", () => {
  beforeEach(() => { process.env.JWT_SECRET = "a-very-long-local-test-signing-secret-for-pharmaflow"; });

  it("verifies scrypt password hashes and produces deterministic audit hashes", async () => {
    const passwordHash = await hashPassword("CorrectHorseBatteryStaple");
    expect(await verifyPassword("CorrectHorseBatteryStaple", passwordHash)).toBe(true);
    expect(await verifyPassword("wrong-password", passwordHash)).toBe(false);
    expect(recordHash({ tenant: "a", event: "create" })).toBe(recordHash({ tenant: "a", event: "create" }));
  });

  it("fails closed when a JWT is malformed", async () => {
    await expect(verifyAccessToken("not-a-jwt")).rejects.toThrow();
  });
});
