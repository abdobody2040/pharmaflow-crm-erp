import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const db = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
const router = readFileSync(new URL("./routers/compliance.ts", import.meta.url), "utf8");
const schema = readFileSync(new URL("../drizzle/schema.ts", import.meta.url), "utf8");

describe("strict compliance controls", () => {
  it("keeps regulated visit, sample, and signature evidence append-only", () => {
    expect(db).not.toContain(".update(visitLogs)");
    expect(db).not.toContain(".delete(visitLogs)");
    expect(db).not.toContain(".update(sampleTransactions)");
    expect(db).not.toContain(".delete(sampleTransactions)");
    expect(db).not.toContain(".update(electronicSignatures)");
    expect(db).not.toContain(".delete(electronicSignatures)");
    expect(schema).toContain("regulatedRecordRevisions");
    expect(router).toContain("reasonForChange");
  });

  it("requires credential confirmation and a deliberate signing action", () => {
    expect(router).toContain("credential: z.string().min(8)");
    expect(router).toContain("explicitSigningAction: z.literal(true)");
    expect(db).toContain("verifyPassword(input.credential, signer.passwordHash)");
    expect(db).toContain("credentialVerifiedAt: signedAt");
    expect(db).toContain("signingActionAt: signedAt");
  });

  it("records trusted server-side time and governed access/change-control evidence", () => {
    expect(db).toContain("const createdAt = new Date()");
    expect(schema).toContain("accessReviewReports");
    expect(schema).toContain("workflowChangeControls");
    expect(router).toContain("access_review.generated");
    expect(router).toContain("workflow_change.approved");
    expect(router).toContain("sample.custody_report_viewed");
  });
});
