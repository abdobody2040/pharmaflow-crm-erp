import { describe, expect, it, vi } from "vitest";
import { createSignature } from "./db";

describe("positive electronic-signature evidence", () => {
  it("confirms valid credentials, binds the signed record to a hash and server timestamp, and appends audit evidence", async () => {
    const inserted: any[] = [];
    const appendAudit = vi.fn(async () => undefined);
    const database = { insert: vi.fn(() => ({ values: vi.fn(async (value: unknown) => { inserted.push(value); }) })) };
    const result = await createSignature(
      { tenantId: "tenant-a", userId: 91, role: "rep" } as any,
      { subjectType: "visit_log", subjectId: "00000000-0000-4000-8000-000000000001", meaning: "authorship", intentStatement: "I confirm this visit record is accurate.", credential: "correct-password", explicitSigningAction: true },
      { db: database, signer: { passwordHash: "stored-valid-hash" }, verifyCredential: async credential => credential === "correct-password", appendAudit },
    );
    expect(result.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(result.recordBindingHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.signedAt).toBeInstanceOf(Date);
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({ tenantId: "tenant-a", signerUserId: 91, subjectId: "00000000-0000-4000-8000-000000000001", signatureTokenHash: result.recordBindingHash, signedAt: result.signedAt, credentialVerifiedAt: result.signedAt, signingActionAt: result.signedAt });
    expect(appendAudit).toHaveBeenCalledWith(expect.objectContaining({ tenantId: "tenant-a", actorUserId: 91, entityType: "electronic_signature", entityId: result.id, eventType: "signature.recorded", operation: "create" }));
  });
});
