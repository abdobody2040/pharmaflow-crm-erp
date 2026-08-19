import { randomUUID } from "crypto";
import {
  date,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

const tenantRecordId = (name: string) => varchar(name, { length: 36 }).$defaultFn(() => randomUUID());

export const tenantPlans = ["starter", "growth", "enterprise", "regulated"] as const;
export const tenantStatuses = ["active", "suspended", "pending"] as const;
export const userRoles = ["super_admin", "admin", "manager", "rep", "hr", "exec"] as const;
export const userStatuses = ["active", "suspended", "invited", "archived"] as const;
export const complianceStatuses = ["recorded", "voided", "superseded"] as const;

export const tenants = mysqlTable(
  "tenants",
  {
    id: tenantRecordId("id").primaryKey(),
    slug: varchar("slug", { length: 96 }).notNull(),
    legalName: varchar("legalName", { length: 255 }).notNull(),
    displayName: varchar("displayName", { length: 255 }).notNull(),
    planTier: mysqlEnum("planTier", tenantPlans).notNull().default("starter"),
    billingStatus: mysqlEnum("billingStatus", ["trial", "current", "past_due", "cancelled"]).notNull().default("trial"),
    status: mysqlEnum("status", tenantStatuses).notNull().default("pending"),
    region: varchar("region", { length: 96 }).default("global"),
    dataRetentionDays: varchar("dataRetentionDays", { length: 10 }).notNull().default("2555"),
    statusReason: text("statusReason"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    createdBy: int("createdBy"),
    suspendedAt: timestamp("suspendedAt"),
  },
  table => [uniqueIndex("tenants_slug_unique").on(table.slug), index("tenants_status_idx").on(table.status)],
);

/** User/employee master. Only global super-admin accounts have a null tenantId. */
export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    openId: varchar("openId", { length: 128 }).notNull(),
    tenantId: varchar("tenantId", { length: 36 }).references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" }),
    name: varchar("name", { length: 255 }),
    email: varchar("email", { length: 320 }).notNull(),
    passwordHash: varchar("passwordHash", { length: 255 }),
    loginMethod: varchar("loginMethod", { length: 64 }).notNull().default("local_jwt"),
    role: mysqlEnum("role", userRoles).notNull().default("rep"),
    department: varchar("department", { length: 160 }),
    territory: varchar("territory", { length: 160 }),
    hireDate: date("hireDate"),
    status: mysqlEnum("status", userStatuses).notNull().default("invited"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    createdBy: int("createdBy"),
    lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("users_open_id_unique").on(table.openId),
    uniqueIndex("users_tenant_email_unique").on(table.tenantId, table.email),
    index("users_tenant_status_idx").on(table.tenantId, table.status),
    index("users_tenant_role_idx").on(table.tenantId, table.role),
  ],
);

export const roles = mysqlTable(
  "roles",
  {
    id: tenantRecordId("id").primaryKey(),
    tenantId: varchar("tenantId", { length: 36 }).notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" }),
    code: mysqlEnum("code", userRoles).notNull(),
    label: varchar("label", { length: 96 }).notNull(),
    permissions: json("permissions").notNull(),
    status: mysqlEnum("status", ["active", "archived"]).notNull().default("active"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    createdBy: int("createdBy").notNull(),
  },
  table => [uniqueIndex("roles_tenant_code_unique").on(table.tenantId, table.code), index("roles_tenant_status_idx").on(table.tenantId, table.status)],
);

export const userRoleAssignments = mysqlTable(
  "userRoleAssignments",
  {
    id: tenantRecordId("id").primaryKey(),
    tenantId: varchar("tenantId", { length: 36 }).notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" }),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "restrict", onUpdate: "restrict" }),
    roleId: varchar("roleId", { length: 36 }).notNull().references(() => roles.id, { onDelete: "restrict", onUpdate: "restrict" }),
    status: mysqlEnum("status", ["active", "revoked"]).notNull().default("active"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    createdBy: int("createdBy").notNull(),
    reason: varchar("reason", { length: 500 }),
  },
  table => [index("user_role_assignments_tenant_user_idx").on(table.tenantId, table.userId), index("user_role_assignments_tenant_role_idx").on(table.tenantId, table.roleId)],
);

/** Immutable evidence chain. No UPDATE or DELETE procedure is ever exposed for this table. */
export const auditEvents = mysqlTable(
  "auditEvents",
  {
    id: tenantRecordId("id").primaryKey(),
    tenantId: varchar("tenantId", { length: 36 }).notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" }),
    actorUserId: int("actorUserId").references(() => users.id, { onDelete: "restrict", onUpdate: "restrict" }),
    entityType: varchar("entityType", { length: 96 }).notNull(),
    entityId: varchar("entityId", { length: 36 }).notNull(),
    eventType: varchar("eventType", { length: 96 }).notNull(),
    operation: mysqlEnum("operation", ["create", "status_change", "access", "provision"]).notNull(),
    oldValue: json("oldValue"),
    newValue: json("newValue"),
    reason: varchar("reason", { length: 500 }),
    previousHash: varchar("previousHash", { length: 128 }),
    eventHash: varchar("eventHash", { length: 128 }).notNull(),
    status: mysqlEnum("status", complianceStatuses).notNull().default("recorded"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("audit_events_tenant_created_idx").on(table.tenantId, table.createdAt), index("audit_events_entity_idx").on(table.tenantId, table.entityType, table.entityId)],
);

export const visitLogs = mysqlTable(
  "visitLogs",
  {
    id: tenantRecordId("id").primaryKey(),
    tenantId: varchar("tenantId", { length: 36 }).notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" }),
    repUserId: int("repUserId").notNull().references(() => users.id, { onDelete: "restrict", onUpdate: "restrict" }),
    accountName: varchar("accountName", { length: 255 }).notNull(),
    objective: text("objective").notNull(),
    productsDiscussed: json("productsDiscussed").notNull(),
    nextSteps: text("nextSteps"),
    occurredAt: timestamp("occurredAt").notNull(),
    supersedesId: varchar("supersedesId", { length: 36 }),
    status: mysqlEnum("status", complianceStatuses).notNull().default("recorded"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    createdBy: int("createdBy").notNull().references(() => users.id, { onDelete: "restrict", onUpdate: "restrict" }),
  },
  table => [index("visit_logs_tenant_occurred_idx").on(table.tenantId, table.occurredAt), index("visit_logs_tenant_rep_idx").on(table.tenantId, table.repUserId)],
);

export const sampleTransactions = mysqlTable(
  "sampleTransactions",
  {
    id: tenantRecordId("id").primaryKey(),
    tenantId: varchar("tenantId", { length: 36 }).notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" }),
    transactionType: mysqlEnum("transactionType", ["allocation", "handoff", "return", "adjustment"]).notNull(),
    productName: varchar("productName", { length: 255 }).notNull(),
    lotNumber: varchar("lotNumber", { length: 128 }).notNull(),
    expiryDate: date("expiryDate").notNull(),
    quantity: varchar("quantity", { length: 16 }).notNull(),
    fromUserId: int("fromUserId").references(() => users.id, { onDelete: "restrict", onUpdate: "restrict" }),
    toUserId: int("toUserId").references(() => users.id, { onDelete: "restrict", onUpdate: "restrict" }),
    visitLogId: varchar("visitLogId", { length: 36 }).references(() => visitLogs.id, { onDelete: "restrict", onUpdate: "restrict" }),
    occurredAt: timestamp("occurredAt").notNull(),
    compensatesId: varchar("compensatesId", { length: 36 }),
    status: mysqlEnum("status", complianceStatuses).notNull().default("recorded"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    createdBy: int("createdBy").notNull().references(() => users.id, { onDelete: "restrict", onUpdate: "restrict" }),
  },
  table => [index("sample_transactions_tenant_occurred_idx").on(table.tenantId, table.occurredAt), index("sample_transactions_tenant_lot_idx").on(table.tenantId, table.lotNumber)],
);

export const electronicSignatures = mysqlTable(
  "electronicSignatures",
  {
    id: tenantRecordId("id").primaryKey(),
    tenantId: varchar("tenantId", { length: 36 }).notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" }),
    subjectType: varchar("subjectType", { length: 96 }).notNull(),
    subjectId: varchar("subjectId", { length: 36 }).notNull(),
    signerUserId: int("signerUserId").notNull().references(() => users.id, { onDelete: "restrict", onUpdate: "restrict" }),
    meaning: mysqlEnum("meaning", ["authorship", "approval", "review", "attestation"]).notNull(),
    intentStatement: varchar("intentStatement", { length: 500 }).notNull(),
    signatureTokenHash: varchar("signatureTokenHash", { length: 128 }).notNull(),
    signedAt: timestamp("signedAt").defaultNow().notNull(),
    status: mysqlEnum("status", complianceStatuses).notNull().default("recorded"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    createdBy: int("createdBy").notNull().references(() => users.id, { onDelete: "restrict", onUpdate: "restrict" }),
  },
  table => [index("electronic_signatures_tenant_subject_idx").on(table.tenantId, table.subjectType, table.subjectId), index("electronic_signatures_tenant_signed_idx").on(table.tenantId, table.signedAt)],
);

export type Tenant = typeof tenants.$inferSelect;
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type UserRole = (typeof userRoles)[number];
export type TenantPlan = (typeof tenantPlans)[number];
