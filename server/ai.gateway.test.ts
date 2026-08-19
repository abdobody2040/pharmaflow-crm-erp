import { describe, expect, it } from "vitest";
import { resolveAiRoute } from "./services/aiGateway";
import { rankNextBestActions } from "./services/nextBestAction";
import { parseCallAssistDraft } from "./services/callAssist";

describe("AI gateway policy routing", () => {
  it("forces sensitive tenants to the configured local model even when a legacy hosted route exists", () => {
    const route = resolveAiRoute({ dataSensitivity: "sensitive", defaultProvider: "openai", defaultModel: "gpt-5-mini", localModel: "Qwen/Qwen2.5-7B-Instruct", taskRoutes: { call_assist: { provider: "anthropic", model: "claude-haiku" } } } as any, "call_assist");
    expect(route).toEqual({ provider: "local", model: "Qwen/Qwen2.5-7B-Instruct" });
  });

  it("honors explicit private-local and customer-key hosted task routes for a standard tenant", () => {
    const local = resolveAiRoute({ dataSensitivity: "standard", defaultProvider: "manus", defaultModel: "gpt-5-mini", localModel: "Qwen/Qwen2.5-7B-Instruct", taskRoutes: { call_assist: { provider: "local", model: "Qwen/Qwen2.5-7B-Instruct" } } }, "call_assist");
    const legacy = resolveAiRoute({ dataSensitivity: "standard", defaultProvider: "manus", defaultModel: "gpt-5-mini", localModel: null, taskRoutes: { call_assist: { provider: "gemini", model: "gemini-3-flash-preview" } } } as any, "call_assist");
    expect(local).toEqual({ provider: "local", model: "Qwen/Qwen2.5-7B-Instruct" }); expect(legacy).toEqual({ provider: "gemini", model: "gemini-3-flash-preview" });
  });
});

describe("next-best-action scoring", () => {
  it("ranks account recency, tier, and available commercial evidence with explainable components", () => {
    const now = new Date("2026-08-19T00:00:00.000Z");
    const actions = rankNextBestActions([
      { accountId: "a", accountName: "Alpha Health", tier: "a", lastVisitAt: new Date("2026-08-17T00:00:00.000Z"), salesSignal: 10 },
      { accountId: "b", accountName: "Beta Care", tier: "b", lastVisitAt: new Date("2026-05-01T00:00:00.000Z"), prescribingSignal: 100 },
    ], now);
    expect(actions[0]?.accountId).toBe("b");
    expect(actions[0]?.reasonComponents).toMatchObject({ hasCommercialSignal: true, commercial: 20 });
    expect(actions[0]?.recommendation).toContain("days since the last recorded visit");
  });
});

describe("call-assist structured output", () => {
  it("accepts only the complete typed visit draft shape", () => {
    expect(parseCallAssistDraft(JSON.stringify({ objective: "Review therapy options", productsDiscussed: ["Product A"], samplesGiven: [], nextSteps: "Send follow-up", confidence: 82 }))).toMatchObject({ confidence: 82, productsDiscussed: ["Product A"] });
    expect(() => parseCallAssistDraft(JSON.stringify({ objective: "Incomplete", productsDiscussed: [], nextSteps: "", confidence: 120 }))).toThrow();
  });
});
