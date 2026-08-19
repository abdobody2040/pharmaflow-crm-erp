import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { isSameTenant, resolveTenantScope } from "./security/access";
import { decideAttendance, formatPayrollContent, isValidExpenseTransition, isValidLeaveTransition, payrollExportHeaders } from "./services/hrWorkflow";

describe("ERP/HR workflow safeguards", () => {
  it("keeps tenant-A HR scope distinct from tenant-B records", () => {
    const scope = resolveTenantScope({ id: 8, openId: "local:8", tenantId: "tenant-a", name: "HR", email: "hr@a.example", passwordHash: null, loginMethod: "local_jwt", role: "hr", department: null, territory: null, hireDate: null, status: "active", createdAt: new Date(), updatedAt: new Date(), createdBy: 1, lastSignedIn: new Date() });
    expect(isSameTenant(scope, "tenant-a")).toBe(true); expect(isSameTenant(scope, "tenant-b")).toBe(false);
  });
  it("marks GPS attendance only within an active office or territory geofence", () => {
    const fences = [{ id: "office-a", geofenceType: "office" as const, latitude: "25.2048", longitude: "55.2708", radiusMeters: 150 }];
    expect(decideAttendance({ latitude: 25.2052, longitude: 55.2708 }, fences)).toMatchObject({ eligible: true, geofenceId: "office-a" });
    expect(decideAttendance({ latitude: 25.215, longitude: 55.2708 }, fences)).toMatchObject({ eligible: false, geofenceId: "office-a" });
  });
  it("enforces leave and expense status transitions without destructive mutations", () => {
    expect(isValidLeaveTransition("submitted", "approved")).toBe(true); expect(isValidLeaveTransition("approved", "cancelled")).toBe(true); expect(isValidLeaveTransition("rejected", "cancelled")).toBe(false);
    expect(isValidExpenseTransition("submitted", "approved")).toBe(true); expect(isValidExpenseTransition("approved", "reimbursed")).toBe(true); expect(isValidExpenseTransition("rejected", "reimbursed")).toBe(false);
  });
  it("produces stable CSV and XLSX payroll shapes", () => {
    const rows = [{ employeeId: 8, employee: "HR User", department: "Field Sales", territory: "North", approvedLeaveRequests: 1, approvedExpenseTotal: "45.00", currency: "USD" }]; const csv = formatPayrollContent(rows, "csv"); const xlsx = formatPayrollContent(rows, "xlsx");
    expect(csv.mimeType).toBe("text/csv"); expect(csv.content.split("\n")[0]).toBe(payrollExportHeaders.join(",")); expect(xlsx.mimeType).toContain("spreadsheetml"); const sheet = XLSX.read(xlsx.content, { type: "base64" }).Sheets.Payroll; expect(XLSX.utils.sheet_to_json(sheet)).toHaveLength(1);
  });
});
