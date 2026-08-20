import { describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({
  db: null as any,
  selectQueue: [] as any[][],
  updateQueue: [] as any[],
  procurement: [] as any[],
  orders: [] as any[],
  documents: [] as any[],
  notes: [] as any[],
  scorecards: [] as any[],
  audits: [] as any[],
  reset() {
    this.selectQueue = [];
    this.updateQueue = [];
    this.procurement = [];
    this.orders = [];
    this.documents = [];
    this.notes = [];
    this.scorecards = [];
    this.audits = [];
  },
}));

vi.mock("./db", () => ({
  getTenantById: async (id: string) => ({ id, status: "active" }),
  getDb: async () => harness.db,
  appendAuditEvent: async (event: any) => {
    harness.audits.push(event);
  },
}));

import {
  coachingScorecards,
  documentRecords,
  procurementRequests,
  purchaseOrders,
  visitCoachingNotes,
} from "../drizzle/schema";
import { appRouter } from "./routers";

const baseUser = {
  openId: "local:user",
  tenantId: "tenant-a",
  name: "Test User",
  email: "test@example.com",
  passwordHash: null,
  loginMethod: "local_jwt" as const,
  department: null,
  territory: null,
  hireDate: null,
  status: "active" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 1,
  lastSignedIn: new Date(),
};
const rep = {
  ...baseUser,
  id: 82,
  role: "rep" as const,
  openId: "local:rep",
  email: "rep@tenant-a.example",
};
const manager = {
  ...baseUser,
  id: 21,
  role: "manager" as const,
  openId: "local:manager",
  email: "manager@tenant-a.example",
};

function caller(user: typeof rep | typeof manager) {
  return appRouter.createCaller({
    user,
    req: { headers: {} } as any,
    res: {} as any,
  });
}

harness.db = {
  select: () => ({
    from: (_table: unknown) => ({
      where: () => ({
        limit: async () => harness.selectQueue.shift() ?? [],
        orderBy: async () => harness.selectQueue.shift() ?? [],
      }),
    }),
  }),
  insert: (table: unknown) => ({
    values: async (value: any) => {
      if (table === procurementRequests) harness.procurement.push(value);
      if (table === purchaseOrders) harness.orders.push(value);
      if (table === documentRecords) harness.documents.push(value);
      if (table === visitCoachingNotes) harness.notes.push(value);
      if (table === coachingScorecards) harness.scorecards.push(value);
    },
  }),
  update: (_table: unknown) => ({
    set: (values: any) => ({
      where: async () => {
        const target = harness.updateQueue.shift();
        if (target) Object.assign(target, values);
      },
    }),
  }),
};

describe("local workflow end-to-end evidence", () => {
  it("takes a procurement request from representative submission through manager approval to an immutable purchase order", async () => {
    harness.reset();
    const request = await caller(rep).expansion.procurement.submit({
      productName: "Field sample pack",
      sku: "SMP-001",
      requestedQuantity: 24,
      rationale: "Replenish approved field stock",
    });
    const stored = harness.procurement[0];
    expect(stored.id).toBe(request.id);
    expect(stored.status).toBeUndefined(); // database default is submitted; the workflow guard reads the persisted default below.
    const persisted = { ...stored, status: "submitted" };
    harness.selectQueue.push([persisted], [persisted]);
    harness.updateQueue.push(persisted, persisted);
    await caller(manager).expansion.procurement.review({
      id: request.id,
      status: "approved",
      note: "Approved against replenishment policy",
    });
    expect(persisted.status).toBe("approved");
    const order = await caller(manager).expansion.procurement.createOrder({
      requestId: request.id,
      supplierName: "Approved Supplier",
      orderedQuantity: 24,
      unitCost: 18.5,
      currency: "USD",
    });
    expect(harness.orders).toHaveLength(1);
    expect(harness.orders[0]).toMatchObject({
      id: order.id,
      requestId: request.id,
      tenantId: "tenant-a",
      currency: "USD",
    });
    expect(persisted.status).toBe("ordered");
    expect(harness.audits.map(event => event.eventType)).toEqual(
      expect.arrayContaining([
        "procurement.submitted",
        "procurement.approved",
        "procurement.order_issued",
      ])
    );
  });

  it("allows the assigned representative to acknowledge both coaching feedback and a scorecard", async () => {
    harness.reset();
    const note = {
      id: "00000000-0000-4000-8000-000000000101",
      tenantId: "tenant-a",
      repUserId: 82,
      acknowledgementStatus: "pending",
    };
    const scorecard = {
      id: "00000000-0000-4000-8000-000000000102",
      tenantId: "tenant-a",
      repUserId: 82,
      acknowledgementStatus: "pending",
    };
    harness.selectQueue.push([note], [scorecard]);
    harness.updateQueue.push(note, scorecard);
    await caller(rep).expansion.coaching.acknowledge({ id: note.id });
    await caller(rep).expansion.coaching.scorecards.acknowledge({
      id: scorecard.id,
    });
    expect(note).toMatchObject({ acknowledgementStatus: "acknowledged" });
    expect(scorecard).toMatchObject({ acknowledgementStatus: "acknowledged" });
    expect(harness.audits.map(event => event.eventType)).toEqual(
      expect.arrayContaining([
        "coaching.acknowledged",
        "coaching.scorecard_acknowledged",
      ])
    );
  });

  it("retains the initial document version, creates a successor, and activates the new version with auditable state changes", async () => {
    harness.reset();
    harness.selectQueue.push([]);
    const initial = await caller(manager).documents.register({
      documentNumber: "QMS-100",
      title: "Field SOP",
      fileKey: "tenant/docs/qms-100-v1.pdf",
      fileName: "qms-100-v1.pdf",
      mimeType: "application/pdf",
      classification: "quality",
      retentionDate: new Date("2030-01-01T00:00:00Z"),
      activateNow: true,
    });
    const v1 = harness.documents[0];
    expect(v1).toMatchObject({ id: initial.id, version: 1, status: "active" });
    harness.selectQueue.push([v1]);
    const successor = await caller(manager).documents.createVersion({
      previousVersionId: initial.id,
      title: "Field SOP revised",
      fileKey: "tenant/docs/qms-100-v2.pdf",
      fileName: "qms-100-v2.pdf",
      mimeType: "application/pdf",
      classification: "quality",
      retentionDate: new Date("2030-01-01T00:00:00Z"),
      activateNow: false,
    });
    const v2 = harness.documents[1];
    expect(v2).toMatchObject({
      id: successor.id,
      documentNumber: "QMS-100",
      previousVersionId: initial.id,
      version: 2,
      status: "draft",
    });
    harness.selectQueue.push([v2]);
    harness.updateQueue.push(v1, v2);
    await caller(manager).documents.activate({
      id: successor.id,
      reason: "Document controller approved revised SOP",
    });
    expect(v1.status).toBe("superseded");
    expect(v2.status).toBe("active");
    expect(harness.audits.map(event => event.eventType)).toEqual(
      expect.arrayContaining([
        "documents.registered",
        "documents.version_created",
        "documents.activated",
      ])
    );
  });
});
