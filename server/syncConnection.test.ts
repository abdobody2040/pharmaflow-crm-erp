import { describe, expect, it } from "vitest";
import {
  recordSyncAttempt,
  recordSyncFailure,
  statusForSyncFailure,
  statusTone,
} from "../client/src/lib/syncConnection";

describe("sync connection status", () => {
  it("marks a request as offline whenever the browser loses its network", () => {
    expect(statusForSyncFailure(new Error("anything"), false)).toBe("offline");
  });

  it("marks transport and 5xx failures as server-unreachable", () => {
    expect(statusForSyncFailure(new Error("Failed to fetch"), true)).toBe(
      "server-unreachable"
    );
    expect(statusForSyncFailure({ data: { httpStatus: 503 } }, true)).toBe(
      "server-unreachable"
    );
  });

  it("records attempts and failure reasons without changing the queued payload", () => {
    const first = recordSyncAttempt(
      { clientMutationId: "visit-1", objective: "review" },
      "2026-08-22T10:00:00.000Z"
    );
    const failed = recordSyncFailure(
      first,
      "Server unavailable (503)",
      "2026-08-22T10:00:01.000Z"
    );
    const retried = recordSyncAttempt(failed, "2026-08-22T10:01:00.000Z");

    expect(failed).toMatchObject({
      clientMutationId: "visit-1",
      syncAttempts: 1,
      lastAttemptAt: "2026-08-22T10:00:01.000Z",
      lastFailureReason: "Server unavailable (503)",
    });
    expect(retried).toMatchObject({
      clientMutationId: "visit-1",
      syncAttempts: 2,
      lastAttemptAt: "2026-08-22T10:01:00.000Z",
    });
    expect(retried.lastFailureReason).toBeUndefined();
  });

  it("does not mistake a business validation error for a connection failure", () => {
    expect(statusForSyncFailure(new Error("Account is required"), true)).toBe(
      null
    );
    expect(statusTone("ready")).toBe("success");
    expect(statusTone("server-unreachable")).toBe("warning");
  });
});
