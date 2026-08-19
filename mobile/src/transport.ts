import SuperJSON from "superjson";

export type TrpcEnvelope<T> = { result?: { data?: { json?: unknown } }; error?: { json?: { message?: string } } };
export const encodeTrpcInput = (input: unknown) => JSON.stringify({ json: SuperJSON.serialize(input) });
export function decodeTrpcResult<T>(envelope: TrpcEnvelope<T>): T {
  if (envelope.error) throw new Error(envelope.error.json?.message ?? "Request failed");
  return SuperJSON.deserialize(envelope.result?.data?.json as never) as T;
}
