import { describe, expect, it, vi } from "vitest";

let queryRows: unknown[][] = [];
const audit = vi.fn(async () => undefined); const inserted = vi.fn(async () => undefined); const updated = vi.fn(async () => undefined);
function terminal(rows: unknown[]) { return { limit: vi.fn(async () => rows), then: (resolve: (value: unknown[]) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve(rows).then(resolve, reject) }; }
const db = { select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => terminal(queryRows.shift() ?? [])), innerJoin: vi.fn(() => ({ where: vi.fn(() => terminal(queryRows.shift() ?? [])) })) })) })), insert: vi.fn(() => ({ values: inserted })), update: vi.fn(() => ({ set: vi.fn(() => ({ where: updated })) })) };

vi.mock("./db", () => ({ getDb: async () => db, getTenantById: async () => ({ id: "tenant-a", status: "active" }), appendAuditEvent: audit, createVisit: vi.fn(), findLocalUser: vi.fn(), getUserByOpenId: vi.fn(), upsertUser: vi.fn() }));
vi.mock("./services/campaignDelivery", () => ({ channelConfiguration: () => ({ configured: true, missing: [] }), dispatchCampaignDelivery: vi.fn(async () => ({ status: "sent", providerMessageId: "provider-1" })) }));

const manager = { id: 8, openId: "local:manager", tenantId: "tenant-a", name: "Manager", email: "manager@example.com", passwordHash: null, loginMethod: "local_jwt", role: "manager" as const, department: null, territory: null, hireDate: null, status: "active" as const, createdAt: new Date(), updatedAt: new Date(), createdBy: 1, lastSignedIn: new Date() };
const rep = { ...manager, id: 44, openId: "local:rep", role: "rep" as const };
const id = "bc490c50-8d50-4ec8-9a57-dc57ebaf1c01";
const caller = async (user = manager) => (await import("./routers")).appRouter.createCaller({ user, req: { headers: {} } as any, res: {} as any });
const reset = (rows: unknown[][]) => { queryRows = rows; inserted.mockClear(); updated.mockClear(); audit.mockClear(); };

describe("marketing workflow procedures", () => {
  it("approves a draft content item through a tenant-scoped status transition", async () => {
    reset([[{ id, tenantId: "tenant-a", status: "draft" }]]);
    await expect((await caller()).marketing.content.review({ id, status: "approved", note: "Medical approved" })).resolves.toEqual({ success: true });
    expect(updated).toHaveBeenCalled(); expect(audit).toHaveBeenCalledWith(expect.objectContaining({ entityType: "approved_content", eventType: "content.approved", operation: "status_change" }));
  });

  it("stages eligible contacts once for an approved campaign", async () => {
    reset([[{ id, tenantId: "tenant-a", status: "approved", segmentId: null, channel: "email", subject: "Update", messageBody: "Approved message", whatsappTemplateName: null, contentId: null }], [{ contactId: id, accountId: "cc490c50-8d50-4ec8-9a57-dc57ebaf1c01", email: "hcp@example.com", phone: null }], []]);
    await expect((await caller()).marketing.campaigns.queue({ id })).resolves.toEqual({ queued: 1, skippedExisting: 0 });
    expect(inserted).toHaveBeenCalled(); expect(audit).toHaveBeenCalledWith(expect.objectContaining({ eventType: "campaign.queued", operation: "status_change" }));
  });

  it("dispatches staged deliveries and writes immutable presentation evidence", async () => {
    reset([[{ id, tenantId: "tenant-a", status: "queued", channel: "email" }], [{ id: "dc490c50-8d50-4ec8-9a57-dc57ebaf1c01", recipient: "hcp@example.com", payloadSnapshot: { subject: "Update", messageBody: "Approved message" } }]]);
    await expect((await caller()).marketing.campaigns.dispatch({ id })).resolves.toEqual({ sent: 1, failed: 0 });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ eventType: "campaign.dispatched", operation: "status_change" }));
    reset([[{ id, tenantId: "tenant-a", status: "approved" }], [{ id: "cc490c50-8d50-4ec8-9a57-dc57ebaf1c01", tenantId: "tenant-a" }]]);
    await expect((await caller(rep)).marketing.usage.record({ contentId: id, accountId: "cc490c50-8d50-4ec8-9a57-dc57ebaf1c01", eventType: "presented", occurredAt: new Date() })).resolves.toMatchObject({ id: expect.any(String) });
    expect(inserted).toHaveBeenCalled(); expect(audit).toHaveBeenCalledWith(expect.objectContaining({ entityType: "content_usage_event", eventType: "content.presented", operation: "create" }));
  });
});
