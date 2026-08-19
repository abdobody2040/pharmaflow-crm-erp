import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabaseSync("pharmaflow-rep.db");

export type OfflineMutation = { id: string; type: "visit" | "sample" | "location"; payload: string; createdAt: string };

export function initializeOfflineCache() {
  db.execSync("CREATE TABLE IF NOT EXISTS queued_mutations (id TEXT PRIMARY KEY NOT NULL, type TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS cached_stops (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL);");
}

export function enqueueMutation(mutation: OfflineMutation) {
  db.runSync("INSERT OR IGNORE INTO queued_mutations (id, type, payload, created_at) VALUES (?, ?, ?, ?)", mutation.id, mutation.type, mutation.payload, mutation.createdAt);
}

export function queuedMutations(): OfflineMutation[] {
  return db.getAllSync<OfflineMutation>("SELECT id, type, payload, created_at as createdAt FROM queued_mutations ORDER BY created_at ASC");
}

export function removeQueuedMutation(id: string) { db.runSync("DELETE FROM queued_mutations WHERE id = ?", id); }
