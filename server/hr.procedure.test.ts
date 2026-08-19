import { describe, expect, it, vi } from "vitest";

let queryResults: unknown[][] = [];
const appendAuditEvent = vi.fn(async () => undefined);
const insertValues = vi.fn(async () => undefined);
const updateWhere = vi.fn(async () => undefined);

function queryChain(rows: unknown[]) {
  return {
    limit: vi.fn(async () => rows),
    orderBy: vi.fn(() => ({ limit: vi.fn(async () => rows) })),
    then: (resolve: (value: unknown[]) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve(rows).then(resolve, reject),
  };
}

const db = {
  select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => queryChain(queryResults.shift() ?? [])) })) })),
  insert: vi.fn(() => ({ values: insertValues })),
  update: vi.fn(() => ({ set: vi.fn(() => ({ where: updateWhere })) })),
};

vi.mock("./db", () => ({ getDb: async () => db, getTenantById: async () => ({ id: "tenant-a", status: "active" }), appendAuditEvent, createVisit: vi.fn(), findLocalUser: vi.fn(), getUserByOpenId: vi.fn(), upsertUser: vi.fn() }));

const user = (role: "admin" | "hr" | "rep", tenantId = "tenant-a") => ({ id: role === "rep" ? 44 : 8, openId: `local:${role}`, tenantId, name: role, email: `${role}@example.com`, passwordHash: null, loginMethod: "local_jwt", role, department: null, territory: null, hireDate: null, status: "active" as const, createdAt: new Date(), updatedAt: new Date(), createdBy: 1, lastSignedIn: new Date() });
const id = "bc490c50-8d50-4ec8-9a57-dc57ebaf1c01";
const caller = async (role: "admin" | "hr" | "rep") => (await import("./routers")).appRouter.createCaller({ user: user(role), req: { headers: {} } as any, res: {} as any });
const reset = (rows: unknown[][]) => { queryResults = rows; insertValues.mockClear(); updateWhere.mockClear(); appendAuditEvent.mockClear(); };

describe("HR procedure safeguards", () => {
  it("records a GPS check-in from the active tenant's office/territory evidence", async () => {
    reset([[{ id, latitude: "25.2048", longitude: "55.2708" }], [{ id: "office-a", geofenceType: "office", latitude: "25.2048", longitude: "55.2708", radiusMeters: 150 }]]);
    const result = await (await caller("rep")).hr.attendance.checkIn();
    expect(result).toMatchObject({ eligible: true, distanceMeters: 0 });
    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({ tenantId: "tenant-a", eventType: "check_in", geofenceId: "office-a" }));
  });

  it("rejects an employee cancellation when a tenant-A lookup cannot return a tenant-B request", async () => {
    reset([[]]);
    await expect((await caller("rep")).hr.leave.cancel({ id })).rejects.toThrow("Leave request cannot be cancelled");
    expect(updateWhere).not.toHaveBeenCalled();
  });

  it("applies only allowed leave and expense lifecycle transitions", async () => {
    reset([[{ id, tenantId: "tenant-a", status: "submitted" }]]);
    await expect((await caller("hr")).hr.leave.review({ id, status: "approved" })).resolves.toEqual({ success: true });
    expect(updateWhere).toHaveBeenCalled();
    reset([[{ id, tenantId: "tenant-a", employeeUserId: 44, status: "approved", reviewNote: null }]]);
    await expect((await caller("rep")).hr.leave.cancel({ id })).resolves.toEqual({ success: true });
    reset([[{ id, tenantId: "tenant-a", status: "submitted" }]]);
    await expect((await caller("hr")).hr.expenses.review({ id, status: "approved" })).resolves.toEqual({ success: true });
    reset([[{ id, tenantId: "tenant-a", status: "approved", reviewNote: null }]]);
    await expect((await caller("hr")).hr.expenses.reimburse({ id })).resolves.toEqual({ success: true });
  });

  it("returns CSV and XLSX payroll exports with audited, stable response shapes", async () => {
    const employees = [{ id: 8, name: "HR User", email: "hr@example.com", department: "Field", territory: "North" }];
    reset([employees, [], []]);
    const csv = await (await caller("hr")).hr.payroll.export({ periodStart: new Date("2026-08-01"), periodEnd: new Date("2026-08-31"), format: "csv" });
    expect(csv).toMatchObject({ filename: "payroll-2026-08-01-2026-08-31.csv", mimeType: "text/csv" });
    expect(csv.content.split("\n")[0]).toBe("employeeId,employee,department,territory,approvedLeaveRequests,approvedExpenseTotal,currency");
    reset([employees, [], []]);
    const xlsx = await (await caller("hr")).hr.payroll.export({ periodStart: new Date("2026-08-01"), periodEnd: new Date("2026-08-31"), format: "xlsx" });
    expect(xlsx).toMatchObject({ filename: "payroll-2026-08-01-2026-08-31.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    expect(xlsx.content.length).toBeGreaterThan(100);
  });
});
