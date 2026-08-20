import { describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ getTenantById: async (id: string) => ({ id, status: "active" }), getDb: async () => null, appendAuditEvent: vi.fn() }));
import { appRouter } from "./routers";

const rep = { id: 82, openId: "local:rep", tenantId: "tenant-a", name: "Rep", email: "rep@tenant-a.example", passwordHash: null, loginMethod: "local_jwt", role: "rep" as const, department: null, territory: null, hireDate: null, status: "active" as const, createdAt: new Date(), updatedAt: new Date(), createdBy: 1, lastSignedIn: new Date() };

describe("document register authorization", () => {
  it("blocks a representative from registering, versioning, activating, or archiving document records", async () => {
    const caller = appRouter.createCaller({ user: rep, req: { headers: {} } as any, res: {} as any });
    const id = "00000000-0000-4000-8000-000000000001";
    await expect(caller.documents.register({ documentNumber: "QMS-001", title: "Quality policy", fileKey: "tenant-a/docs/quality-policy.pdf", fileName: "quality-policy.pdf", mimeType: "application/pdf", classification: "quality", retentionDate: new Date("2032-01-01") })).rejects.toThrow("not authorized");
    await expect(caller.documents.createVersion({ previousVersionId: id, title: "Quality policy v2", fileKey: "tenant-a/docs/quality-policy-v2.pdf", fileName: "quality-policy-v2.pdf", mimeType: "application/pdf", classification: "quality", retentionDate: new Date("2032-01-01") })).rejects.toThrow("not authorized");
    await expect(caller.documents.activate({ id, reason: "Approved policy release" })).rejects.toThrow("not authorized");
    await expect(caller.documents.archive({ id, reason: "Retention period ended" })).rejects.toThrow("not authorized");
  });
});
