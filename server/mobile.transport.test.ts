import { beforeEach, describe, expect, it, vi } from "vitest";
import SuperJSON from "superjson";
import { decodeTrpcResult, encodeTrpcInput } from "../mobile/src/transport";

vi.mock("../mobile/src/session", () => ({ writeMobileSession: vi.fn() }));

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
  it("uses the protected query and mutation shapes for approved content and presentation evidence", async () => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock); const { getApprovedContent, recordMobileContentUsage } = await import("../mobile/src/api");
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ result: { data: { json: SuperJSON.serialize([{ id: "content-a", title: "Approved aid", description: null, contentType: "html", body: "Approved", assetUrl: null, version: "1.0" }]) } } }) });
    await expect(getApprovedContent("https://pharma.example", "jwt")).resolves.toMatchObject([{ id: "content-a", title: "Approved aid" }]);
    expect(fetchMock.mock.calls[0][0]).toContain("/api/trpc/marketing.content.list?input="); expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer jwt");
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ result: { data: { json: SuperJSON.serialize({ id: "event-a" }) } } }) });
    await expect(recordMobileContentUsage("https://pharma.example", "jwt", { contentId: "content-a", accountId: "account-a", plannedVisitId: "visit-a" })).resolves.toEqual({ id: "event-a" });
    const body = JSON.parse(fetchMock.mock.calls[1][1].body); const payload = SuperJSON.deserialize(body.json) as { eventType: string; occurredAt: Date; accountId: string; plannedVisitId: string };
    expect(fetchMock.mock.calls[1][0]).toBe("https://pharma.example/api/trpc/marketing.usage.record"); expect(payload).toMatchObject({ eventType: "presented", accountId: "account-a", plannedVisitId: "visit-a" }); expect(payload.occurredAt).toBeInstanceOf(Date);
  });
  it("uses protected AI priority and call-assist transport shapes on mobile", async () => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock); const { getMobileNextBestActions, structureMobileCallNote } = await import("../mobile/src/api");
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ result: { data: { json: SuperJSON.serialize([{ id: "nba-a", accountId: "account-a", score: 81, recommendation: "Prioritize account", reasonComponents: { daysSinceVisit: 35, hasCommercialSignal: true } }]) } } }) });
    await expect(getMobileNextBestActions("https://pharma.example", "jwt")).resolves.toMatchObject([{ id: "nba-a", score: 81 }]);
    expect(fetchMock.mock.calls[0][0]).toContain("/api/trpc/ai.nextBestAction.list?input="); expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer jwt");
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ result: { data: { json: SuperJSON.serialize({ id: "draft-a", draft: { objective: "Visit", productsDiscussed: [], nextSteps: "Follow up", confidence: 74 } }) } } }) });
    await expect(structureMobileCallNote("https://pharma.example", "jwt", { note: "Freeform field note", accountId: "account-a" })).resolves.toMatchObject({ id: "draft-a" });
    const body = JSON.parse(fetchMock.mock.calls[1][1].body); const payload = SuperJSON.deserialize(body.json) as { note: string; accountId: string };
    expect(fetchMock.mock.calls[1][0]).toBe("https://pharma.example/api/trpc/ai.callAssist.generate"); expect(payload).toEqual({ note: "Freeform field note", accountId: "account-a" });
  });
});
