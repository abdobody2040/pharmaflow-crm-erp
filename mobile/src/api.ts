import { writeMobileSession, type MobileSession } from "./session";
import { decodeTrpcResult, encodeTrpcInput, type TrpcEnvelope } from "./transport";

async function mutation<T>(apiBaseUrl: string, path: string, input: unknown, token?: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/api/trpc/${path}`, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: encodeTrpcInput(input) });
  const envelope = await response.json() as TrpcEnvelope<unknown>; if (!response.ok || envelope.error) throw new Error(envelope.error?.json?.message ?? "Request failed");
  return decodeTrpcResult<T>(envelope);
}

export async function mobileSignIn(apiBaseUrl: string, email: string, password: string, tenantSlug?: string) {
  return mutation<{ token: string; user: { id: number; tenantId: string | null } }>(apiBaseUrl, "auth.localLogin", { email, password, tenantSlug: tenantSlug || undefined });
}

export async function beginShiftSession(apiBaseUrl: string, accessToken: string, plannedStops: Array<{ latitude: number; longitude: number }> = []): Promise<MobileSession> {
  const consent = await mutation<{ id: string }>(apiBaseUrl, "rep.shift.consent", { policyVersion: "rep-location-v1", retentionDays: 90 }, accessToken);
  const shift = await mutation<{ id: string }>(apiBaseUrl, "rep.shift.start", { consentId: consent.id }, accessToken);
  const session = { shiftId: shift.id, accessToken, apiBaseUrl, plannedStops }; await writeMobileSession(session); return session;
}
