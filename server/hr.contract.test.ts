import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";

const rep = { id: 7, openId: "local:7", tenantId: "tenant-a", name: "Rep", email: "rep@example.com", passwordHash: null, loginMethod: "local_jwt", role: "rep" as const, department: null, territory: null, hireDate: null, status: "active" as const, createdAt: new Date(), updatedAt: new Date(), createdBy: 1, lastSignedIn: new Date() };
describe("ERP/HR procedure contracts", () => {
  it("registers attendance, leave, expense, and payroll procedures without destructive endpoints", () => { const paths = Object.keys((appRouter as any)._def.procedures); expect(paths).toContain("hr.attendance.checkIn"); expect(paths).toContain("hr.leave.submit"); expect(paths).toContain("hr.expenses.submit"); expect(paths).toContain("hr.payroll.export"); expect(paths.some(path => /^hr\.(attendance|leave|expenses)\.(delete|remove)/.test(path))).toBe(false); });
  it("does not allow a rep to invoke restricted payroll exports", async () => { const caller = appRouter.createCaller({ user: rep, req: { headers: {} } as any, res: {} as any }); await expect(caller.hr.payroll.export({ periodStart: new Date("2026-08-01"), periodEnd: new Date("2026-08-31"), format: "csv" })).rejects.toMatchObject({ code: "FORBIDDEN" }); }, 10_000);
});
