import { describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ getTenantById: async (id: string) => ({ id, status: "active" }), getDb: async () => null, appendAuditEvent: vi.fn() }));
import { appRouter } from "./routers";

const rep = { id: 82, openId: "local:rep", tenantId: "tenant-a", name: "Rep", email: "rep@tenant-a.example", passwordHash: null, loginMethod: "local_jwt", role: "rep" as const, department: null, territory: null, hireDate: null, status: "active" as const, createdAt: new Date(), updatedAt: new Date(), createdBy: 1, lastSignedIn: new Date() };

describe("expansion MVP authorization", () => {
  it("blocks a representative from manager-only forecast, vehicle, event, and coaching controls", async () => {
    const caller = appRouter.createCaller({ user: rep, req: { headers: {} } as any, res: {} as any });
    await expect(caller.expansion.forecasts.create({ productName: "Product A", periodStart: new Date(), periodEnd: new Date(), method: "manual", forecastValue: 1 })).rejects.toThrow("not authorized");
    await expect(caller.expansion.fleet.vehicles.create({ registrationNumber: "CAR-001", makeModel: "Fleet Van" })).rejects.toThrow("not authorized");
    await expect(caller.expansion.events.create({ name: "Clinical webinar", eventType: "webinar", startsAt: new Date(), endsAt: new Date(Date.now() + 3_600_000) })).rejects.toThrow("not authorized");
    await expect(caller.expansion.coaching.add({ visitLogId: "00000000-0000-4000-8000-000000000001", coachingNote: "Discuss the approved product material before the next call." })).rejects.toThrow("not authorized");
  });
});
