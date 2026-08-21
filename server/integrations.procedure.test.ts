import { describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getTenantById: async (id: string) => ({ id, status: "active" }),
  getDb: async () => null,
  appendAuditEvent: vi.fn(),
}));
import { appRouter } from "./routers";
import {
  assertPublicWebhookTarget,
  isUnsafeHost,
} from "./routers/integrations";

const rep = {
  id: 82,
  openId: "local:rep",
  tenantId: "tenant-a",
  name: "Rep",
  email: "rep@tenant-a.example",
  passwordHash: null,
  loginMethod: "local_jwt",
  role: "rep" as const,
  department: null,
  territory: null,
  hireDate: null,
  status: "active" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 1,
  lastSignedIn: new Date(),
};
const admin = {
  ...rep,
  id: 1,
  openId: "local:admin",
  email: "admin@tenant-a.example",
  role: "admin" as const,
};

describe("integration gateway authorization", () => {
  it("blocks a representative from managing versioned API keys and outbound webhook controls", async () => {
    const caller = appRouter.createCaller({
      user: rep,
      req: { headers: {} } as any,
      res: {} as any,
    });
    const id = "00000000-0000-4000-8000-000000000001";
    await expect(
      caller.integrations.apiKeys.issue({
        label: "ERP reader",
        scopes: ["crm.read"],
      })
    ).rejects.toThrow("not authorized");
    await expect(
      caller.integrations.webhooks.register({
        name: "ERP sync",
        endpointUrl: "https://example.org/pharmaflow",
        eventTypes: ["document.activated"],
      })
    ).rejects.toThrow("not authorized");
    await expect(
      caller.integrations.webhooks.dispatchTest({
        id,
        eventType: "document.activated",
      })
    ).rejects.toThrow("not authorized");
  });

  it("rejects non-public webhook targets before a network request or database write", async () => {
    const caller = appRouter.createCaller({
      user: admin,
      req: { headers: {} } as any,
      res: {} as any,
    });
    const register = (endpointUrl: string) =>
      caller.integrations.webhooks.register({
        name: "Controlled target",
        endpointUrl,
        eventTypes: ["document.activated"],
      });

    await expect(register("http://example.org/hook")).rejects.toThrow(
      "Webhook URL must use public HTTPS"
    );
    await expect(register("https://127.0.0.1/hook")).rejects.toThrow(
      "Webhook URL must use public HTTPS"
    );
    await expect(register("https://10.0.0.1/hook")).rejects.toThrow(
      "Webhook URL must use public HTTPS"
    );
    await expect(
      register("https://user:password@example.org/hook")
    ).rejects.toThrow("Webhook URL must use public HTTPS");
  });

  it("blocks reserved ranges and DNS answers that could reach private infrastructure", async () => {
    expect(isUnsafeHost("100.64.0.1")).toBe(true);
    expect(isUnsafeHost("192.0.2.1")).toBe(true);
    expect(isUnsafeHost("198.51.100.20")).toBe(true);
    expect(isUnsafeHost("203.0.113.5")).toBe(true);
    expect(isUnsafeHost("224.0.0.1")).toBe(true);
    expect(isUnsafeHost("::ffff:127.0.0.1")).toBe(true);

    await expect(
      assertPublicWebhookTarget("https://callback.example/hook", async () => [
        { address: "10.0.0.8", family: 4 },
      ])
    ).rejects.toThrow("does not resolve to a public address");
    await expect(
      assertPublicWebhookTarget("https://callback.example/hook", async () => [
        { address: "93.184.216.34", family: 4 },
      ])
    ).resolves.toBeUndefined();
  });
});
