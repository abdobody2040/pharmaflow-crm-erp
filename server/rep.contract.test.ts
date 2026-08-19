import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { appRouter } from "./routers";
import { cadenceFor } from "./routers/rep";

describe("rep offline and telemetry contract", () => {
  it("uses the approved active-shift cadence policy", () => {
    expect(cadenceFor(false)).toBe(60);
    expect(cadenceFor(true)).toBe(15);
  });

  it("exposes only scoped rep workflows and no destructive location procedures", () => {
    const paths = Object.keys((appRouter as any)._def.procedures);
    expect(paths).toContain("rep.shift.start");
    expect(paths).toContain("rep.shift.stop");
    expect(paths).toContain("rep.location");
    expect(paths).toContain("rep.syncVisit");
    expect(paths.some(path => /^rep\.location\.(update|delete|remove)/.test(path))).toBe(false);
  });

  it("keeps idempotent sync and immutable audit routing in every rep write path", () => {
    const source = readFileSync(new URL("./routers/rep.ts", import.meta.url), "utf8");
    expect(source).toContain("await recordSync(scope, input.clientMutationId, \"location\"");
    expect(source).toContain("await recordSync(scope, input.clientMutationId, \"visit\"");
    expect(source).toContain("await recordSync(scope, input.clientMutationId, \"sample\"");
    expect(source.match(/appendAuditEvent/g)?.length).toBeGreaterThanOrEqual(4);
  });
});
