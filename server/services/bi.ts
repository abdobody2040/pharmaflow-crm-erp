import PDFDocument from "pdfkit";
import { and, eq } from "drizzle-orm";
import {
  accounts,
  anomalyAlerts,
  expenseReports,
  geofenceEvents,
  plannedVisits,
  repLocationEvents,
  repShifts,
  users,
  visitLogs,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { rowsToXlsxBase64 } from "./xlsx";

export type BiDashboard = {
  title: string;
  role: string;
  kpis: Array<{ label: string; value: number; unit?: string }>;
  rows: Array<Record<string, string | number>>;
};

function distanceKm(a: any, b: any) {
  const lat1 = Number(a.latitude);
  const lon1 = Number(a.longitude);
  const lat2 = Number(b.latitude);
  const lon2 = Number(b.longitude);
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return 0;
  const radians = Math.PI / 180;
  const dLat = (lat2 - lat1) * radians;
  const dLon = (lon2 - lon1) * radians;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * radians) *
      Math.cos(lat2 * radians) *
      Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function mileageByShift(pings: any[]) {
  return pings.reduce<Record<string, number>>((result, ping) => {
    const prior = result[`last:${ping.shiftId}`] as any;
    result[ping.shiftId] =
      (result[ping.shiftId] ?? 0) + (prior ? distanceKm(prior, ping) : 0);
    result[`last:${ping.shiftId}`] = ping;
    return result;
  }, {});
}

export async function buildBiDashboard(
  tenantId: string,
  role: string,
  userId: number
): Promise<BiDashboard> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [
    visits,
    plans,
    shifts,
    rawPings,
    alerts,
    expenses,
    tenantUsers,
    tenantAccounts,
    geo,
  ] = await Promise.all([
    db
      .select()
      .from(visitLogs)
      .where(
        and(
          eq(visitLogs.tenantId, tenantId),
          ...(role === "rep" ? [eq(visitLogs.repUserId, userId)] : [])
        )
      ),
    db
      .select()
      .from(plannedVisits)
      .where(
        and(
          eq(plannedVisits.tenantId, tenantId),
          ...(role === "rep" ? [eq(plannedVisits.repUserId, userId)] : [])
        )
      ),
    db
      .select()
      .from(repShifts)
      .where(
        and(
          eq(repShifts.tenantId, tenantId),
          ...(role === "rep" ? [eq(repShifts.repUserId, userId)] : [])
        )
      ),
    db
      .select()
      .from(repLocationEvents)
      .where(
        and(
          eq(repLocationEvents.tenantId, tenantId),
          ...(role === "rep" ? [eq(repLocationEvents.repUserId, userId)] : [])
        )
      ),
    db.select().from(anomalyAlerts).where(eq(anomalyAlerts.tenantId, tenantId)),
    db
      .select()
      .from(expenseReports)
      .where(eq(expenseReports.tenantId, tenantId)),
    db.select().from(users).where(eq(users.tenantId, tenantId)),
    db
      .select()
      .from(accounts)
      .where(
        and(eq(accounts.tenantId, tenantId), eq(accounts.status, "active"))
      ),
    db
      .select()
      .from(geofenceEvents)
      .where(eq(geofenceEvents.tenantId, tenantId)),
  ]);
  const pings = [...rawPings].sort(
    (a: any, b: any) =>
      new Date(a.capturedAt ?? 0).getTime() -
      new Date(b.capturedAt ?? 0).getTime()
  );
  const coverage = plans.length
    ? Math.round((visits.length / plans.length) * 100)
    : 0;
  const mileage = mileageByShift(pings);
  const totalMileage =
    Math.round(
      Object.entries(mileage)
        .filter(([key]) => !key.startsWith("last:"))
        .reduce((sum, [, value]) => sum + Number(value), 0) * 10
    ) / 10;

  if (role === "rep")
    return {
      title: "Personal field performance",
      role,
      kpis: [
        { label: "Call coverage", value: coverage, unit: "%" },
        { label: "Recorded calls", value: visits.length },
        { label: "Planned calls", value: plans.length },
      ],
      rows: plans.map((plan: any) => ({
        priority: plan.priority,
        status: plan.status,
        planned:
          plan.plannedStartAt instanceof Date
            ? plan.plannedStartAt.toISOString().slice(0, 10)
            : "—",
      })),
    };
  if (role === "fleet")
    return {
      title: "Fleet operations",
      role,
      kpis: [
        {
          label: "Active shifts",
          value: shifts.filter((shift: any) => shift.status === "active")
            .length,
        },
        {
          label: "Shift utilization",
          value: shifts.length
            ? Math.round(
                (shifts.filter((shift: any) => shift.status === "active")
                  .length /
                  shifts.length) *
                  100
              )
            : 0,
          unit: "%",
        },
        { label: "Mileage", value: totalMileage, unit: " km" },
        { label: "Telemetry pings", value: pings.length },
        {
          label: "Territory alerts",
          value: geo.filter(
            (event: any) =>
              event.eventType === "far" || event.eventType === "exit"
          ).length,
        },
      ],
      rows: shifts.map((shift: any) => ({
        repUserId: shift.repUserId,
        status: shift.status,
        mileageKm: Math.round(Number(mileage[shift.id] ?? 0) * 10) / 10,
        telemetryPings: pings.filter((ping: any) => ping.shiftId === shift.id)
          .length,
        started:
          shift.startedAt instanceof Date ? shift.startedAt.toISOString() : "—",
      })),
    };
  if (role === "exec")
    return {
      title: "Executive cross-module KPIs",
      role,
      kpis: [
        { label: "Active accounts", value: tenantAccounts.length },
        { label: "Recorded visits", value: visits.length },
        { label: "Plan achievement", value: coverage, unit: "%" },
        {
          label: "Active shifts",
          value: shifts.filter((shift: any) => shift.status === "active")
            .length,
        },
        { label: "Fleet mileage", value: totalMileage, unit: " km" },
        {
          label: "Open alerts",
          value: alerts.filter((alert: any) => alert.status === "open").length,
        },
        {
          label: "Approved expense",
          value: expenses
            .filter(
              (expense: any) =>
                expense.status === "approved" || expense.status === "reimbursed"
            )
            .reduce(
              (sum: number, expense: any) => sum + Number(expense.amount),
              0
            ),
          unit: " USD",
        },
      ],
      rows: [
        {
          employees: tenantUsers.length,
          accounts: tenantAccounts.length,
          visits: visits.length,
          plannedCalls: plans.length,
          coverage,
          mileageKm: totalMileage,
          telemetryPings: pings.length,
          alerts: alerts.filter((alert: any) => alert.status === "open").length,
        },
      ],
    };
  const reps = tenantUsers.filter((user: any) => user.role === "rep");
  return {
    title: "Manager team coverage",
    role: "manager",
    kpis: [
      { label: "Team coverage", value: coverage, unit: "%" },
      { label: "Active reps", value: reps.length },
      {
        label: "Open alerts",
        value: alerts.filter((alert: any) => alert.status === "open").length,
      },
    ],
    rows: reps.map((rep: any) => {
      const repVisits = visits.filter(
        (visit: any) => visit.repUserId === rep.id
      ).length;
      const repPlans = plans.filter(
        (plan: any) => plan.repUserId === rep.id
      ).length;
      return {
        rep: rep.name ?? `Rep ${rep.id}`,
        visits: repVisits,
        planned: repPlans,
        achievement: repPlans ? Math.round((repVisits / repPlans) * 100) : 0,
      };
    }),
  };
}

export async function exportBi(dashboard: BiDashboard, format: "xlsx" | "pdf") {
  const rows = dashboard.rows.length
    ? dashboard.rows
    : dashboard.kpis.map(kpi => ({
        metric: kpi.label,
        value: `${kpi.value}${kpi.unit ?? ""}`,
      }));
  if (format === "xlsx") {
    const headers = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
    return {
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      base64: await rowsToXlsxBase64("Report", headers, rows),
      extension: "xlsx",
    };
  }
  const doc = new PDFDocument({ margin: 42 });
  const chunks: Buffer[] = [];
  doc.on("data", chunk => chunks.push(chunk));
  doc
    .fontSize(20)
    .text(dashboard.title)
    .moveDown()
    .fontSize(10)
    .text(`Role: ${dashboard.role}`)
    .moveDown();
  dashboard.kpis.forEach(kpi =>
    doc.text(`${kpi.label}: ${kpi.value}${kpi.unit ?? ""}`)
  );
  doc.moveDown();
  rows.forEach(row =>
    doc.text(
      Object.entries(row)
        .map(([key, value]) => `${key}: ${value}`)
        .join("  |  ")
    )
  );
  doc.end();
  return new Promise<{ mimeType: string; base64: string; extension: string }>(
    resolve =>
      doc.on("end", () =>
        resolve({
          mimeType: "application/pdf",
          base64: Buffer.concat(chunks).toString("base64"),
          extension: "pdf",
        })
      )
  );
}
