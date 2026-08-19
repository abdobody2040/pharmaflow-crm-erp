import { describe, expect, it, vi } from "vitest";

const update = vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => undefined) })) }));
const db = {
  select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn(async () => []) })) })) })),
  update,
};

vi.mock("./db", () => ({
  getDb: async () => db,
  getTenantById: async () => ({ id: "tenant-a", status: "active" }),
  appendAuditEvent: vi.fn(async () => undefined),
  findLocalUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  upsertUser: vi.fn(),
}));

describe("CRM cross-tenant procedure isolation", () => {
  it("rejects a tenant-A opportunity stage mutation when the record query resolves no tenant-A row", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({ user: { id: 10, openId: "local:10", tenantId: "tenant-a", name: "Manager", email: "manager@example.com", passwordHash: null, loginMethod: "local_jwt", role: "manager", department: null, territory: null, hireDate: null, status: "active", createdAt: new Date(), updatedAt: new Date(), createdBy: 1, lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as any, res: {} as any });
    await expect(caller.crm.opportunities.moveStage({ id: "bc490c50-8d50-4ec8-9a57-dc57ebaf1c01", stage: "won" })).rejects.toThrow("Opportunity not found in the active tenant");
    expect(update).not.toHaveBeenCalled();
  });
});
