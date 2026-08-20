import { describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ getTenantById: async (id: string) => ({ id, status: "active" }), listTenants: vi.fn(async () => []), provisionTenant: vi.fn(), changeTenantLifecycle: vi.fn(), hashPassword: vi.fn() }));
import { appRouter } from "./routers";

const tenantAdmin = { id: 44, openId: "local:tenant-admin", tenantId: "tenant-a", name: "Tenant Admin", email: "admin@tenant-a.example", passwordHash: null, loginMethod: "local_jwt", role: "admin" as const, department: null, territory: null, hireDate: null, status: "active" as const, createdAt: new Date(), updatedAt: new Date(), createdBy: 1, lastSignedIn: new Date() };

describe("hardening tenant boundary", () => {
  it("prevents a tenant administrator from enumerating or provisioning other companies", async () => {
    const caller = appRouter.createCaller({ user: tenantAdmin, req: { headers: {} } as any, res: {} as any });
    await expect(caller.platform.listTenants()).rejects.toThrow("Super-admin");
    await expect(caller.platform.provisionTenant({ legalName: "Other Company", displayName: "Other", slug: "other-company", planTier: "starter", region: "global", adminName: "Other Admin", adminEmail: "admin@other.example", adminPassword: "fourteen-character-minimum" })).rejects.toThrow("Super-admin");
  });
});
