import { describe, expect, it, vi } from "vitest";

const whereClauses: unknown[] = [];
vi.mock("drizzle-orm", () => ({
  eq: (column: unknown, value: unknown) => ({ column, value }),
  and: (...conditions: unknown[]) => conditions,
}));
const db = {
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(async (condition: unknown) => {
        whereClauses.push(condition);
        return [];
      }),
    })),
  })),
};
vi.mock("./db", () => ({ getDb: async () => db }));

describe("BI tenant isolation", () => {
  it("scopes every dashboard source query to the active tenant", async () => {
    const { buildBiDashboard } = await import("./services/bi");
    await buildBiDashboard("tenant-a", "exec", 1);
    expect(whereClauses).toHaveLength(9);
    const filters = whereClauses.flatMap((clause: any) => Array.isArray(clause) ? clause : [clause]);
    expect(whereClauses.every((clause: any) => (Array.isArray(clause) ? clause : [clause]).some((filter: any) => filter.value === "tenant-a"))).toBe(true);
    expect(filters.map((filter: any) => filter.value)).not.toContain("tenant-b");
  });
});
