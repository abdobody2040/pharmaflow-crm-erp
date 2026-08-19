import { describe, expect, it } from "vitest";
import SuperJSON from "superjson";
import { decodeTrpcResult, encodeTrpcInput } from "../mobile/src/transport";

describe("mobile API transport", () => {
  it("serializes date-bearing rep mutations into the SuperJSON tRPC envelope", () => {
    const body = JSON.parse(encodeTrpcInput({ capturedAt: new Date("2026-08-19T12:00:00Z"), nearPlannedStop: true }));
    const decoded = SuperJSON.deserialize(body.json) as { capturedAt: Date; nearPlannedStop: boolean };
    expect(decoded.capturedAt).toBeInstanceOf(Date);
    expect(decoded.nearPlannedStop).toBe(true);
  });
  it("parses a successful mobile tRPC response and surfaces server errors", () => {
    const payload = SuperJSON.serialize({ id: "shift-a", startedAt: new Date("2026-08-19T12:00:00Z") });
    expect(decodeTrpcResult<{ id: string }>({ result: { data: { json: payload } } })).toMatchObject({ id: "shift-a" });
    expect(() => decodeTrpcResult({ error: { json: { message: "Invalid credentials" } } })).toThrow("Invalid credentials");
  });
});
