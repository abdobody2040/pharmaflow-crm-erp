import { describe, expect, it, vi } from "vitest";

const update = vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => undefined) })) }));
const db = { select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn(async () => []) })) })) })), update };

vi.mock("./db", () => ({ getDb: async () => db, getTenantById: async () => ({ id: "tenant-a", status: "active" }), appendAuditEvent: vi.fn(async () => undefined), createVisit: vi.fn(), findLocalUser: vi.fn(), getUserByOpenId: vi.fn(), upsertUser: vi.fn() }));

const manager = { id: 8, openId: "local:manager", tenantId: "tenant-a", name: "Manager", email: "manager@example.com", passwordHash: null, loginMethod: "local_jwt", role: "manager" as const, department: null, territory: null, hireDate: null, status: "active" as const, createdAt: new Date(), updatedAt: new Date(), createdBy: 1, lastSignedIn: new Date() };

describe("marketing cross-tenant procedure isolation", () => {
  it("rejects a tenant-A campaign approval when the tenant-scoped campaign lookup returns no record", async () => {
    const { appRouter } = await import("./routers"); const caller = appRouter.createCaller({ user: manager, req: { headers: {} } as any, res: {} as any });
    await expect(caller.marketing.campaigns.review({ id: "bc490c50-8d50-4ec8-9a57-dc57ebaf1c01", status: "approved" })).rejects.toThrow("Campaign was not found in the active tenant");
    expect(update).not.toHaveBeenCalled();
  });
});
