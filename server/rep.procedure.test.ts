import { describe, expect, it, vi } from "vitest";

let queryResults: unknown[][] = [];
const appendAuditEvent = vi.fn(async () => undefined);
const insertValues = vi.fn(async () => undefined);

function queryChain(rows: unknown[]) {
  return { limit: vi.fn(async () => rows), orderBy: vi.fn(() => ({ limit: vi.fn(async () => rows) })), then: (resolve: (value: unknown[]) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve(rows).then(resolve, reject) };
}

const db = { select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => queryChain(queryResults.shift() ?? [])) })) })), insert: vi.fn(() => ({ values: insertValues })) };
vi.mock("./db", () => ({ getDb: async () => db, getTenantById: async () => ({ id: "tenant-a", status: "active" }), appendAuditEvent, createVisit: vi.fn(), findLocalUser: vi.fn(), getUserByOpenId: vi.fn(), upsertUser: vi.fn() }));
vi.mock("./services/geofence", () => ({ evaluateLocationGeofences: vi.fn(async () => []), haversineMeters: vi.fn(() => 0), isIdlePair: vi.fn() }));

const user = (role: "rep" | "exec") => ({ id: 44, openId: "local:44", tenantId: "tenant-a", name: "Rep", email: "rep@example.com", passwordHash: null, loginMethod: "local_jwt", role, department: null, territory: null, hireDate: null, status: "active" as const, createdAt: new Date(), updatedAt: new Date(), createdBy: 1, lastSignedIn: new Date() });
const locationInput = { clientMutationId: "bc490c50-8d50-4ec8-9a57-dc57ebaf1c01", shiftId: "ec490c50-8d50-4ec8-9a57-dc57ebaf1c01", latitude: "40.7128000", longitude: "-74.0060000", nearPlannedStop: false, capturedAt: new Date("2026-08-20T10:00:00.000Z") };
const reset = (rows: unknown[][]) => { queryResults = rows; appendAuditEvent.mockClear(); insertValues.mockClear(); };

describe("rep procedure safeguards", () => {
  it("returns an idempotent result before creating a duplicate location write", async () => { reset([[{ id: "already-applied" }]]); const { appRouter } = await import("./routers"); const caller = appRouter.createCaller({ user: user("rep"), req: { headers: {} } as any, res: {} as any }); await expect(caller.rep.location(locationInput)).resolves.toMatchObject({ applied: false, idempotent: true }); expect(appendAuditEvent).not.toHaveBeenCalled(); });
  it("denies rep procedures to a non-rep role", async () => { const { appRouter } = await import("./routers"); const caller = appRouter.createCaller({ user: user("exec"), req: { headers: {} } as any, res: {} as any }); await expect(caller.rep.shift.current()).rejects.toMatchObject({ code: "FORBIDDEN" }); });
  it("rejects a tenant-A location procedure even when a mocked tenant-B shift record is returned", async () => { reset([[], [{ id: "shift-b", tenantId: "tenant-b" }]]); const { appRouter } = await import("./routers"); const caller = appRouter.createCaller({ user: user("rep"), req: { headers: {} } as any, res: {} as any }); await expect(caller.rep.location({ ...locationInput, shiftId: "dc490c50-8d50-4ec8-9a57-dc57ebaf1c01" })).rejects.toThrow("Location capture is permitted only during the active shift"); expect(appendAuditEvent).not.toHaveBeenCalled(); });
  it("records GPS location, automatic attendance, sync evidence, and immutable audits through the location-ping path", async () => {
    reset([[], [{ id: "shift-a", tenantId: "tenant-a" }], [], [{ id: "office-a", geofenceType: "office", latitude: "40.7128000", longitude: "-74.0060000", radiusMeters: 150 }]]);
    const { appRouter } = await import("./routers"); const caller = appRouter.createCaller({ user: user("rep"), req: { headers: {} } as any, res: {} as any });
    const result = await caller.rep.location(locationInput);
    expect(result).toMatchObject({ applied: true, cadenceSeconds: 60, attendance: { eligible: true, distanceMeters: 0 } });
    expect(insertValues).toHaveBeenCalledTimes(3);
    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({ tenantId: "tenant-a", eventType: "check_in", geofenceId: "office-a", locationEventId: expect.any(String) }));
    expect(appendAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ tenantId: "tenant-a", eventType: "attendance.auto_check_in", operation: "create" }));
    expect(appendAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ tenantId: "tenant-a", eventType: "rep.location_recorded", operation: "create", newValue: expect.objectContaining({ attendanceId: expect.any(String) }) }));
  });
});
