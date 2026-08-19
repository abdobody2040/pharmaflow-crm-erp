import { describe, expect, it, vi } from "vitest";

const tenantBVisit = { visit: { id: "11111111-1111-4111-8111-111111111111", tenantId: "tenant-b", repUserId: 9, status: "planned", priority: "critical", plannedStartAt: new Date() }, account: { id: "22222222-2222-4222-8222-222222222222", tenantId: "tenant-b", name: "Tenant B HCP", latitude: "40.0", longitude: "-74.0" } };
const db = { select: vi.fn(() => ({ from: vi.fn(() => ({ innerJoin: vi.fn(() => ({ where: vi.fn(async () => [tenantBVisit]) })) })) })) };
vi.mock("./db", () => ({ getDb: async () => db, getTenantById: async () => ({ id: "tenant-a", status: "active" }), appendAuditEvent: vi.fn(), createVisit: vi.fn(), findLocalUser: vi.fn(), getUserByOpenId: vi.fn(), upsertUser: vi.fn() }));

const manager = { id: 8, openId: "local:8", tenantId: "tenant-a", name: "Manager", email: "manager@example.com", passwordHash: null, loginMethod: "local_jwt", role: "manager" as const, department: null, territory: null, hireDate: null, status: "active" as const, createdAt: new Date(), updatedAt: new Date(), createdBy: 1, lastSignedIn: new Date() };
describe("routing tenant isolation", () => {
  it("filters a mocked tenant-B planned visit out of a tenant-A optimized route", async () => { const { appRouter } = await import("./routers"); const caller = appRouter.createCaller({ user: manager, req: { headers: {} } as any, res: {} as any }); const route = await caller.routing.optimizeDaily({ date: new Date("2026-08-19T12:00:00Z") }); expect(route.stops).toEqual([]); expect(route.skipped).toEqual([]); });
});
