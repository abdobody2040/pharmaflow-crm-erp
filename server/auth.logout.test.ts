import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

function createAuthContext(): { ctx: TrpcContext; cleared: Array<{ name: string; options: Record<string, unknown> }> } {
  const cleared: Array<{ name: string; options: Record<string, unknown> }> = [];
  return {
    ctx: {
      user: { id: 1, openId: "sample", tenantId: "tenant-a", name: "Sample User", email: "sample@example.com", passwordHash: null, loginMethod: "local_jwt", role: "rep", department: null, territory: null, hireDate: null, status: "active", createdAt: new Date(), updatedAt: new Date(), createdBy: null, lastSignedIn: new Date() },
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: (name: string, options: Record<string, unknown>) => cleared.push({ name, options }) } as TrpcContext["res"],
    },
    cleared,
  };
}

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, cleared } = createAuthContext();
    const result = await appRouter.createCaller(ctx).auth.logout();
    expect(result).toEqual({ success: true });
    expect(cleared[0]?.name).toBe(COOKIE_NAME);
    expect(cleared[0]?.options).toMatchObject({ maxAge: -1, httpOnly: true, path: "/" });
  });
});
