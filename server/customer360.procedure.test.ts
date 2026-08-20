import { describe, expect, it, vi } from "vitest";

let queryResults: unknown[][] = [];
function queryChain(rows: unknown[]) { const ordered = { limit: vi.fn(async () => rows), then: (resolve: (value: unknown[]) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve(rows).then(resolve, reject) }; return { limit: vi.fn(async () => rows), orderBy: vi.fn(() => ordered), then: (resolve: (value: unknown[]) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve(rows).then(resolve, reject) }; }
const db = { select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => queryChain(queryResults.shift() ?? [])) })) })) };
vi.mock("./db", () => ({ getDb: async () => db, getTenantById: async () => ({ id: "tenant-a", status: "active" }), appendAuditEvent: vi.fn() }));
const user = { id: 44, openId: "local:rep", tenantId: "tenant-a", name: "Rep", email: "rep@tenant-a.example", passwordHash: null, loginMethod: "local_jwt", role: "rep" as const, department: null, territory: null, hireDate: null, status: "active" as const, createdAt: new Date(), updatedAt: new Date(), createdBy: 1, lastSignedIn: new Date() };
const manager = { ...user, id: 8, openId: "local:manager", email: "manager@tenant-a.example", role: "manager" as const };
const accountId = "ec490c50-8d50-4ec8-9a57-dc57ebaf1c01";

describe("Customer 360 procedures", () => {
  it("aggregates only the active tenant account sources into one Customer 360 response", async () => {
    queryResults = [[{ id: accountId, tenantId: "tenant-a", name: "Dr One" }], [{ id: "contact-a", tenantId: "tenant-a" }], [{ id: "affiliation-a", tenantId: "tenant-a", sourceAccountId: accountId, targetAccountId: "dc490c50-8d50-4ec8-9a57-dc57ebaf1c01", status: "active" }], [{ id: "visit-a", tenantId: "tenant-a" }], [{ id: "planned-a", tenantId: "tenant-a" }], [{ id: "opportunity-a", tenantId: "tenant-a" }], [{ id: "signal-a", tenantId: "tenant-a" }], [{ id: "dc490c50-8d50-4ec8-9a57-dc57ebaf1c01", tenantId: "tenant-a", name: "Hospital One" }]];
    const { appRouter } = await import("./routers"); const caller = appRouter.createCaller({ user, req: { headers: {} } as any, res: {} as any });
    const result = await caller.crm.account360({ accountId });
    expect(result).toMatchObject({ account: { id: accountId, tenantId: "tenant-a" }, contacts: [{ id: "contact-a", tenantId: "tenant-a" }], recentVisits: [{ id: "visit-a", tenantId: "tenant-a" }], plannedActivity: [{ id: "planned-a", tenantId: "tenant-a" }], opportunities: [{ id: "opportunity-a", tenantId: "tenant-a" }], commercialSignals: [{ id: "signal-a", tenantId: "tenant-a" }] });
    expect(result.affiliations[0]?.relatedAccount).toMatchObject({ id: "dc490c50-8d50-4ec8-9a57-dc57ebaf1c01", tenantId: "tenant-a" });
  });
  it("rejects self-affiliations before a database mutation", async () => {
    const { appRouter } = await import("./routers"); const caller = appRouter.createCaller({ user: manager, req: { headers: {} } as any, res: {} as any });
    await expect(caller.crm.affiliations.create({ sourceAccountId: accountId, targetAccountId: accountId, relationshipType: "affiliated_with" })).rejects.toThrow("cannot be affiliated with itself");
  });
});
