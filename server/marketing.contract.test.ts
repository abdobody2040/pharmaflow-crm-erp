import { describe, expect, it, vi } from "vitest";

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, getDb: async () => null, getTenantById: async () => ({ id: "tenant-a", status: "active" }) };
});
import { appRouter } from "./routers";

const user = (role: "admin" | "manager" | "rep" | "exec", tenantId = "tenant-a") => ({ id: role === "rep" ? 44 : 8, openId: `local:${role}`, tenantId, name: role, email: `${role}@example.com`, passwordHash: null, loginMethod: "local_jwt", role, department: null, territory: null, hireDate: null, status: "active" as const, createdAt: new Date(), updatedAt: new Date(), createdBy: 1, lastSignedIn: new Date() });
const context = (role: "admin" | "manager" | "rep" | "exec") => ({ user: user(role), req: { headers: {} } as any, res: {} as any });

describe("marketing and approved-content procedure contracts", () => {
  it("registers campaign, segmentation, content, delivery, and immutable usage procedures without deletion endpoints", () => {
    const paths = Object.keys((appRouter as any)._def.procedures);
    expect(paths).toEqual(expect.arrayContaining(["marketing.segments.create", "marketing.content.review", "marketing.campaigns.queue", "marketing.campaigns.dispatch", "marketing.usage.record", "marketing.usage.analytics"]));
    expect(paths.some(path => /^marketing\.(segments|content|campaigns|usage)\.(delete|remove)/.test(path))).toBe(false);
  });

  it("prevents a rep from creating campaigns or reading tenant-wide usage analytics", async () => {
    const caller = appRouter.createCaller(context("rep"));
    await expect(caller.marketing.campaigns.create({ name: "Field campaign", channel: "email", subject: "Update", messageBody: "Approved copy" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.marketing.usage.analytics()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows a rep to access only the approved-content query contract", async () => {
    const caller = appRouter.createCaller(context("rep"));
    await expect(caller.marketing.content.list()).resolves.toEqual([]);
  });
});
