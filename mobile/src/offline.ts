import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabaseSync("pharmaflow-rep.db");

export type OfflineMutation = {
  id: string;
  type: "visit" | "sample" | "location";
  payload: string;
  createdAt: string;
  syncAttempts: number;
  lastAttemptAt?: string;
  lastFailureReason?: string;
};

export function initializeOfflineCache() {
  db.execSync(
    "CREATE TABLE IF NOT EXISTS queued_mutations (id TEXT PRIMARY KEY NOT NULL, type TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL, sync_attempts INTEGER NOT NULL DEFAULT 0, last_attempt_at TEXT, last_failure_reason TEXT); CREATE TABLE IF NOT EXISTS cached_stops (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL);"
  );
  try {
    db.execSync(
      "ALTER TABLE queued_mutations ADD COLUMN sync_attempts INTEGER NOT NULL DEFAULT 0"
    );
  } catch {
    // Column already exists on an initialized database.
  }
  try {
    db.execSync("ALTER TABLE queued_mutations ADD COLUMN last_attempt_at TEXT");
  } catch {
    // Column already exists on an initialized database.
  }
  try {
    db.execSync(
      "ALTER TABLE queued_mutations ADD COLUMN last_failure_reason TEXT"
    );
  } catch {
    // Column already exists on an initialized database.
  }
}

export function enqueueMutation(mutation: OfflineMutation) {
  db.runSync(
    "INSERT OR IGNORE INTO queued_mutations (id, type, payload, created_at, sync_attempts, last_attempt_at, last_failure_reason) VALUES (?, ?, ?, ?, ?, ?, ?)",
    mutation.id,
    mutation.type,
    mutation.payload,
    mutation.createdAt,
    mutation.syncAttempts ?? 0,
    mutation.lastAttemptAt ?? null,
    mutation.lastFailureReason ?? null
  );
}

export function queuedMutations(): OfflineMutation[] {
  return db.getAllSync<OfflineMutation>(
    "SELECT id, type, payload, created_at as createdAt, sync_attempts as syncAttempts, last_attempt_at as lastAttemptAt, last_failure_reason as lastFailureReason FROM queued_mutations ORDER BY created_at ASC"
  );
}

export function markMutationAttempt(id: string, attemptedAt: string) {
  db.runSync(
    "UPDATE queued_mutations SET sync_attempts = sync_attempts + 1, last_attempt_at = ?, last_failure_reason = NULL WHERE id = ?",
    attemptedAt,
    id
  );
}

export function markMutationFailure(
  id: string,
  reason: string,
  failedAt: string
) {
  db.runSync(
    "UPDATE queued_mutations SET last_attempt_at = ?, last_failure_reason = ? WHERE id = ?",
    failedAt,
    reason,
    id
  );
}

export function removeQueuedMutation(id: string) {
  db.runSync("DELETE FROM queued_mutations WHERE id = ?", id);
}
