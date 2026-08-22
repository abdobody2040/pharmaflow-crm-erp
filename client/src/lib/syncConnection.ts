export type SyncConnectionStatus =
  | "ready"
  | "syncing"
  | "offline"
  | "reconnecting"
  | "server-unreachable";

export type SyncQueueMetadata = {
  syncAttempts?: number;
  lastAttemptAt?: string;
  lastFailureReason?: string;
};

type TrpcLikeError = {
  data?: { httpStatus?: number };
  message?: string;
};

export function statusForSyncFailure(
  error: unknown,
  browserOnline: boolean
): SyncConnectionStatus | null {
  if (!browserOnline) return "offline";

  const candidate = error as TrpcLikeError | undefined;
  const httpStatus = candidate?.data?.httpStatus;
  if (typeof httpStatus === "number" && httpStatus >= 500) {
    return "server-unreachable";
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof candidate?.message === "string"
        ? candidate.message
        : "";
  return /failed to fetch|network(?:error)?|econnrefused|econnreset|timeout|socket hang up/i.test(
    message
  )
    ? "server-unreachable"
    : null;
}

export function recordSyncAttempt<T extends SyncQueueMetadata>(
  entry: T,
  attemptedAt: string
): T {
  return {
    ...entry,
    syncAttempts: (entry.syncAttempts ?? 0) + 1,
    lastAttemptAt: attemptedAt,
    lastFailureReason: undefined,
  };
}

export function recordSyncFailure<T extends SyncQueueMetadata>(
  entry: T,
  reason: string,
  failedAt: string
): T {
  return {
    ...entry,
    lastAttemptAt: failedAt,
    lastFailureReason: reason,
  };
}

export function statusTone(status: SyncConnectionStatus) {
  switch (status) {
    case "ready":
      return "success" as const;
    case "syncing":
    case "reconnecting":
      return "pending" as const;
    case "offline":
    case "server-unreachable":
      return "warning" as const;
  }
}
