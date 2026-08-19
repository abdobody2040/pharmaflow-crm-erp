import { describe, expect, it } from "vitest";
import { planAnalyticsQuestion } from "./services/analytics";
import { detectExpenseOutliers, detectSampleOutliers } from "./services/anomalyDetection";

describe("governed conversational analytics", () => {
  it("maps only approved semantic intents and rejects arbitrary questions", () => {
    expect(planAnalyticsQuestion("Show expense spend by category").intent).toBe("expense_summary");
    expect(planAnalyticsQuestion("How many visits did our reps make?").intent).toBe("visit_activity");
    expect(() => planAnalyticsQuestion("Drop all users from the database")).toThrow(/visit activity|account tiers|approved expenses|recorded sample/i);
  });
});

describe("daily deterministic anomaly thresholds", () => {
  it("flags only a sample distribution materially above its peer median", () => {
    const alerts = detectSampleOutliers([{ repUserId: 1, productName: "A", quantity: 4 }, { repUserId: 2, productName: "A", quantity: 5 }, { repUserId: 3, productName: "A", quantity: 21 }], 3);
    expect(alerts).toHaveLength(1); expect(alerts[0]).toMatchObject({ anomalyType: "sample_distribution", subjectId: "3" });
  });
  it("flags a category expense above its configured peer-median multiplier", () => {
    const alerts = detectExpenseOutliers([{ id: "a", employeeUserId: 1, category: "travel", amount: 100 }, { id: "b", employeeUserId: 2, category: "travel", amount: 120 }, { id: "c", employeeUserId: 3, category: "travel", amount: 700 }], 2);
    expect(alerts).toHaveLength(1); expect(alerts[0]).toMatchObject({ anomalyType: "expense_outlier", subjectId: "c" });
  });
  it("produces the same dedupe key on repeated evaluation of identical evidence", () => {
    const evidence = [{ id: "a", employeeUserId: 1, category: "travel", amount: 100 }, { id: "b", employeeUserId: 2, category: "travel", amount: 120 }, { id: "c", employeeUserId: 3, category: "travel", amount: 700 }];
    expect(detectExpenseOutliers(evidence, 2)[0]?.dedupeKey).toBe(detectExpenseOutliers(evidence, 2)[0]?.dedupeKey);
  });
});
