import { describe, expect, it, vi } from "vitest";

let mode: "prior" | "tenantB" | "success" = "prior";
let selectCount = 0;
const appendAuditEvent = vi.fn();
const insertValues = vi.fn(async () => undefined);
const db = { select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn(async () => { selectCount += 1; if (mode === "prior") return [{ id: "already-applied" }]; if (mode === "success" && selectCount === 2) return [{ id: "shift-a", tenantId: "tenant-a" }]; if (mode === "tenantB" && selectCount === 2) return [{ id: "shift-b", tenantId: "tenant-b" }]; return []; }) })) })) })), insert: vi.fn(() => ({ values: insertValues })) };

vi.mock("./db", () => ({ getDb: async () => db, getTenantById: async () => ({ id: "tenant-a", status: "active" }), appendAuditEvent, createVisit: vi.fn(), findLocalUser: vi.fn(), getUserByOpenId: vi.fn(), upsertUser: vi.fn() }));
vi.mock("./services/geofence", () => ({ evaluateLocationGeofences: vi.fn(async () => []), haversineMeters: vi.fn(), isIdlePair: vi.fn() }));

const user = (role: "rep" | "exec") => ({ id: 44, openId: "local:44", tenantId: "tenant-a", name: "Rep", email: "rep@example.com", passwordHash: null, loginMethod: "local_jwt", role, department: null, territory: null, hireDate: null, status: "active", createdAt: new Date(), updatedAt: new Date(), createdBy: 1, lastSignedIn: new Date() });
const locationInput = { clientMutationId: "bc490c50-8d50-4ec8-9a57-dc57ebaf1c01", shiftId: "ec490c50-8d50-4ec8-9a57-dc57ebaf1c01", latitude: "40.7128000", longitude: "-74.0060000", nearPlannedStop: false, capturedAt: new Date() };

describe("rep procedure safeguards", () => {
  it("returns an idempotent result before creating a duplicate location write", async () => { mode = "prior"; const { appRouter } = await import("./routers"); const caller = appRouter.createCaller({ user: user("rep"), req: { headers: {} } as any, res: {} as any }); await expect(caller.rep.location(locationInput)).resolves.toMatchObject({ applied: false, idempotent: true }); expect(appendAuditEvent).not.toHaveBeenCalled(); });
  it("denies rep procedures to a non-rep role", async () => { const { appRouter } = await import("./routers"); const caller = appRouter.createCaller({ user: user("exec"), req: { headers: {} } as any, res: {} as any }); await expect(caller.rep.shift.current()).rejects.toMatchObject({ code: "FORBIDDEN" }); });
  it("rejects a tenant-A location procedure even when a mocked tenant-B shift record is returned", async () => { mode = "tenantB"; selectCount = 0; appendAuditEvent.mockClear(); const { appRouter } = await import("./routers"); const caller = appRouter.createCaller({ user: user("rep"), req: { headers: {} } as any, res: {} as any }); await expect(caller.rep.location({ ...locationInput, shiftId: "dc490c50-8d50-4ec8-9a57-dc57ebaf1c01" })).rejects.toThrow("Location capture is permitted only during the active shift"); expect(appendAuditEvent).not.toHaveBeenCalled(); });
  it("writes immutable audit evidence only after a tenant-A location event passes tenant-A shift scoping", async () => { mode = "success"; selectCount = 0; appendAuditEvent.mockClear(); insertValues.mockClear(); const { appRouter } = await import("./routers"); const caller = appRouter.createCaller({ user: user("rep"), req: { headers: {} } as any, res: {} as any }); await expect(caller.rep.location(locationInput)).resolves.toMatchObject({ applied: true, cadenceSeconds: 60 }); expect(insertValues).toHaveBeenCalledTimes(2); expect(appendAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ tenantId: "tenant-a", eventType: "rep.location_recorded", operation: "create" })); });
});
