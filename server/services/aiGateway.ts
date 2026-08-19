import { createHash } from "crypto";
import { invokeLLM } from "../_core/llm";

export type AiProvider = "local" | "manus";
export type AiTask = "call_assist" | "next_best_action";
export type AiRoute = { provider: AiProvider; model: string };
export type AiPolicyRouteMap = Partial<Record<AiTask, AiRoute>>;
export type GatewayResult = { content: string; model: string; promptTokens?: number; completionTokens?: number };
export const hashAiPayload = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

const live = (value?: string) => !!value && !value.includes("development-placeholder") && !value.includes("example.invalid");
export function resolveAiRoute(policy: { dataSensitivity: "standard" | "sensitive"; defaultProvider: AiProvider | string; defaultModel: string; localModel: string | null; taskRoutes: unknown }, task: AiTask): AiRoute {
  const routes = (policy.taskRoutes ?? {}) as AiPolicyRouteMap; const configured = routes[task] ?? { provider: policy.defaultProvider === "local" ? "local" : "manus", model: policy.defaultModel };
  if (policy.dataSensitivity === "sensitive") return { provider: "local", model: policy.localModel || configured.model || "qwen2.5-7b-instruct" };
  return configured.provider === "local" ? configured : { provider: "manus", model: configured.model };
}

function outputText(response: unknown): string { const value = response as { output_text?: string; choices?: Array<{ message?: { content?: string } }>; content?: Array<{ type?: string; text?: string }> }; if (typeof value.output_text === "string") return value.output_text; if (typeof value.choices?.[0]?.message?.content === "string") return value.choices[0].message.content; const block = value.content?.find(item => item.type === "text"); if (block?.text) return block.text; throw new Error("Provider returned no textual completion"); }

async function jsonFetch(url: string, init: RequestInit) { const response = await fetch(url, init); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(`AI provider returned ${response.status}: ${JSON.stringify(body).slice(0, 300)}`); return body; }

export async function invokeAiRoute(route: AiRoute, request: { system: string; input: string; schema: Record<string, unknown> }): Promise<GatewayResult> {
  const responseFormat = { type: "json_schema", json_schema: { name: "pharmaflow_call_assist", strict: true, schema: request.schema } } as const;
  if (route.provider === "manus") { const result = await invokeLLM({ model: route.model, messages: [{ role: "system", content: request.system }, { role: "user", content: request.input }], response_format: responseFormat }); return { content: outputText(result), model: result.model, promptTokens: result.usage?.prompt_tokens, completionTokens: result.usage?.completion_tokens }; }
  if (route.provider === "local") { const url = process.env.AI_LOCAL_MODEL_BASE_URL, key = process.env.AI_LOCAL_MODEL_API_KEY; if (!live(url)) throw new Error("Local AI model endpoint is not configured"); const result = await jsonFetch(`${url!.replace(/\/$/, "")}/v1/chat/completions`, { method: "POST", headers: { "Content-Type": "application/json", ...(live(key) ? { Authorization: `Bearer ${key}` } : {}) }, body: JSON.stringify({ model: route.model, messages: [{ role: "system", content: request.system }, { role: "user", content: request.input }], response_format: responseFormat }) }); return { content: outputText(result), model: route.model, promptTokens: result.usage?.prompt_tokens, completionTokens: result.usage?.completion_tokens }; }
  throw new Error("Hosted provider APIs are not activated in this AI Layer scope. Select the built-in or private local-model route.");
}
