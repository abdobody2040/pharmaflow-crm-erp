import { writeMobileSession, type MobileSession } from "./session";
import { decodeTrpcResult, encodeTrpcInput, type TrpcEnvelope } from "./transport";

async function mutation<T>(apiBaseUrl: string, path: string, input: unknown, token?: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/api/trpc/${path}`, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: encodeTrpcInput(input) });
  const envelope = await response.json() as TrpcEnvelope<unknown>; if (!response.ok || envelope.error) throw new Error(envelope.error?.json?.message ?? "Request failed");
  return decodeTrpcResult<T>(envelope);
}

async function query<T>(apiBaseUrl: string, path: string, input: unknown, token?: string): Promise<T> {
  const url = `${apiBaseUrl.replace(/\/$/, "")}/api/trpc/${path}?input=${encodeURIComponent(encodeTrpcInput(input))}`;
  const response = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const envelope = await response.json() as TrpcEnvelope<unknown>;
  if (!response.ok || envelope.error) throw new Error(envelope.error?.json?.message ?? "Request failed");
  return decodeTrpcResult<T>(envelope);
}

export async function mobileSignIn(apiBaseUrl: string, email: string, password: string, tenantSlug?: string) {
  return mutation<{ token: string; user: { id: number; tenantId: string | null } }>(apiBaseUrl, "auth.localLogin", { email, password, tenantSlug: tenantSlug || undefined });
}

export async function beginShiftSession(apiBaseUrl: string, accessToken: string, plannedStops: Array<{ latitude: number; longitude: number }> = []): Promise<MobileSession> {
  const consent = await mutation<{ id: string }>(apiBaseUrl, "rep.shift.consent", { policyVersion: "rep-location-v1", retentionDays: 90 }, accessToken);
  const shift = await mutation<{ id: string }>(apiBaseUrl, "rep.shift.start", { consentId: consent.id }, accessToken);
  const route = await mutation<{ stops: Array<{ latitude: number; longitude: number; accountName: string; sequence: number }> }>(apiBaseUrl, "routing.mobileDaily", { date: new Date() }, accessToken);
  const session = { shiftId: shift.id, accessToken, apiBaseUrl, plannedStops: route.stops.length ? route.stops : plannedStops.map((stop, index) => ({ ...stop, accountName: `Stop ${index + 1}`, sequence: index + 1 })) }; await writeMobileSession(session); return session;
}

export type MobileApprovedContent = { id: string; title: string; description: string | null; contentType: "pdf" | "image" | "video" | "html" | "link"; body: string | null; assetUrl: string | null; version: string };
export async function getApprovedContent(apiBaseUrl: string, accessToken: string) { return query<MobileApprovedContent[]>(apiBaseUrl, "marketing.content.list", undefined, accessToken); }
export async function recordMobileContentUsage(apiBaseUrl: string, accessToken: string, input: { contentId: string; accountId: string; plannedVisitId?: string }) { return mutation<{ id: string }>(apiBaseUrl, "marketing.usage.record", { ...input, eventType: "presented", occurredAt: new Date() }, accessToken); }
export type MobileNextBestAction = { id: string; accountId: string; score: number; recommendation: string; reasonComponents: { daysSinceVisit: number; hasCommercialSignal: boolean } };
export type MobileCallAssistDraft = { id: string; draft: { objective: string; productsDiscussed: string[]; samplesGiven: string[]; nextSteps: string; confidence: number } };
export async function getMobileNextBestActions(apiBaseUrl: string, accessToken: string) { return query<MobileNextBestAction[]>(apiBaseUrl, "ai.nextBestAction.list", undefined, accessToken); }
export async function structureMobileCallNote(apiBaseUrl: string, accessToken: string, input: { note: string; accountId?: string }) { return mutation<MobileCallAssistDraft>(apiBaseUrl, "ai.callAssist.generate", input, accessToken); }
