import { describe, expect, it } from "vitest";
import { exportBi } from "./services/bi";
const dashboard = {
  title: "Manager team coverage",
  role: "manager",
  kpis: [{ label: "Coverage", value: 82, unit: "%" }],
  rows: [{ rep: "A", visits: 12, planned: 15 }],
};
describe("BI exports", () => {
  it("returns a non-empty XLSX payload", async () => {
    const out = await exportBi(dashboard, "xlsx");
    expect(out.extension).toBe("xlsx");
    expect(out.base64.length).toBeGreaterThan(100);
  });
  it("returns a non-empty PDF payload", async () => {
    const out = await exportBi(dashboard, "pdf");
    expect(out.extension).toBe("pdf");
    expect(out.base64.length).toBeGreaterThan(100);
  });
});
