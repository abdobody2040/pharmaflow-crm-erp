import { afterEach, describe, expect, it, vi } from "vitest";
import { invokeAiRoute } from "./services/aiGateway";

const request = { system: "Return JSON only", input: "Structure this note", schema: { type: "object", properties: {} } };
const response = (body: unknown) => ({ ok: true, json: async () => body });

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("customer-key AI provider adapters", () => {
  it("uses the configured OpenAI key only in the provider authorization header", async () => {
    vi.stubEnv("OPENAI_API_KEY", "customer-openai-key"); const fetchMock = vi.fn(async () => response({ choices: [{ message: { content: "{\"objective\":\"OpenAI\"}" } }], usage: { prompt_tokens: 3, completion_tokens: 2 } })); vi.stubGlobal("fetch", fetchMock);
    await expect(invokeAiRoute({ provider: "openai", model: "gpt-4.1-mini" }, request)).resolves.toMatchObject({ model: "gpt-4.1-mini", content: "{\"objective\":\"OpenAI\"}" });
    expect(fetchMock).toHaveBeenCalledWith("https://api.openai.com/v1/chat/completions", expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer customer-openai-key" }) }));
  });

  it("uses the configured Anthropic key and extracts text blocks", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "customer-anthropic-key"); const fetchMock = vi.fn(async () => response({ content: [{ type: "text", text: "{\"objective\":\"Claude\"}" }], usage: { input_tokens: 4, output_tokens: 2 } })); vi.stubGlobal("fetch", fetchMock);
    await expect(invokeAiRoute({ provider: "anthropic", model: "claude-3-5-haiku-latest" }, request)).resolves.toMatchObject({ content: "{\"objective\":\"Claude\"}" });
    expect(fetchMock).toHaveBeenCalledWith("https://api.anthropic.com/v1/messages", expect.objectContaining({ headers: expect.objectContaining({ "x-api-key": "customer-anthropic-key" }) }));
  });

  it("uses the configured Gemini key and extracts candidate text", async () => {
    vi.stubEnv("GEMINI_API_KEY", "customer-gemini-key"); const fetchMock = vi.fn(async () => response({ candidates: [{ content: { parts: [{ text: "{\"objective\":\"Gemini\"}" }] } }] })); vi.stubGlobal("fetch", fetchMock);
    await expect(invokeAiRoute({ provider: "gemini", model: "gemini-2.5-flash" }, request)).resolves.toMatchObject({ content: "{\"objective\":\"Gemini\"}" });
    expect(fetchMock.mock.calls[0][0]).toContain("models/gemini-2.5-flash:generateContent"); expect(fetchMock.mock.calls[0][1].headers["x-goog-api-key"]).toBe("customer-gemini-key");
  });

  it("uses a customer private endpoint for the local model route", async () => {
    vi.stubEnv("AI_LOCAL_MODEL_BASE_URL", "https://inference.customer.example"); vi.stubEnv("AI_LOCAL_MODEL_API_KEY", "customer-local-key"); const fetchMock = vi.fn(async () => response({ choices: [{ message: { content: "{\"objective\":\"Local\"}" } }] })); vi.stubGlobal("fetch", fetchMock);
    await expect(invokeAiRoute({ provider: "local", model: "Qwen/Qwen2.5-7B-Instruct" }, request)).resolves.toMatchObject({ model: "Qwen/Qwen2.5-7B-Instruct" });
    expect(fetchMock).toHaveBeenCalledWith("https://inference.customer.example/v1/chat/completions", expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer customer-local-key" }) }));
  });
});
