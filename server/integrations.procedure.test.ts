import { describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ getTenantById: async (id: string) => ({ id, status: "active" }), getDb: async () => null, appendAuditEvent: vi.fn() }));
import { appRouter } from "./routers";

const rep = { id: 82, openId: "local:rep", tenantId: "tenant-a", name: "Rep", email: "rep@tenant-a.example", passwordHash: null, loginMethod: "local_jwt", role: "rep" as const, department: null, territory: null, hireDate: null, status: "active" as const, createdAt: new Date(), updatedAt: new Date(), createdBy: 1, lastSignedIn: new Date() };

describe("integration gateway authorization", () => {
  it("blocks a representative from managing versioned API keys and outbound webhook controls", async () => {
    const caller = appRouter.createCaller({ user: rep, req: { headers: {} } as any, res: {} as any });
    const id = "00000000-0000-4000-8000-000000000001";
    await expect(caller.integrations.apiKeys.issue({ label: "ERP reader", scopes: ["crm.read"] })).rejects.toThrow("not authorized");
    await expect(caller.integrations.webhooks.register({ name: "ERP sync", endpointUrl: "https://example.org/pharmaflow", eventTypes: ["document.activated"] })).rejects.toThrow("not authorized");
    await expect(caller.integrations.webhooks.dispatchTest({ id, eventType: "document.activated" })).rejects.toThrow("not authorized");
  });
});
