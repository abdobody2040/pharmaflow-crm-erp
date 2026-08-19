import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routerSource = readFileSync(new URL("./routers/analytics.ts", import.meta.url), "utf8");
const scheduleSource = readFileSync(new URL("./scheduled/anomalyMonitor.ts", import.meta.url), "utf8");

describe("analytics and anomaly control contracts", () => {
  it("uses tenant-scoped allow-listed analytics rather than raw query execution", () => {
    expect(routerSource).toContain("planAnalyticsQuestion(input.question)");
    expect(routerSource).toContain("runAnalyticsPlan(scope.tenantId, plan)");
    expect(routerSource).not.toMatch(/\bexecute\s*\(.*question/i);
  });
  it("limits alerts and lifecycle reviews to tenant manager roles", () => {
    expect(routerSource).toContain("tenantRoleProcedure(managers)");
    expect(routerSource).toContain("eq(anomalyAlerts.tenantId, scope.tenantId)");
    expect(routerSource).toContain("db.insert(anomalyAlertReviews)");
  });
  it("requires an authenticated cron task identity and dereferences by task UID", () => {
    expect(scheduleSource).toContain("!user.isCron || !user.taskUid");
    expect(scheduleSource).toContain("eq(anomalyMonitorConfigs.scheduleCronTaskUid, user.taskUid)");
  });
});
