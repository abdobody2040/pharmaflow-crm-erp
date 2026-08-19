import { createHash } from "crypto";
import { invokeLLM } from "../_core/llm";

export type AiProvider = "openai" | "anthropic" | "gemini" | "local" | "manus";
export type AiTask = "call_assist" | "next_best_action";
export type AiRoute = { provider: AiProvider; model: string };
export type AiPolicyRouteMap = Partial<Record<AiTask, AiRoute>>;
export type GatewayResult = { content: string; model: string; promptTokens?: number; completionTokens?: number };
export const hashAiPayload = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

const live = (value?: string) => !!value && !value.includes("development-placeholder") && !value.includes("example.invalid");
export function resolveAiRoute(policy: { dataSensitivity: "standard" | "sensitive"; defaultProvider: AiProvider; defaultModel: string; localModel: string | null; taskRoutes: unknown }, task: AiTask): AiRoute {
  const routes = (policy.taskRoutes ?? {}) as AiPolicyRouteMap; const configured = routes[task] ?? { provider: policy.defaultProvider, model: policy.defaultModel };
  if (policy.dataSensitivity === "sensitive") return { provider: "local", model: policy.localModel || configured.model || "qwen2.5-7b-instruct" };
  return configured;
}

function outputText(response: unknown): string { const value = response as { output_text?: string; choices?: Array<{ message?: { content?: string } }>; content?: Array<{ type?: string; text?: string }>; candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }; if (typeof value.output_text === "string") return value.output_text; if (typeof value.choices?.[0]?.message?.content === "string") return value.choices[0].message.content; const block = value.content?.find(item => item.type === "text"); if (block?.text) return block.text; const gemini = value.candidates?.[0]?.content?.parts?.find(part => typeof part.text === "string")?.text; if (gemini) return gemini; throw new Error("Provider returned no textual completion"); }

async function jsonFetch(url: string, init: RequestInit) { const response = await fetch(url, init); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(`AI provider returned ${response.status}: ${JSON.stringify(body).slice(0, 300)}`); return body; }

export async function invokeAiRoute(route: AiRoute, request: { system: string; input: string; schema: Record<string, unknown> }): Promise<GatewayResult> {
  const responseFormat = { type: "json_schema", json_schema: { name: "pharmaflow_call_assist", strict: true, schema: request.schema } } as const;
  if (route.provider === "manus") { const result = await invokeLLM({ model: route.model, messages: [{ role: "system", content: request.system }, { role: "user", content: request.input }], response_format: responseFormat }); return { content: outputText(result), model: result.model, promptTokens: result.usage?.prompt_tokens, completionTokens: result.usage?.completion_tokens }; }
  if (route.provider === "local") { const url = process.env.AI_LOCAL_MODEL_BASE_URL, key = process.env.AI_LOCAL_MODEL_API_KEY; if (!live(url)) throw new Error("Local AI model endpoint is not configured"); const result = await jsonFetch(`${url!.replace(/\/$/, "")}/v1/chat/completions`, { method: "POST", headers: { "Content-Type": "application/json", ...(live(key) ? { Authorization: `Bearer ${key}` } : {}) }, body: JSON.stringify({ model: route.model, messages: [{ role: "system", content: request.system }, { role: "user", content: request.input }], response_format: responseFormat }) }); return { content: outputText(result), model: route.model, promptTokens: result.usage?.prompt_tokens, completionTokens: result.usage?.completion_tokens }; }
  if (route.provider === "openai") { const key = process.env.OPENAI_API_KEY; if (!live(key)) throw new Error("OpenAI is not configured for this deployment"); const result = await jsonFetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify({ model: route.model, messages: [{ role: "system", content: request.system }, { role: "user", content: request.input }], response_format: responseFormat }) }); return { content: outputText(result), model: route.model, promptTokens: result.usage?.prompt_tokens, completionTokens: result.usage?.completion_tokens }; }
  if (route.provider === "anthropic") { const key = process.env.ANTHROPIC_API_KEY; if (!live(key)) throw new Error("Anthropic is not configured for this deployment"); const result = await jsonFetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": key!, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: route.model, max_tokens: 1600, system: `${request.system}\nReturn a JSON object that exactly matches the required schema.`, messages: [{ role: "user", content: request.input }] }) }); return { content: outputText(result), model: route.model, promptTokens: result.usage?.input_tokens, completionTokens: result.usage?.output_tokens }; }
  const key = process.env.GEMINI_API_KEY; if (!live(key)) throw new Error("Gemini is not configured for this deployment"); const result = await jsonFetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(route.model)}:generateContent`, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key! }, body: JSON.stringify({ systemInstruction: { parts: [{ text: request.system }] }, contents: [{ role: "user", parts: [{ text: request.input }] }], generationConfig: { responseMimeType: "application/json", responseJsonSchema: request.schema } }) }); return { content: outputText(result), model: route.model };
}
