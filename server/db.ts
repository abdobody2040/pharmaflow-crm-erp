import { randomUUID } from "crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  auditEvents,
  electronicSignatures,
  InsertUser,
  roles,
  sampleTransactions,
  tenants,
  TenantPlan,
  users,
  UserRole,
  visitLogs,
  visitSampleLinks,
} from "../drizzle/schema";
import type { TenantScope } from "./security/access";
import { recordHash } from "./security/localJwt";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

type AuthIdentity = Pick<InsertUser, "openId"> &
  Partial<Omit<InsertUser, "id" | "openId" | "createdAt" | "updatedAt">>;

export async function upsertUser(user: AuthIdentity): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const isPlatformOwner = user.openId === ENV.ownerOpenId;
  const email = user.email ?? `${user.openId}@identity.pharmaflow.local`;
  const defaultRole: UserRole = isPlatformOwner ? "super_admin" : "rep";

  await db.insert(users).values({
    openId: user.openId,
    email,
    name: user.name ?? null,
    loginMethod: user.loginMethod ?? "platform_jwt",
    role: user.role ?? defaultRole,
    tenantId: user.tenantId ?? null,
    passwordHash: user.passwordHash ?? null,
    department: user.department ?? null,
    territory: user.territory ?? null,
    hireDate: user.hireDate ?? null,
    status: user.status ?? "active",
    createdBy: user.createdBy ?? null,
    lastSignedIn: new Date(),
  }).onDuplicateKeyUpdate({
    set: {
      name: user.name ?? null,
      email,
      loginMethod: user.loginMethod ?? "platform_jwt",
      ...(isPlatformOwner ? { status: "active" as const, role: "super_admin" as const } : {}),
      lastSignedIn: new Date(),
    },
  });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(users).where(eq(users.openId, openId)).limit(1))[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(users).where(eq(users.id, id)).limit(1))[0];
}

export async function getTenantById(id: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(tenants).where(eq(tenants.id, id)).limit(1))[0];
}

export async function getTenantUserById(tenantId: string, id: number) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(users).where(and(eq(users.tenantId, tenantId), eq(users.id, id))).limit(1))[0];
}

export type ProvisionTenantInput = {
  legalName: string;
  displayName: string;
  slug: string;
  planTier: TenantPlan;
  region: string;
  adminName: string;
  adminEmail: string;
  adminPasswordHash: string;
};

const defaultPermissions: Record<UserRole, string[]> = {
  super_admin: ["platform:all"],
  admin: ["tenant:manage", "directory:manage", "compliance:read"],
  manager: ["directory:read", "visit:write", "compliance:read"],
  rep: ["visit:write", "sample:write", "signature:write"],
  hr: ["directory:manage", "directory:read"],
  exec: ["analytics:read", "compliance:read"],
};

export async function provisionTenant(actorId: number, input: ProvisionTenantInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const tenantId = randomUUID();
  const createdAdminOpenId = `local:${randomUUID()}`;

  await db.transaction(async tx => {
    await tx.insert(tenants).values({
      id: tenantId,
      legalName: input.legalName,
      displayName: input.displayName,
      slug: input.slug,
      planTier: input.planTier,
      billingStatus: "trial",
      status: "active",
      region: input.region,
      createdBy: actorId,
    });

    const [admin] = await tx.insert(users).values({
      openId: createdAdminOpenId,
      tenantId,
      name: input.adminName,
      email: input.adminEmail.toLowerCase(),
      passwordHash: input.adminPasswordHash,
      loginMethod: "local_jwt",
      role: "admin",
      status: "active",
      createdBy: actorId,
      lastSignedIn: new Date(),
    }).$returningId();

    await tx.insert(roles).values(
      (["admin", "manager", "rep", "hr", "exec"] as const).map(code => ({
        id: randomUUID(),
        tenantId,
        code,
        label: code.replace("_", " ").replace(/\b\w/g, value => value.toUpperCase()),
        permissions: defaultPermissions[code],
        status: "active" as const,
        createdBy: actorId,
      })),
    );

    const initialEvent = {
      tenantId,
      actorUserId: actorId,
      entityType: "tenant",
      entityId: tenantId,
      eventType: "tenant.provisioned",
      operation: "provision" as const,
      oldValue: null,
      newValue: { planTier: input.planTier, initialAdminId: admin.id },
      reason: "Super-admin provisioning",
      previousHash: null,
    };
    await tx.insert(auditEvents).values({ ...initialEvent, id: randomUUID(), eventHash: recordHash(initialEvent) });
  });

  return { tenantId, initialAdminOpenId: createdAdminOpenId };
}

export async function listTenants() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tenants).orderBy(desc(tenants.createdAt));
}

export async function changeTenantLifecycle(
  actorId: number,
  tenantId: string,
  update: { status?: "active" | "suspended"; planTier?: TenantPlan; reason: string },
) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const before = await getTenantById(tenantId);
  if (!before) throw new Error("Tenant not found");

  const changes = {
    ...(update.status ? { status: update.status, suspendedAt: update.status === "suspended" ? new Date() : null } : {}),
    ...(update.planTier ? { planTier: update.planTier } : {}),
    statusReason: update.reason,
  };
  await db.update(tenants).set(changes).where(eq(tenants.id, tenantId));
  await appendAuditEvent({
    tenantId,
    actorUserId: actorId,
    entityType: "tenant",
    entityId: tenantId,
    eventType: "tenant.lifecycle_changed",
    operation: "status_change",
    oldValue: { status: before.status, planTier: before.planTier },
    newValue: changes,
    reason: update.reason,
  });
}

export async function listTenantEmployees(scope: TenantScope) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: users.id,
    tenantId: users.tenantId,
    name: users.name,
    email: users.email,
    role: users.role,
    department: users.department,
    territory: users.territory,
    hireDate: users.hireDate,
    status: users.status,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
    createdBy: users.createdBy,
  }).from(users).where(eq(users.tenantId, scope.tenantId)).orderBy(desc(users.createdAt));
}

export async function changeEmployeeStatus(scope: TenantScope, userId: number, status: "active" | "suspended" | "archived", reason: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const employee = await getTenantUserById(scope.tenantId, userId);
  if (!employee) throw new Error("Employee not found in the current tenant");
  await db.update(users).set({ status }).where(and(eq(users.id, userId), eq(users.tenantId, scope.tenantId)));
  await appendAuditEvent({
    tenantId: scope.tenantId,
    actorUserId: scope.userId,
    entityType: "user",
    entityId: String(userId),
    eventType: "employee.status_changed",
    operation: "status_change",
    oldValue: { status: employee.status },
    newValue: { status },
    reason,
  });
}

type AuditEventInput = {
  tenantId: string;
  actorUserId: number | null;
  entityType: string;
  entityId: string;
  eventType: string;
  operation: "create" | "status_change" | "access" | "provision";
  oldValue: unknown;
  newValue: unknown;
  reason: string | null;
};

export async function appendAuditEvent(input: AuditEventInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const [previous] = await db.select({ eventHash: auditEvents.eventHash })
    .from(auditEvents)
    .where(eq(auditEvents.tenantId, input.tenantId))
    .orderBy(desc(auditEvents.createdAt))
    .limit(1);
  const event = { ...input, previousHash: previous?.eventHash ?? null };
  await db.insert(auditEvents).values({ id: randomUUID(), ...event, eventHash: recordHash(event) });
}

export async function listVisits(scope: TenantScope) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(visitLogs).where(eq(visitLogs.tenantId, scope.tenantId)).orderBy(desc(visitLogs.occurredAt));
}

export async function createVisit(scope: TenantScope, input: {
  accountName: string; accountId?: string; cyclePlanId?: string; plannedVisitId?: string; objective: string; productsDiscussed: string[]; sampleTransactionIds?: string[]; nextSteps?: string; eSignatureId?: string; occurredAt: Date; supersedesId?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const id = randomUUID();
  await db.insert(visitLogs).values({
    id, tenantId: scope.tenantId, repUserId: scope.userId, accountId: input.accountId ?? null, cyclePlanId: input.cyclePlanId ?? null, plannedVisitId: input.plannedVisitId ?? null, accountName: input.accountName,
    objective: input.objective, productsDiscussed: input.productsDiscussed, samplesGiven: input.sampleTransactionIds ?? null, nextSteps: input.nextSteps ?? null, eSignatureId: input.eSignatureId ?? null,
    occurredAt: input.occurredAt, supersedesId: input.supersedesId ?? null, status: "recorded", createdBy: scope.userId,
  });
  if (input.sampleTransactionIds?.length) {
    const samples = await db.select({ id: sampleTransactions.id }).from(sampleTransactions)
      .where(and(eq(sampleTransactions.tenantId, scope.tenantId), inArray(sampleTransactions.id, input.sampleTransactionIds)));
    if (samples.length !== input.sampleTransactionIds.length) {
      throw new Error("A sample transaction reference is outside the active tenant");
    }
    await db.insert(visitSampleLinks).values(input.sampleTransactionIds.map(sampleTransactionId => ({
      id: randomUUID(), tenantId: scope.tenantId, visitLogId: id, sampleTransactionId, createdBy: scope.userId,
    })));
  }
  await appendAuditEvent({ tenantId: scope.tenantId, actorUserId: scope.userId, entityType: "visit_log", entityId: id,
    eventType: "visit.recorded", operation: "create", oldValue: null, newValue: { accountName: input.accountName, occurredAt: input.occurredAt }, reason: "Immutable visit record created" });
  return { id };
}

export async function listSampleTransactions(scope: TenantScope) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sampleTransactions).where(eq(sampleTransactions.tenantId, scope.tenantId)).orderBy(desc(sampleTransactions.occurredAt));
}

export async function createSampleTransaction(scope: TenantScope, input: {
  transactionType: "allocation" | "handoff" | "return" | "adjustment"; productName: string; lotNumber: string;
  expiryDate: string; quantity: string; toUserId?: number; visitLogId?: string; occurredAt: Date; compensatesId?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const id = randomUUID();
  await db.insert(sampleTransactions).values({
    id, tenantId: scope.tenantId, transactionType: input.transactionType, productName: input.productName, lotNumber: input.lotNumber,
    expiryDate: new Date(`${input.expiryDate}T00:00:00.000Z`), quantity: input.quantity, fromUserId: scope.userId, toUserId: input.toUserId ?? null,
    visitLogId: input.visitLogId ?? null, occurredAt: input.occurredAt, compensatesId: input.compensatesId ?? null, status: "recorded", createdBy: scope.userId,
  });
  await appendAuditEvent({ tenantId: scope.tenantId, actorUserId: scope.userId, entityType: "sample_transaction", entityId: id,
    eventType: "sample.recorded", operation: "create", oldValue: null, newValue: { lotNumber: input.lotNumber, quantity: input.quantity }, reason: "Immutable chain-of-custody record created" });
  return { id };
}

export async function listSignatures(scope: TenantScope) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(electronicSignatures).where(eq(electronicSignatures.tenantId, scope.tenantId)).orderBy(desc(electronicSignatures.signedAt));
}

export async function createSignature(scope: TenantScope, input: {
  subjectType: string; subjectId: string; meaning: "authorship" | "approval" | "review" | "attestation"; intentStatement: string; signatureSecret: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const id = randomUUID();
  await db.insert(electronicSignatures).values({
    id, tenantId: scope.tenantId, subjectType: input.subjectType, subjectId: input.subjectId, signerUserId: scope.userId,
    meaning: input.meaning, intentStatement: input.intentStatement, signatureTokenHash: recordHash({ userId: scope.userId, secret: input.signatureSecret, signedAt: new Date().toISOString() }),
    status: "recorded", createdBy: scope.userId,
  });
  await appendAuditEvent({ tenantId: scope.tenantId, actorUserId: scope.userId, entityType: "electronic_signature", entityId: id,
    eventType: "signature.recorded", operation: "create", oldValue: null, newValue: { subjectType: input.subjectType, subjectId: input.subjectId, meaning: input.meaning }, reason: "Immutable electronic signature created" });
  return { id };
}

export async function findLocalUser(email: string, tenantSlug?: string) {
  const db = await getDb();
  if (!db) return undefined;
  const records = await db.select({ user: users, tenant: tenants }).from(users).leftJoin(tenants, eq(users.tenantId, tenants.id)).where(eq(users.email, email.toLowerCase()));
  return records.find(record => tenantSlug ? record.tenant?.slug === tenantSlug : record.user.tenantId === null)?.user;
}
