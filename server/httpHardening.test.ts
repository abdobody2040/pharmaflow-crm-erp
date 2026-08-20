import { describe, expect, it, vi } from "vitest";
import { createRateLimit, securityHeaders } from "./security/httpHardening";

function response() { const headers = new Map<string, string>(); return { setHeader: vi.fn((key: string, value: string) => headers.set(key, value)), status: vi.fn().mockReturnThis(), json: vi.fn(), headers }; }

describe("HTTP hardening", () => {
  it("sets anti-framing, MIME, referrer, and no-store controls for API responses", () => {
    const res = response(); const next = vi.fn(); securityHeaders({ path: "/api/trpc" } as any, res as any, next);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(next).toHaveBeenCalledOnce();
  });

  it("rejects requests above the configured per-IP window limit", () => {
    const limit = createRateLimit({ windowMs: 60_000, max: 1, namespace: "test" }); const next = vi.fn(); const first = response(); const second = response(); const req = { ip: "198.51.100.10" } as any;
    limit(req, first as any, next); limit(req, second as any, next);
    expect(next).toHaveBeenCalledTimes(1); expect(second.status).toHaveBeenCalledWith(429); expect(second.json).toHaveBeenCalledWith({ error: "Too many requests. Retry later." });
  });
});
