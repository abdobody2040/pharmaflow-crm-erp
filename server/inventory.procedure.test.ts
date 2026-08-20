import { describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ getTenantById: async (id: string) => ({ id, status: "active" }), getDb: async () => null, appendAuditEvent: vi.fn() }));
import { appRouter } from "./routers";

const rep = { id: 82, openId: "local:rep", tenantId: "tenant-a", name: "Rep", email: "rep@tenant-a.example", passwordHash: null, loginMethod: "local_jwt", role: "rep" as const, department: null, territory: null, hireDate: null, status: "active" as const, createdAt: new Date(), updatedAt: new Date(), createdBy: 1, lastSignedIn: new Date() };

describe("warehouse inventory authorization", () => {
  it("blocks a representative from changing warehouse sites, append-only stock records, and reorder thresholds", async () => {
    const caller = appRouter.createCaller({ user: rep, req: { headers: {} } as any, res: {} as any });
    const siteId = "00000000-0000-4000-8000-000000000001";
    await expect(caller.inventory.sites.create({ name: "Main warehouse", code: "MAIN", siteType: "warehouse" })).rejects.toThrow("not authorized");
    await expect(caller.inventory.ledger.record({ siteId, productName: "Product A", transactionType: "receipt", quantityDelta: 10, reason: "Opening stock received" })).rejects.toThrow("not authorized");
    await expect(caller.inventory.reorder.set({ siteId, productName: "Product A", minimumQuantity: 5, reorderQuantity: 20 })).rejects.toThrow("not authorized");
  });
});
