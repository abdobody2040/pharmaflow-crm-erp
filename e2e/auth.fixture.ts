import { randomBytes, randomUUID } from "crypto";
import { expect, test as base } from "@playwright/test";
import mysql from "mysql2/promise";
import { hashPassword } from "../server/security/localJwt";

type EphemeralIdentity = {
  close: () => Promise<void>;
  email: string;
  password: string;
  tenantSlug: string;
};

function databaseConfig() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required to create the ephemeral authenticated E2E fixture."
    );
  }
  const parsed = new URL(databaseUrl);
  const localHosts = new Set(["localhost", "127.0.0.1", "mysql"]);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: decodeURIComponent(parsed.pathname.replace(/^\//, "")),
    ssl: localHosts.has(parsed.hostname)
      ? undefined
      : { rejectUnauthorized: true },
  };
}

async function createEphemeralIdentity(): Promise<EphemeralIdentity> {
  const connection = await mysql.createConnection(databaseConfig());
  const suffix = randomUUID().replaceAll("-", "");
  const tenantId = randomUUID();
  const tenantSlug = `e2e-${suffix.slice(0, 20)}`;
  const email = `qa-${suffix.slice(0, 16)}@e2e.local`;
  const password = randomBytes(24).toString("base64url");
  const openId = `e2e:${suffix}`;
  const passwordHash = await hashPassword(password);
  let userId: number | null = null;

  try {
    await connection.execute(
      "INSERT INTO tenants (id, slug, legalName, displayName, planTier, billingStatus, status, region, dataRetentionDays) VALUES (?, ?, ?, ?, 'starter', 'trial', 'active', 'test', '30')",
      [tenantId, tenantSlug, "Ephemeral Playwright QA", "Ephemeral E2E"]
    );
    const [result] = await connection.execute<mysql.ResultSetHeader>(
      "INSERT INTO users (openId, tenantId, name, email, passwordHash, loginMethod, role, status) VALUES (?, ?, ?, ?, ?, 'local_jwt', 'admin', 'active')",
      [openId, tenantId, "Ephemeral QA Admin", email, passwordHash]
    );
    userId = result.insertId;
  } catch (error) {
    await connection.execute("DELETE FROM tenants WHERE id = ?", [tenantId]);
    await connection.end();
    throw error;
  }

  return {
    email,
    password,
    tenantSlug,
    close: async () => {
      try {
        if (userId)
          await connection.execute("DELETE FROM users WHERE id = ?", [userId]);
        await connection.execute("DELETE FROM tenants WHERE id = ?", [
          tenantId,
        ]);
      } finally {
        await connection.end();
      }
    },
  };
}

export const test = base.extend<{
  authenticatedPage: import("@playwright/test").Page;
}>({
  authenticatedPage: async ({ page, baseURL }, use) => {
    const identity = await createEphemeralIdentity();
    try {
      const response = await page.request.post(
        `${baseURL}/api/trpc/auth.localLogin?batch=1`,
        {
          data: {
            "0": {
              json: {
                email: identity.email,
                password: identity.password,
                tenantSlug: identity.tenantSlug,
              },
            },
          },
        }
      );
      const responseText = await response.text();
      if (!response.ok()) {
        throw new Error(
          `Ephemeral localLogin failed with ${response.status()}: ${responseText.slice(0, 500)}`
        );
      }
      const body = JSON.parse(responseText);
      const token = body?.[0]?.result?.data?.json?.token;
      if (!token)
        throw new Error("Ephemeral localLogin did not return an access token.");
      await page.addInitScript(
        value => sessionStorage.setItem("pharmaflow-local-token", value),
        token
      );
      await page.goto("/");
      await use(page);
    } finally {
      await identity.close();
    }
  },
});

export { expect };
