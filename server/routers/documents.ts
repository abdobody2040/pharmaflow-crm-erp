import { randomUUID } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { documentRecords } from "../../drizzle/schema";
import { appendAuditEvent, getDb } from "../db";
import { resolveTenantScope } from "../security/access";
import { router, tenantRoleProcedure } from "../_core/trpc";

const readers = ["admin", "manager", "hr", "exec"] as const;
const editors = ["admin", "manager", "hr"] as const;
const details = z.object({
  title: z.string().trim().min(2).max(255),
  fileKey: z.string().trim().min(3).max(1024),
  fileName: z.string().trim().min(1).max(512),
  mimeType: z.string().trim().min(3).max(255),
  classification: z
    .enum(["general", "quality", "hr", "commercial", "compliance"])
    .default("general"),
  retentionDate: z.date(),
});
async function evidence(
  scope: ReturnType<typeof resolveTenantScope>,
  entityId: string,
  eventType: string,
  operation: "create" | "status_change",
  data: unknown,
  reason: string
) {
  await appendAuditEvent({
    tenantId: scope.tenantId,
    actorUserId: scope.userId,
    entityType: "document_record",
    entityId,
    eventType,
    operation,
    oldValue: null,
    newValue: data,
    reason,
  });
}
async function documentForTenant(tenantId: string, id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [row] = await db
    .select()
    .from(documentRecords)
    .where(
      and(eq(documentRecords.tenantId, tenantId), eq(documentRecords.id, id))
    )
    .limit(1);
  if (!row) throw new Error("Document record not found in the tenant");
  return row;
}

export const documentsRouter = router({
  list: tenantRoleProcedure(readers)
    .input(
      z
        .object({
          status: z
            .enum(["draft", "active", "superseded", "archived"])
            .optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const scope = resolveTenantScope(ctx.user!);
      const db = await getDb();
      if (!db) return [];
      const filters = [eq(documentRecords.tenantId, scope.tenantId)];
      if (input?.status) filters.push(eq(documentRecords.status, input.status));
      return db
        .select()
        .from(documentRecords)
        .where(and(...filters))
        .orderBy(desc(documentRecords.createdAt))
        .limit(200);
    }),
  register: tenantRoleProcedure(editors)
    .input(
      details.extend({
        documentNumber: z.string().trim().min(2).max(64),
        activateNow: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const scope = resolveTenantScope(ctx.user!);
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const existing = await db
        .select({ id: documentRecords.id })
        .from(documentRecords)
        .where(
          and(
            eq(documentRecords.tenantId, scope.tenantId),
            eq(documentRecords.documentNumber, input.documentNumber)
          )
        )
        .limit(1);
      if (existing.length)
        throw new Error(
          "Document number already exists; create a new version instead"
        );
      const id = randomUUID();
      const status = input.activateNow ? "active" : ("draft" as const);
      await db
        .insert(documentRecords)
        .values({
          id,
          tenantId: scope.tenantId,
          documentNumber: input.documentNumber,
          title: input.title,
          version: 1,
          fileKey: input.fileKey,
          fileName: input.fileName,
          mimeType: input.mimeType,
          classification: input.classification,
          retentionDate: input.retentionDate,
          status,
          activatedAt: input.activateNow ? new Date() : null,
          createdBy: scope.userId,
        });
      await evidence(
        scope,
        id,
        "documents.registered",
        "create",
        input,
        "Initial document version registered"
      );
      return { id, version: 1 };
    }),
  createVersion: tenantRoleProcedure(editors)
    .input(
      details.extend({
        previousVersionId: z.string().uuid(),
        activateNow: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const scope = resolveTenantScope(ctx.user!);
      const previous = await documentForTenant(
        scope.tenantId,
        input.previousVersionId
      );
      if (previous.status === "archived")
        throw new Error("An archived document cannot receive a new version");
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const id = randomUUID();
      const status = input.activateNow ? "active" : ("draft" as const);
      if (input.activateNow)
        await db
          .update(documentRecords)
          .set({ status: "superseded" })
          .where(
            and(
              eq(documentRecords.tenantId, scope.tenantId),
              eq(documentRecords.documentNumber, previous.documentNumber),
              eq(documentRecords.status, "active")
            )
          );
      await db
        .insert(documentRecords)
        .values({
          id,
          tenantId: scope.tenantId,
          documentNumber: previous.documentNumber,
          previousVersionId: previous.id,
          title: input.title,
          version: previous.version + 1,
          fileKey: input.fileKey,
          fileName: input.fileName,
          mimeType: input.mimeType,
          classification: input.classification,
          retentionDate: input.retentionDate,
          status,
          activatedAt: input.activateNow ? new Date() : null,
          createdBy: scope.userId,
        });
      await evidence(
        scope,
        id,
        "documents.version_created",
        "create",
        input,
        "New immutable document version registered"
      );
      return { id, version: previous.version + 1 };
    }),
  activate: tenantRoleProcedure(editors)
    .input(
      z.object({
        id: z.string().uuid(),
        reason: z.string().trim().min(3).max(3000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const scope = resolveTenantScope(ctx.user!);
      const record = await documentForTenant(scope.tenantId, input.id);
      if (record.status === "archived")
        throw new Error("An archived document cannot be activated");
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await db
        .update(documentRecords)
        .set({ status: "superseded" })
        .where(
          and(
            eq(documentRecords.tenantId, scope.tenantId),
            eq(documentRecords.documentNumber, record.documentNumber),
            eq(documentRecords.status, "active")
          )
        );
      await db
        .update(documentRecords)
        .set({ status: "active", activatedAt: new Date() })
        .where(
          and(
            eq(documentRecords.tenantId, scope.tenantId),
            eq(documentRecords.id, record.id)
          )
        );
      await evidence(
        scope,
        record.id,
        "documents.activated",
        "status_change",
        { status: "active" },
        input.reason
      );
      return { id: record.id };
    }),
  archive: tenantRoleProcedure(editors)
    .input(
      z.object({
        id: z.string().uuid(),
        reason: z.string().trim().min(3).max(3000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const scope = resolveTenantScope(ctx.user!);
      const record = await documentForTenant(scope.tenantId, input.id);
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await db
        .update(documentRecords)
        .set({ status: "archived" })
        .where(
          and(
            eq(documentRecords.tenantId, scope.tenantId),
            eq(documentRecords.id, record.id)
          )
        );
      await evidence(
        scope,
        record.id,
        "documents.archived",
        "status_change",
        { status: "archived" },
        input.reason
      );
      return { id: record.id };
    }),
});
