import { describe, expect, it, vi } from "vitest";

const db = { select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn(async () => [{ id: "shift-b", tenantId: "tenant-b" }]), orderBy: vi.fn(async () => []) })) })) })) };
vi.mock("./db", () => ({ getDb: async () => db, getTenantById: async () => ({ id: "tenant-a", status: "active" }), appendAuditEvent: vi.fn(), createVisit: vi.fn(), findLocalUser: vi.fn(), getUserByOpenId: vi.fn(), upsertUser: vi.fn() }));
vi.mock("./services/geofence", async () => { const actual = await vi.importActual<typeof import("./services/geofence")>("./services/geofence"); return { ...actual, evaluateLocationGeofences: vi.fn(async () => []) }; });

const manager = { id: 8, openId: "local:8", tenantId: "tenant-a", name: "Manager", email: "manager@example.com", passwordHash: null, loginMethod: "local_jwt", role: "manager" as const, department: null, territory: null, hireDate: null, status: "active" as const, createdAt: new Date(), updatedAt: new Date(), createdBy: 1, lastSignedIn: new Date() };
describe("tracking tenant isolation", () => {
  it("rejects tenant-A trip access when a tenant-B shift record is returned by the database fixture", async () => { const { appRouter } = await import("./routers"); const caller = appRouter.createCaller({ user: manager, req: { headers: {} } as any, res: {} as any }); await expect(caller.tracking.trip({ shiftId: "dc490c50-8d50-4ec8-9a57-dc57ebaf1c01" })).rejects.toThrow("Shift not found in active tenant"); });
});
