import { describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ getTenantById: async (id: string) => ({ id, status: "active" }), getDb: async () => null, appendAuditEvent: vi.fn(), createVisit: vi.fn(), createSampleTransaction: vi.fn(), createSignature: vi.fn(), listVisits: vi.fn(), listSampleTransactions: vi.fn(), listSignatures: vi.fn() }));
import { appRouter } from "./routers";

const rep = { id: 91, openId: "local:rep", tenantId: "tenant-a", name: "Rep", email: "rep@example.com", passwordHash: null, loginMethod: "local_jwt", role: "rep" as const, department: null, territory: null, hireDate: null, status: "active" as const, createdAt: new Date(), updatedAt: new Date(), createdBy: 1, lastSignedIn: new Date() };
const caller = appRouter.createCaller({ user: rep, req: { headers: {} } as any, res: {} as any });

describe("strict compliance procedure controls", () => {
  it("denies a representative access to administrative audit and access-review controls", async () => {
    await expect(caller.compliance.audit.list()).rejects.toThrow("not authorized");
    await expect(caller.compliance.accessReviews.generate({ scope: "tenant", reportPeriodStart: new Date(), reportPeriodEnd: new Date() })).rejects.toThrow("not authorized");
  });

  it("rejects signature requests that omit the explicit deliberate signing action", async () => {
    await expect(caller.compliance.signatures.create({ subjectType: "visit_log", subjectId: "00000000-0000-4000-8000-000000000001", meaning: "authorship", intentStatement: "I attest this is accurate.", credential: "correct-horse-battery-staple", explicitSigningAction: false as true })).rejects.toThrow();
  });
});
