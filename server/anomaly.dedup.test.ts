import { beforeEach, describe, expect, it, vi } from "vitest";
import { anomalyAlerts, expenseReports, geofenceEvents, geofences, sampleTransactions } from "../drizzle/schema";

let samplesFixture: unknown[] = []; const inserted: unknown[] = [];
const chain = () => ({ from: vi.fn((table: unknown) => ({ where: vi.fn(() => { const result = table === sampleTransactions ? samplesFixture : table === anomalyAlerts ? [{ id: "existing-alert" }] : table === expenseReports || table === geofenceEvents || table === geofences ? [] : []; return { limit: vi.fn(async () => result), then: (resolve: (value: unknown[]) => unknown) => Promise.resolve(result).then(resolve) }; }) })) });
const db = { select: vi.fn(chain), insert: vi.fn(() => ({ values: vi.fn(async (value: unknown) => { inserted.push(value); }) })), update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => undefined) })) })) };
vi.mock("./db", () => ({ getDb: async () => db, appendAuditEvent: vi.fn(async () => undefined) }));

describe("daily anomaly persistence deduplication", () => {
  beforeEach(() => { samplesFixture = []; inserted.length = 0; vi.clearAllMocks(); });
  it("does not insert a second alert after the same evidence has already been persisted", async () => {
    const { runDailyAnomalyDetection } = await import("./services/anomalyDetection");
    const samples = [{ fromUserId: 1, productName: "A", quantity: "4" }, { fromUserId: 2, productName: "A", quantity: "5" }, { fromUserId: 3, productName: "A", quantity: "21" }];
    samplesFixture = samples;
    const config = { id: "config", tenantId: "tenant-a", sampleMultiplier: 3, expenseMultiplier: 2, territoryLookbackHours: 24, createdBy: 7 } as any;
    await expect(runDailyAnomalyDetection(config)).resolves.toMatchObject({ candidates: 1, created: 0 });
    expect(inserted).toHaveLength(0);
  });
});
