import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { opportunityStatusForStage } from "./routers/crm";
import { isSameTenant } from "./security/access";
import { assertTenantRole } from "./security/access";

describe("CRM authorization boundaries", () => {
  it("rejects a representative from manager-only account creation and pipeline transitions", () => {
    const repScope = { tenantId: "tenant-a", userId: 22, role: "rep" as const };
    expect(() => assertTenantRole(repScope, ["admin", "manager"])).toThrow();
  });

  it("does not register an update or delete action for immutable visit evidence", () => {
    const procedures = Object.keys((appRouter as any)._def.procedures);
    expect(procedures).toContain("compliance.visits.create");
    expect(procedures.some(path => /^compliance\.visits\.(update|delete|remove)/.test(path))).toBe(false);
  });

  it("maps won and lost Kanban stages to terminal opportunity status", () => {
    expect(opportunityStatusForStage("won")).toBe("won");
    expect(opportunityStatusForStage("lost")).toBe("lost");
    expect(opportunityStatusForStage("proposal")).toBe("open");
  });

  it("rejects a CRM record owned by a different tenant scope before access is granted", () => {
    const tenantAScope = { tenantId: "tenant-a", userId: 8, role: "manager" as const };
    const tenantBAccount = { id: "account-b", tenantId: "tenant-b" };
    expect(isSameTenant(tenantAScope, tenantBAccount.tenantId)).toBe(false);
  });
});
