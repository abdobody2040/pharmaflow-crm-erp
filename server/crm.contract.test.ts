import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";

describe("Core CRM procedure contract", () => {
  it("registers tenant-scoped resources and pipeline transitions without destructive routes", () => {
    const procedures = Object.keys((appRouter as any)._def.procedures);
    expect(procedures).toContain("crm.accounts.list");
    expect(procedures).toContain("crm.contacts.create");
    expect(procedures).toContain("crm.territories.create");
    expect(procedures).toContain("crm.plans.schedule");
    expect(procedures).toContain("crm.opportunities.moveStage");
    expect(procedures.some(path => path.startsWith("crm.") && /(delete|remove)/i.test(path))).toBe(false);
  });
});
