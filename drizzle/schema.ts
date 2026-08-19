import { randomUUID } from "crypto";
import {
  date,
  decimal,
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

export const territories = mysqlTable("territories", {
  id: tenantRecordId("id").primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" }),
  name: varchar("name", { length: 180 }).notNull(), code: varchar("code", { length: 64 }).notNull(), region: varchar("region", { length: 120 }),
  managerUserId: int("managerUserId").references(() => users.id, { onDelete: "restrict", onUpdate: "restrict" }), boundaryGeoJson: json("boundaryGeoJson"),
  status: mysqlEnum("status", ["active", "inactive", "archived"]).notNull().default("active"), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(), createdBy: int("createdBy").notNull().references(() => users.id, { onDelete: "restrict", onUpdate: "restrict" }),
}, table => [uniqueIndex("territories_tenant_code_unique").on(table.tenantId, table.code), index("territories_tenant_status_idx").on(table.tenantId, table.status)]);

export const accounts = mysqlTable("accounts", {
  id: tenantRecordId("id").primaryKey(), tenantId: varchar("tenantId", { length: 36 }).notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" }),
  accountType: mysqlEnum("accountType", ["hcp", "pharmacy", "hospital", "distributor", "organization"]).notNull(), name: varchar("name", { length: 255 }).notNull(), externalReference: varchar("externalReference", { length: 128 }), specialty: varchar("specialty", { length: 160 }), tier: mysqlEnum("tier", ["a", "b", "c", "unclassified"]).notNull().default("unclassified"),
  territoryId: varchar("territoryId", { length: 36 }).references(() => territories.id, { onDelete: "restrict", onUpdate: "restrict" }), email: varchar("email", { length: 320 }), phone: varchar("phone", { length: 64 }), address: text("address"), latitude: decimal("latitude", { precision: 10, scale: 7 }), longitude: decimal("longitude", { precision: 10, scale: 7 }),
  status: mysqlEnum("status", ["active", "inactive", "archived"]).notNull().default("active"), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(), createdBy: int("createdBy").notNull().references(() => users.id, { onDelete: "restrict", onUpdate: "restrict" }),
}, table => [index("accounts_tenant_status_idx").on(table.tenantId, table.status), index("accounts_tenant_type_idx").on(table.tenantId, table.accountType), index("accounts_tenant_territory_idx").on(table.tenantId, table.territoryId)]);

export const contacts = mysqlTable("contacts", {
  id: tenantRecordId("id").primaryKey(), tenantId: varchar("tenantId", { length: 36 }).notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" }), accountId: varchar("accountId", { length: 36 }).notNull().references(() => accounts.id, { onDelete: "restrict", onUpdate: "restrict" }),
  firstName: varchar("firstName", { length: 128 }).notNull(), lastName: varchar("lastName", { length: 128 }).notNull(), title: varchar("title", { length: 160 }), email: varchar("email", { length: 320 }), phone: varchar("phone", { length: 64 }), preferredChannel: mysqlEnum("preferredChannel", ["email", "phone", "in_person", "whatsapp", "other"]).notNull().default("email"),
  status: mysqlEnum("status", ["active", "inactive", "archived"]).notNull().default("active"), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(), createdBy: int("createdBy").notNull().references(() => users.id, { onDelete: "restrict", onUpdate: "restrict" }),
}, table => [index("contacts_tenant_account_idx").on(table.tenantId, table.accountId), index("contacts_tenant_status_idx").on(table.tenantId, table.status)]);

export const cyclePlans = mysqlTable("cyclePlans", {
  id: tenantRecordId("id").primaryKey(), tenantId: varchar("tenantId", { length: 36 }).notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" }), name: varchar("name", { length: 255 }).notNull(), description: text("description"), startDate: date("startDate").notNull(), endDate: date("endDate").notNull(),
  status: mysqlEnum("status", ["draft", "active", "closed", "archived"]).notNull().default("draft"), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(), createdBy: int("createdBy").notNull().references(() => users.id, { onDelete: "restrict", onUpdate: "restrict" }),
}, table => [index("cycle_plans_tenant_status_idx").on(table.tenantId, table.status), index("cycle_plans_tenant_date_idx").on(table.tenantId, table.startDate, table.endDate)]);

export const plannedVisits = mysqlTable("plannedVisits", {
  id: tenantRecordId("id").primaryKey(), tenantId: varchar("tenantId", { length: 36 }).notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" }), cyclePlanId: varchar("cyclePlanId", { length: 36 }).notNull().references(() => cyclePlans.id, { onDelete: "restrict", onUpdate: "restrict" }), accountId: varchar("accountId", { length: 36 }).notNull().references(() => accounts.id, { onDelete: "restrict", onUpdate: "restrict" }), repUserId: int("repUserId").notNull().references(() => users.id, { onDelete: "restrict", onUpdate: "restrict" }),
  plannedStartAt: timestamp("plannedStartAt").notNull(), plannedEndAt: timestamp("plannedEndAt"), priority: mysqlEnum("priority", ["critical", "high", "normal", "low"]).notNull().default("normal"), objective: text("objective"), status: mysqlEnum("status", ["planned", "completed", "skipped", "rescheduled"]).notNull().default("planned"), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(), createdBy: int("createdBy").notNull().references(() => users.id, { onDelete: "restrict", onUpdate: "restrict" }),
}, table => [index("planned_visits_tenant_rep_date_idx").on(table.tenantId, table.repUserId, table.plannedStartAt), index("planned_visits_tenant_cycle_idx").on(table.tenantId, table.cyclePlanId)]);

export const opportunities = mysqlTable("opportunities", {
  id: tenantRecordId("id").primaryKey(), tenantId: varchar("tenantId", { length: 36 }).notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" }), accountId: varchar("accountId", { length: 36 }).references(() => accounts.id, { onDelete: "restrict", onUpdate: "restrict" }), name: varchar("name", { length: 255 }).notNull(), stage: mysqlEnum("stage", ["qualification", "discovery", "proposal", "negotiation", "won", "lost"]).notNull().default("qualification"), value: decimal("value", { precision: 14, scale: 2 }).notNull().default("0.00"), probability: int("probability").notNull().default(10), expectedCloseDate: date("expectedCloseDate"), ownerUserId: int("ownerUserId").notNull().references(() => users.id, { onDelete: "restrict", onUpdate: "restrict" }), status: mysqlEnum("status", ["open", "won", "lost", "archived"]).notNull().default("open"), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(), createdBy: int("createdBy").notNull().references(() => users.id, { onDelete: "restrict", onUpdate: "restrict" }),
}, table => [index("opportunities_tenant_stage_idx").on(table.tenantId, table.stage), index("opportunities_tenant_owner_idx").on(table.tenantId, table.ownerUserId)]);

export const repLocationConsents = mysqlTable("repLocationConsents", {
  id: tenantRecordId("id").primaryKey(), tenantId: varchar("tenantId", { length: 36 }).notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" }), repUserId: int("repUserId").notNull().references(() => users.id, { onDelete: "restrict", onUpdate: "restrict" }),
  policyVersion: varchar("policyVersion", { length: 64 }).notNull(), retentionDays: int("retentionDays").notNull(), status: mysqlEnum("status", ["consented", "revoked"]).notNull(), consentedAt: timestamp("consentedAt").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), createdBy: int("createdBy").notNull().references(() => users.id, { onDelete: "restrict", onUpdate: "restrict" }),
}, table => [index("rep_location_consents_tenant_rep_idx").on(table.tenantId, table.repUserId, table.consentedAt)]);

export const repShifts = mysqlTable("repShifts", {
  id: tenantRecordId("id").primaryKey(), tenantId: varchar("tenantId", { length: 36 }).notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" }), repUserId: int("repUserId").notNull().references(() => users.id, { onDelete: "restrict", onUpdate: "restrict" }), consentId: varchar("consentId", { length: 36 }).notNull().references(() => repLocationConsents.id, { onDelete: "restrict", onUpdate: "restrict" }),
  startedAt: timestamp("startedAt").notNull(), endedAt: timestamp("endedAt"), status: mysqlEnum("status", ["active", "ended"]).notNull().default("active"), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(), createdBy: int("createdBy").notNull().references(() => users.id, { onDelete: "restrict", onUpdate: "restrict" }),
}, table => [index("rep_shifts_tenant_rep_status_idx").on(table.tenantId, table.repUserId, table.status)]);

export const repLocationEvents = mysqlTable("repLocationEvents", {
  id: tenantRecordId("id").primaryKey(), tenantId: varchar("tenantId", { length: 36 }).notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" }), shiftId: varchar("shiftId", { length: 36 }).notNull().references(() => repShifts.id, { onDelete: "restrict", onUpdate: "restrict" }), repUserId: int("repUserId").notNull().references(() => users.id, { onDelete: "restrict", onUpdate: "restrict" }),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(), longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(), accuracyMeters: int("accuracyMeters"), cadenceSeconds: int("cadenceSeconds").notNull(), nearPlannedStop: int("nearPlannedStop").notNull().default(0), capturedAt: timestamp("capturedAt").notNull(), status: mysqlEnum("status", complianceStatuses).notNull().default("recorded"), createdAt: timestamp("createdAt").defaultNow().notNull(), createdBy: int("createdBy").notNull().references(() => users.id, { onDelete: "restrict", onUpdate: "restrict" }),
}, table => [index("rep_location_events_tenant_shift_captured_idx").on(table.tenantId, table.shiftId, table.capturedAt)]);

export const repSyncOperations = mysqlTable("repSyncOperations", {
  id: tenantRecordId("id").primaryKey(), tenantId: varchar("tenantId", { length: 36 }).notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" }), repUserId: int("repUserId").notNull().references(() => users.id, { onDelete: "restrict", onUpdate: "restrict" }), clientMutationId: varchar("clientMutationId", { length: 96 }).notNull(), operationType: mysqlEnum("operationType", ["visit", "sample", "location"]).notNull(), operationPayload: json("operationPayload").notNull(), status: mysqlEnum("status", ["applied", "rejected"]).notNull(), appliedAt: timestamp("appliedAt").defaultNow().notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), createdBy: int("createdBy").notNull().references(() => users.id, { onDelete: "restrict", onUpdate: "restrict" }),
}, table => [uniqueIndex("rep_sync_operations_tenant_mutation_unique").on(table.tenantId, table.repUserId, table.clientMutationId), index("rep_sync_operations_tenant_rep_idx").on(table.tenantId, table.repUserId, table.appliedAt)]);

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

export const geofences = mysqlTable("geofences", {
  id: tenantRecordId("id").primaryKey(), tenantId: varchar("tenantId", { length: 36 }).notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" }), territoryId: varchar("territoryId", { length: 36 }).references(() => territories.id, { onDelete: "restrict", onUpdate: "restrict" }), accountId: varchar("accountId", { length: 36 }).references(() => accounts.id, { onDelete: "restrict", onUpdate: "restrict" }),
  name: varchar("name", { length: 255 }).notNull(), geofenceType: mysqlEnum("geofenceType", ["territory", "hcp_stop"]).notNull(), latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(), longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(), radiusMeters: int("radiusMeters").notNull(), status: mysqlEnum("status", ["active", "inactive"]).notNull().default("active"), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(), createdBy: int("createdBy").notNull().references(() => users.id, { onDelete: "restrict", onUpdate: "restrict" }),
}, table => [index("geofences_tenant_status_idx").on(table.tenantId, table.status), index("geofences_tenant_type_idx").on(table.tenantId, table.geofenceType)]);

export const repGeofenceStates = mysqlTable("repGeofenceStates", {
  id: tenantRecordId("id").primaryKey(), tenantId: varchar("tenantId", { length: 36 }).notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" }), repUserId: int("repUserId").notNull().references(() => users.id, { onDelete: "restrict", onUpdate: "restrict" }), geofenceId: varchar("geofenceId", { length: 36 }).notNull().references(() => geofences.id, { onDelete: "restrict", onUpdate: "restrict" }), lastLocationEventId: varchar("lastLocationEventId", { length: 36 }).references(() => repLocationEvents.id, { onDelete: "restrict", onUpdate: "restrict" }), isInside: int("isInside").notNull().default(0), lastDistanceMeters: int("lastDistanceMeters").notNull(), lastObservedAt: timestamp("lastObservedAt").notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("rep_geofence_states_tenant_rep_geofence_unique").on(table.tenantId, table.repUserId, table.geofenceId)]);

export const geofenceEvents = mysqlTable("geofenceEvents", {
  id: tenantRecordId("id").primaryKey(), tenantId: varchar("tenantId", { length: 36 }).notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" }), repUserId: int("repUserId").notNull().references(() => users.id, { onDelete: "restrict", onUpdate: "restrict" }), shiftId: varchar("shiftId", { length: 36 }).notNull().references(() => repShifts.id, { onDelete: "restrict", onUpdate: "restrict" }), locationEventId: varchar("locationEventId", { length: 36 }).notNull().references(() => repLocationEvents.id, { onDelete: "restrict", onUpdate: "restrict" }), geofenceId: varchar("geofenceId", { length: 36 }).references(() => geofences.id, { onDelete: "restrict", onUpdate: "restrict" }), eventType: mysqlEnum("eventType", ["enter", "exit", "near", "far", "idle_started", "idle_ended"]).notNull(), distanceMeters: int("distanceMeters"), observedAt: timestamp("observedAt").notNull(), status: mysqlEnum("status", complianceStatuses).notNull().default("recorded"), createdAt: timestamp("createdAt").defaultNow().notNull(), createdBy: int("createdBy").notNull().references(() => users.id, { onDelete: "restrict", onUpdate: "restrict" }),
}, table => [index("geofence_events_tenant_shift_time_idx").on(table.tenantId, table.shiftId, table.observedAt), index("geofence_events_tenant_rep_time_idx").on(table.tenantId, table.repUserId, table.observedAt)]);

export const visitLogs = mysqlTable(
  "visitLogs",
  {
    id: tenantRecordId("id").primaryKey(),
    tenantId: varchar("tenantId", { length: 36 }).notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" }),
    repUserId: int("repUserId").notNull().references(() => users.id, { onDelete: "restrict", onUpdate: "restrict" }),
    accountId: varchar("accountId", { length: 36 }).references(() => accounts.id, { onDelete: "restrict", onUpdate: "restrict" }),
    cyclePlanId: varchar("cyclePlanId", { length: 36 }).references(() => cyclePlans.id, { onDelete: "restrict", onUpdate: "restrict" }),
    plannedVisitId: varchar("plannedVisitId", { length: 36 }).references(() => plannedVisits.id, { onDelete: "restrict", onUpdate: "restrict" }),
    accountName: varchar("accountName", { length: 255 }).notNull(),
    objective: text("objective").notNull(),
    productsDiscussed: json("productsDiscussed").notNull(),
    samplesGiven: json("samplesGiven"),
    nextSteps: text("nextSteps"),
    eSignatureId: varchar("eSignatureId", { length: 36 }).references(() => electronicSignatures.id, { onDelete: "restrict", onUpdate: "restrict" }),
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

export const visitSampleLinks = mysqlTable(
  "visitSampleLinks",
  {
    id: tenantRecordId("id").primaryKey(),
    tenantId: varchar("tenantId", { length: 36 }).notNull().references(() => tenants.id, { onDelete: "restrict", onUpdate: "restrict" }),
    visitLogId: varchar("visitLogId", { length: 36 }).notNull().references(() => visitLogs.id, { onDelete: "restrict", onUpdate: "restrict" }),
    sampleTransactionId: varchar("sampleTransactionId", { length: 36 }).notNull().references(() => sampleTransactions.id, { onDelete: "restrict", onUpdate: "restrict" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    createdBy: int("createdBy").notNull().references(() => users.id, { onDelete: "restrict", onUpdate: "restrict" }),
  },
  table => [uniqueIndex("visit_sample_links_tenant_unique").on(table.tenantId, table.visitLogId, table.sampleTransactionId), index("visit_sample_links_tenant_visit_idx").on(table.tenantId, table.visitLogId)],
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
