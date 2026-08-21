import { haversineMeters } from "./geofence";
import { rowsToXlsxBase64 } from "./xlsx";

export type AttendanceFence = {
  id: string;
  geofenceType: "territory" | "office" | "hcp_stop";
  latitude: string | number;
  longitude: string | number;
  radiusMeters: number;
};
export type AttendanceLocation = { latitude: number; longitude: number };

export function decideAttendance(
  location: AttendanceLocation,
  fences: AttendanceFence[]
) {
  const closest = fences
    .filter(
      fence =>
        fence.geofenceType === "territory" || fence.geofenceType === "office"
    )
    .map(fence => ({
      fence,
      distanceMeters: Math.round(
        haversineMeters(location, {
          latitude: Number(fence.latitude),
          longitude: Number(fence.longitude),
        })
      ),
    }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters)[0];
  return {
    eligible: !!closest && closest.distanceMeters <= closest.fence.radiusMeters,
    geofenceId: closest?.fence.id ?? null,
    distanceMeters: closest?.distanceMeters ?? null,
  };
}

export function isValidLeaveTransition(
  current: string,
  next: "approved" | "rejected" | "cancelled"
) {
  return (
    (current === "submitted" &&
      (next === "approved" || next === "rejected" || next === "cancelled")) ||
    (current === "approved" && next === "cancelled")
  );
}
export function isValidExpenseTransition(
  current: string,
  next: "approved" | "rejected" | "reimbursed"
) {
  return (
    (current === "submitted" && (next === "approved" || next === "rejected")) ||
    (current === "approved" && next === "reimbursed")
  );
}
export const payrollExportHeaders = [
  "employeeId",
  "employee",
  "department",
  "territory",
  "approvedLeaveRequests",
  "approvedExpenseTotal",
  "currency",
] as const;
export type PayrollRow = Record<
  (typeof payrollExportHeaders)[number],
  string | number
>;
export function formatPayrollContent(
  rows: PayrollRow[],
  format: "csv" | "xlsx"
) {
  if (format === "csv") {
    const escape = (value: unknown) =>
      `"${String(value ?? "").replaceAll('"', '""')}"`;
    return {
      mimeType: "text/csv",
      content: [
        payrollExportHeaders.join(","),
        ...rows.map(row =>
          payrollExportHeaders.map(header => escape(row[header])).join(",")
        ),
      ].join("\n"),
    };
  }
  return rowsToXlsxBase64("Payroll", payrollExportHeaders, rows).then(
    content => ({
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      content,
    })
  );
}
