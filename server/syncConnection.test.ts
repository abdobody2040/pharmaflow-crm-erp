import { describe, expect, it } from "vitest";
import {
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

  it("does not mistake a business validation error for a connection failure", () => {
    expect(statusForSyncFailure(new Error("Account is required"), true)).toBe(
      null
    );
    expect(statusTone("ready")).toBe("success");
    expect(statusTone("server-unreachable")).toBe("warning");
  });
});
