import { describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ getDb: async () => undefined, appendAuditEvent: vi.fn() }));
import { appRouter } from "./routers";

const rep = { id: 700, openId: "local:rep", tenantId: "tenant-a", name: "Tenant Rep", email: "rep@tenant-a.example", passwordHash: null, loginMethod: "local_jwt", role: "rep" as const, department: null, territory: null, hireDate: null, status: "active" as const, createdAt: new Date(), updatedAt: new Date(), createdBy: 1, lastSignedIn: new Date() };

describe("tenant terminology procedures", () => {
  it("denies terminology changes to a representative before any database access", async () => {
    const caller = appRouter.createCaller({ user: rep, req: { headers: {} } as any, res: {} as any });
    await expect(caller.terminology.save({ termKey: "hcp", englishTerm: "HCP", arabicTerm: "مقدم الرعاية الصحية" })).rejects.toThrow();
  });
  it("rejects unsafe terminology keys at the procedure boundary", async () => {
    const caller = appRouter.createCaller({ user: rep, req: { headers: {} } as any, res: {} as any });
    await expect(caller.terminology.save({ termKey: "unsafe key!", englishTerm: "HCP", arabicTerm: "مقدم الرعاية الصحية" })).rejects.toThrow();
  });
});
