import { beforeEach, describe, expect, it, vi } from "vitest";

const values = vi.fn(async () => undefined); const audit = vi.fn(async () => undefined);
const db = { select: vi.fn(), insert: vi.fn(() => ({ values })) };
const rows = (result: unknown[]) => ({ from: vi.fn(() => ({ where: vi.fn(async () => result) })) });

vi.mock("./db", () => ({ getDb: async () => db, getTenantById: async (id: string) => ({ id, status: "active" }), appendAuditEvent: audit, createVisit: vi.fn(), findLocalUser: vi.fn(), getUserByOpenId: vi.fn(), upsertUser: vi.fn() }));

const rep = { id: 12, openId: "local:rep", tenantId: "tenant-a", name: "Rep", email: "rep@example.com", passwordHash: null, loginMethod: "local_jwt", role: "rep" as const, department: null, territory: null, hireDate: null, status: "active" as const, createdAt: new Date(), updatedAt: new Date(), createdBy: 1, lastSignedIn: new Date() };
const tenantBRep = { ...rep, id: 22, tenantId: "tenant-b", openId: "local:tenant-b-rep", email: "tenant-b-rep@example.com" };

describe("AI next-best-action procedure", () => {
  beforeEach(() => { db.select.mockReset(); db.insert.mockClear(); values.mockClear(); audit.mockClear(); });
  it("persists only the active tenant call-plan account as an explainable snapshot and appends evidence", async () => {
    db.select.mockImplementationOnce(() => rows([{ id: "account-a", name: "Alpha Health", tier: "a", status: "active" }, { id: "account-b", name: "Tenant-B Account", tier: "a", status: "active" }]))
      .mockImplementationOnce(() => rows([{ accountId: "account-a", occurredAt: new Date("2026-05-01") }]))
      .mockImplementationOnce(() => rows([{ accountId: "account-a", signalType: "sales", value: "200.00" }]))
      .mockImplementationOnce(() => rows([{ accountId: "account-a", status: "planned" }]));
    const { appRouter } = await import("./routers"); const caller = appRouter.createCaller({ user: rep, req: { headers: {} } as any, res: {} as any });
    const actions = await caller.ai.nextBestAction.generate();
    expect(actions).toHaveLength(1); expect(actions[0]).toMatchObject({ accountId: "account-a", reasonComponents: { hasCommercialSignal: true } });
    expect(values).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ tenantId: "tenant-a", repUserId: 12, accountId: "account-a", rank: 1 })]));
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ tenantId: "tenant-a", actorUserId: 12, eventType: "ai.next_best_action_generated", newValue: expect.objectContaining({ constrainedToCallPlan: true, count: 1 }) }));
  });
  it("creates next-best-action evidence only under a tenant-B caller scope", async () => {
    db.select.mockImplementationOnce(() => rows([{ id: "account-b", name: "Beta Health", tier: "b", status: "active" }]))
      .mockImplementationOnce(() => rows([])).mockImplementationOnce(() => rows([])).mockImplementationOnce(() => rows([{ accountId: "account-b", status: "planned" }]));
    const { appRouter } = await import("./routers"); const caller = appRouter.createCaller({ user: tenantBRep, req: { headers: {} } as any, res: {} as any });
    await expect(caller.ai.nextBestAction.generate()).resolves.toHaveLength(1);
    expect(values).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ tenantId: "tenant-b", repUserId: 22, accountId: "account-b" })]));
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ tenantId: "tenant-b", actorUserId: 22 }));
    expect(values).not.toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ tenantId: "tenant-a" })]));
  });
  it("lists only the active tenant-B rep evidence when a cross-tenant rep identifier is supplied", async () => {
    const tenantBAction = { id: "nba-b", tenantId: "tenant-b", repUserId: 22, accountId: "account-b", rank: 1, score: 80, recommendation: "Prioritize Beta Health", reasonComponents: {}, status: "generated" };
    db.select.mockImplementationOnce(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ orderBy: vi.fn(async () => [tenantBAction]) })) })) }));
    const { appRouter } = await import("./routers"); const caller = appRouter.createCaller({ user: tenantBRep, req: { headers: {} } as any, res: {} as any });
    await expect(caller.ai.nextBestAction.list({ repUserId: 12 })).resolves.toEqual([tenantBAction]);
  });
});
