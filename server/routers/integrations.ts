import { createHash, createHmac, randomBytes, randomUUID } from "crypto";
import { lookup } from "dns/promises";
import { and, desc, eq } from "drizzle-orm";
import { isIP } from "net";
import { z } from "zod";
import {
  integrationApiKeys,
  webhookDeliveryLogs,
  webhookEndpoints,
} from "../../drizzle/schema";
import { appendAuditEvent, getDb } from "../db";
import { resolveTenantScope } from "../security/access";
import { router, tenantRoleProcedure } from "../_core/trpc";

const admins = ["admin"] as const;
const eventTypes = [
  "inventory.stock_movement",
  "procurement.request_submitted",
  "document.activated",
  "coaching.scorecard_created",
] as const;
const scopes = [
  "crm.read",
  "inventory.read",
  "documents.read",
  "webhooks.manage",
] as const;
const keyHash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const webhookSignature = (value: string) =>
  createHmac(
    "sha256",
    process.env.JWT_SECRET ?? "integration-development-secret"
  )
    .update(value)
    .digest("hex");
export const isUnsafeHost = (hostname: string) => {
  const host = hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  )
    return true;
  if (isIP(host) === 4) {
    const [a, b, c] = host.split(".").map(Number);
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0 && c === 0) ||
      (a === 192 && b === 0 && c === 2) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113)
    );
  }
  if (isIP(host) === 6)
    return (
      host === "::" ||
      host === "::1" ||
      host.startsWith("::ffff:") ||
      host.startsWith("fc") ||
      host.startsWith("fd") ||
      host.startsWith("fe80:") ||
      host.startsWith("2001:db8:")
    );
  return false;
};
const controlledHttpsUrl = z
  .string()
  .url()
  .max(2048)
  .superRefine((value, issue) => {
    try {
      const url = new URL(value);
      if (
        url.protocol !== "https:" ||
        url.username ||
        url.password ||
        isUnsafeHost(url.hostname)
      )
        issue.addIssue({
          code: "custom",
          message:
            "Webhook URL must use public HTTPS without embedded credentials",
        });
    } catch {
      issue.addIssue({ code: "custom", message: "Webhook URL is invalid" });
    }
  });

export async function assertPublicWebhookTarget(
  endpointUrl: string,
  resolveHost: typeof lookup = lookup
) {
  const url = new URL(endpointUrl);
  if (isUnsafeHost(url.hostname)) {
    throw new Error("Webhook target does not resolve to a public address");
  }
  const answers = await Promise.race([
    resolveHost(url.hostname, { all: true, verbatim: true }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Webhook DNS lookup timed out")), 2000)
    ),
  ]);
  if (!answers.length || answers.some(answer => isUnsafeHost(answer.address))) {
    throw new Error("Webhook target does not resolve to a public address");
  }
}
async function ownedEndpoint(tenantId: string, id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [endpoint] = await db
    .select()
    .from(webhookEndpoints)
    .where(
      and(eq(webhookEndpoints.tenantId, tenantId), eq(webhookEndpoints.id, id))
    )
    .limit(1);
  if (!endpoint) throw new Error("Webhook endpoint not found in the tenant");
  return endpoint;
}
async function evidence(
  scope: ReturnType<typeof resolveTenantScope>,
  entityType: string,
  entityId: string,
  eventType: string,
  operation: "create" | "status_change" | "access",
  newValue: unknown,
  reason: string
) {
  await appendAuditEvent({
    tenantId: scope.tenantId,
    actorUserId: scope.userId,
    entityType,
    entityId,
    eventType,
    operation,
    oldValue: null,
    newValue,
    reason,
  });
}

export const integrationsRouter = router({
  apiKeys: router({
    list: tenantRoleProcedure(admins).query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return (
        await db
          .select()
          .from(integrationApiKeys)
          .where(
            eq(
              integrationApiKeys.tenantId,
              resolveTenantScope(ctx.user!).tenantId
            )
          )
          .orderBy(desc(integrationApiKeys.createdAt))
          .limit(100)
      ).map(({ keyHash: _hash, ...key }) => key);
    }),
    issue: tenantRoleProcedure(admins)
      .input(
        z.object({
          label: z.string().trim().min(2).max(160),
          scopes: z.array(z.enum(scopes)).min(1).max(scopes.length),
          expiresAt: z.date().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const scope = resolveTenantScope(ctx.user!);
        if (input.expiresAt && input.expiresAt <= new Date())
          throw new Error("API key expiry must be in the future");
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        const apiKey = `pf_v1_${randomBytes(32).toString("base64url")}`;
        const prefix = apiKey.slice(0, 18);
        const id = randomUUID();
        await db.insert(integrationApiKeys).values({
          id,
          tenantId: scope.tenantId,
          label: input.label,
          apiVersion: "v1",
          keyPrefix: prefix,
          keyHash: keyHash(apiKey),
          scopes: input.scopes,
          expiresAt: input.expiresAt ?? null,
          createdBy: scope.userId,
        });
        await evidence(
          scope,
          "integration_api_key",
          id,
          "integration.api_key_issued",
          "create",
          {
            label: input.label,
            apiVersion: "v1",
            scopes: input.scopes,
            keyPrefix: prefix,
          },
          "Versioned API key issued; raw secret displayed once"
        );
        return { id, apiKey, keyPrefix: prefix, apiVersion: "v1" as const };
      }),
    revoke: tenantRoleProcedure(admins)
      .input(
        z.object({
          id: z.string().uuid(),
          reason: z.string().trim().min(3).max(2000),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const scope = resolveTenantScope(ctx.user!);
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        const [key] = await db
          .select()
          .from(integrationApiKeys)
          .where(
            and(
              eq(integrationApiKeys.tenantId, scope.tenantId),
              eq(integrationApiKeys.id, input.id)
            )
          )
          .limit(1);
        if (!key || key.status !== "active")
          throw new Error("Only an active tenant API key can be revoked");
        await db
          .update(integrationApiKeys)
          .set({ status: "revoked", revokedAt: new Date() })
          .where(
            and(
              eq(integrationApiKeys.tenantId, scope.tenantId),
              eq(integrationApiKeys.id, key.id)
            )
          );
        await evidence(
          scope,
          "integration_api_key",
          key.id,
          "integration.api_key_revoked",
          "status_change",
          { status: "revoked" },
          input.reason
        );
        return { id: key.id };
      }),
  }),
  webhooks: router({
    list: tenantRoleProcedure(admins).query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(webhookEndpoints)
        .where(
          eq(webhookEndpoints.tenantId, resolveTenantScope(ctx.user!).tenantId)
        )
        .orderBy(desc(webhookEndpoints.createdAt))
        .limit(100);
    }),
    deliveries: tenantRoleProcedure(admins)
      .input(z.object({ endpointId: z.string().uuid().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const scope = resolveTenantScope(ctx.user!);
        const db = await getDb();
        if (!db) return [];
        const where = [eq(webhookDeliveryLogs.tenantId, scope.tenantId)];
        if (input?.endpointId)
          where.push(eq(webhookDeliveryLogs.endpointId, input.endpointId));
        return db
          .select()
          .from(webhookDeliveryLogs)
          .where(and(...where))
          .orderBy(desc(webhookDeliveryLogs.attemptedAt))
          .limit(100);
      }),
    register: tenantRoleProcedure(admins)
      .input(
        z.object({
          name: z.string().trim().min(2).max(160),
          endpointUrl: controlledHttpsUrl,
          eventTypes: z.array(z.enum(eventTypes)).min(1).max(eventTypes.length),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const scope = resolveTenantScope(ctx.user!);
        await assertPublicWebhookTarget(input.endpointUrl);
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        const id = randomUUID();
        await db.insert(webhookEndpoints).values({
          id,
          tenantId: scope.tenantId,
          name: input.name,
          endpointUrl: input.endpointUrl,
          payloadVersion: "v1",
          eventTypes: input.eventTypes,
          createdBy: scope.userId,
        });
        await evidence(
          scope,
          "webhook_endpoint",
          id,
          "integration.webhook_registered",
          "create",
          {
            name: input.name,
            endpointUrl: input.endpointUrl,
            payloadVersion: "v1",
            eventTypes: input.eventTypes,
          },
          "Controlled HTTPS webhook registered"
        );
        return { id };
      }),
    setStatus: tenantRoleProcedure(admins)
      .input(
        z.object({
          id: z.string().uuid(),
          status: z.enum(["active", "paused", "revoked"]),
          reason: z.string().trim().min(3).max(2000),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const scope = resolveTenantScope(ctx.user!);
        await ownedEndpoint(scope.tenantId, input.id);
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        await db
          .update(webhookEndpoints)
          .set({ status: input.status })
          .where(
            and(
              eq(webhookEndpoints.tenantId, scope.tenantId),
              eq(webhookEndpoints.id, input.id)
            )
          );
        await evidence(
          scope,
          "webhook_endpoint",
          input.id,
          "integration.webhook_status_changed",
          "status_change",
          { status: input.status },
          input.reason
        );
        return { id: input.id };
      }),
    dispatchTest: tenantRoleProcedure(admins)
      .input(z.object({ id: z.string().uuid(), eventType: z.enum(eventTypes) }))
      .mutation(async ({ ctx, input }) => {
        const scope = resolveTenantScope(ctx.user!);
        const endpoint = await ownedEndpoint(scope.tenantId, input.id);
        const started = Date.now();
        const payload = JSON.stringify({
          version: endpoint.payloadVersion,
          eventType: input.eventType,
          eventId: randomUUID(),
          tenantId: scope.tenantId,
          emittedAt: new Date().toISOString(),
          test: true,
        });
        const payloadHash = keyHash(payload);
        let deliveryStatus: "delivered" | "failed" | "blocked" = "blocked";
        let httpStatus: number | null = null;
        let responseSummary =
          "Webhook is not active or does not allow this event";
        if (
          endpoint.status === "active" &&
          (endpoint.eventTypes as string[]).includes(input.eventType)
        ) {
          try {
            await assertPublicWebhookTarget(endpoint.endpointUrl);
            const response = await fetch(endpoint.endpointUrl, {
              method: "POST",
              redirect: "error",
              signal: AbortSignal.timeout(5000),
              headers: {
                "content-type": "application/json",
                "x-pharmaflow-version": endpoint.payloadVersion,
                "x-pharmaflow-event": input.eventType,
                "x-pharmaflow-signature": webhookSignature(payload),
              },
              body: payload,
            });
            httpStatus = response.status;
            deliveryStatus = response.ok ? "delivered" : "failed";
            responseSummary = `HTTP ${response.status}`;
          } catch (error) {
            deliveryStatus = "failed";
            responseSummary =
              error instanceof Error
                ? error.message.slice(0, 500)
                : "Webhook delivery failed";
          }
        }
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        const id = randomUUID();
        await db.insert(webhookDeliveryLogs).values({
          id,
          tenantId: scope.tenantId,
          endpointId: endpoint.id,
          eventType: input.eventType,
          payloadHash,
          deliveryStatus,
          httpStatus,
          responseSummary,
          attemptedAt: new Date(),
          durationMs: Date.now() - started,
          createdBy: scope.userId,
        });
        await evidence(
          scope,
          "webhook_delivery",
          id,
          "integration.webhook_test_dispatched",
          "create",
          {
            endpointId: endpoint.id,
            eventType: input.eventType,
            deliveryStatus,
            httpStatus,
            payloadHash,
          },
          "Audited test webhook delivery"
        );
        return { id, deliveryStatus, httpStatus, payloadHash };
      }),
  }),
});
