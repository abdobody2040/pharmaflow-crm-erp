import { and, desc, eq, gte, lte } from "drizzle-orm";
import { randomUUID } from "crypto";
import { z } from "zod";
import {
  attendanceRecords,
  expenseReports,
  geofences,
  leaveRequests,
  payrollExportRuns,
  repLocationEvents,
  users,
} from "../../drizzle/schema";
import { appendAuditEvent, getDb } from "../db";
import {
  decideAttendance,
  formatPayrollContent,
  isValidExpenseTransition,
  isValidLeaveTransition,
} from "../services/hrWorkflow";
import { resolveTenantScope } from "../security/access";
import { storagePut } from "../storage";
import { router, tenantRoleProcedure } from "../_core/trpc";

const employeeRoles = ["admin", "manager", "rep", "hr"] as const;
const reviewerRoles = ["admin", "manager", "hr"] as const;
const payrollRoles = ["admin", "hr"] as const;
const dateInput = z.coerce.date();
const attendanceDate = () => new Date();
const reviewStatus = z.enum(["approved", "rejected"]);
const safeImage = z.string().regex(/^data:image\/(png|jpeg|webp);base64,/);
const decodeReceipt = (dataUrl: string) => {
  const [header, body] = dataUrl.split(",", 2);
  if (!header || !body) throw new Error("Invalid receipt image");
  const mime = header.match(/^data:(image\/(?:png|jpeg|webp));base64$/)?.[1];
  if (!mime) throw new Error("Unsupported receipt type");
  const buffer = Buffer.from(body, "base64");
  if (buffer.byteLength > 5 * 1024 * 1024)
    throw new Error("Receipt image exceeds 5 MB");
  return {
    mime,
    buffer,
    extension: mime === "image/jpeg" ? "jpg" : mime.split("/")[1]!,
  };
};

export const hrRouter = router({
  employees: router({
    list: tenantRoleProcedure(reviewerRoles).query(async ({ ctx }) => {
      const scope = resolveTenantScope(ctx.user!);
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(users)
        .where(eq(users.tenantId, scope.tenantId))
        .orderBy(desc(users.createdAt))
        .limit(200);
    }),
    update: tenantRoleProcedure(reviewerRoles)
      .input(
        z.object({
          userId: z.number().int().positive(),
          department: z.string().max(160).nullable().optional(),
          territory: z.string().max(160).nullable().optional(),
          status: z.enum(["active", "suspended", "archived"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const scope = resolveTenantScope(ctx.user!);
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        const [employee] = await db
          .select()
          .from(users)
          .where(
            and(eq(users.id, input.userId), eq(users.tenantId, scope.tenantId))
          )
          .limit(1);
        if (!employee) throw new Error("Employee not found in active tenant");
        const changes = {
          ...(input.department !== undefined
            ? { department: input.department }
            : {}),
          ...(input.territory !== undefined
            ? { territory: input.territory }
            : {}),
          ...(input.status ? { status: input.status } : {}),
        };
        await db.update(users).set(changes).where(eq(users.id, input.userId));
        await appendAuditEvent({
          tenantId: scope.tenantId,
          actorUserId: scope.userId,
          entityType: "employee",
          entityId: String(input.userId),
          eventType: "employee.updated",
          operation: "status_change",
          oldValue: {
            department: employee.department,
            territory: employee.territory,
            status: employee.status,
          },
          newValue: changes,
          reason: "HR employee record lifecycle update",
        });
        return { success: true };
      }),
  }),
  attendance: router({
    list: tenantRoleProcedure(reviewerRoles)
      .input(
        z.object({ userId: z.number().int().positive().optional() }).optional()
      )
      .query(async ({ ctx, input }) => {
        const scope = resolveTenantScope(ctx.user!);
        const db = await getDb();
        if (!db) return [];
        return db
          .select()
          .from(attendanceRecords)
          .where(
            and(
              eq(attendanceRecords.tenantId, scope.tenantId),
              ...(input?.userId
                ? [eq(attendanceRecords.userId, input.userId)]
                : [])
            )
          )
          .orderBy(desc(attendanceRecords.createdAt))
          .limit(200);
      }),
    checkIn: tenantRoleProcedure(employeeRoles)
      .input(
        z.object({ locationEventId: z.string().uuid().optional() }).optional()
      )
      .mutation(async ({ ctx, input }) => {
        const scope = resolveTenantScope(ctx.user!);
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        const [location] = await db
          .select()
          .from(repLocationEvents)
          .where(
            and(
              eq(repLocationEvents.tenantId, scope.tenantId),
              eq(repLocationEvents.repUserId, scope.userId),
              ...(input?.locationEventId
                ? [eq(repLocationEvents.id, input.locationEventId)]
                : [])
            )
          )
          .orderBy(desc(repLocationEvents.capturedAt))
          .limit(1);
        if (!location)
          throw new Error(
            "Location evidence is not available for this employee"
          );
        const fences = await db
          .select()
          .from(geofences)
          .where(
            and(
              eq(geofences.tenantId, scope.tenantId),
              eq(geofences.status, "active")
            )
          );
        const decision = decideAttendance(
          {
            latitude: Number(location.latitude),
            longitude: Number(location.longitude),
          },
          fences
        );
        const id = randomUUID();
        await db.insert(attendanceRecords).values({
          id,
          tenantId: scope.tenantId,
          userId: scope.userId,
          locationEventId: location.id,
          geofenceId: decision.geofenceId,
          attendanceDate: attendanceDate(),
          eventType: decision.eligible ? "check_in" : "outside_geofence",
          latitude: location.latitude,
          longitude: location.longitude,
          distanceMeters: decision.distanceMeters,
          createdBy: scope.userId,
        });
        await appendAuditEvent({
          tenantId: scope.tenantId,
          actorUserId: scope.userId,
          entityType: "attendance_record",
          entityId: id,
          eventType: decision.eligible
            ? "attendance.check_in"
            : "attendance.outside_geofence",
          operation: "create",
          oldValue: null,
          newValue: {
            locationEventId: location.id,
            geofenceId: decision.geofenceId,
            distanceMeters: decision.distanceMeters,
          },
          reason: "GPS-backed attendance evaluation",
        });
        return {
          id,
          eligible: decision.eligible,
          distanceMeters: decision.distanceMeters,
        };
      }),
  }),
  leave: router({
    list: tenantRoleProcedure(employeeRoles).query(async ({ ctx }) => {
      const scope = resolveTenantScope(ctx.user!);
      const db = await getDb();
      if (!db) return [];
      const canReview = reviewerRoles.includes(
        ctx.user!.role as (typeof reviewerRoles)[number]
      );
      return db
        .select()
        .from(leaveRequests)
        .where(
          and(
            eq(leaveRequests.tenantId, scope.tenantId),
            ...(canReview
              ? []
              : [eq(leaveRequests.employeeUserId, scope.userId)])
          )
        )
        .orderBy(desc(leaveRequests.createdAt))
        .limit(200);
    }),
    submit: tenantRoleProcedure(employeeRoles)
      .input(
        z.object({
          leaveType: z.enum(["annual", "sick", "personal", "unpaid", "other"]),
          startDate: dateInput,
          endDate: dateInput,
          reason: z.string().max(2000).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const scope = resolveTenantScope(ctx.user!);
        if (input.endDate.getTime() < input.startDate.getTime())
          throw new Error("Leave end date must follow start date");
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        const id = randomUUID();
        await db.insert(leaveRequests).values({
          id,
          tenantId: scope.tenantId,
          employeeUserId: scope.userId,
          leaveType: input.leaveType,
          startDate: input.startDate,
          endDate: input.endDate,
          reason: input.reason ?? null,
          createdBy: scope.userId,
        });
        await appendAuditEvent({
          tenantId: scope.tenantId,
          actorUserId: scope.userId,
          entityType: "leave_request",
          entityId: id,
          eventType: "leave.submitted",
          operation: "create",
          oldValue: null,
          newValue: input,
          reason: "Employee leave submission",
        });
        return { id };
      }),
    review: tenantRoleProcedure(reviewerRoles)
      .input(
        z.object({
          id: z.string().uuid(),
          status: reviewStatus,
          note: z.string().max(2000).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const scope = resolveTenantScope(ctx.user!);
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        const [request] = await db
          .select()
          .from(leaveRequests)
          .where(
            and(
              eq(leaveRequests.id, input.id),
              eq(leaveRequests.tenantId, scope.tenantId)
            )
          )
          .limit(1);
        if (!request || !isValidLeaveTransition(request.status, input.status))
          throw new Error("Leave request is not awaiting review");
        const changes = {
          status: input.status,
          reviewerUserId: scope.userId,
          reviewedAt: new Date(),
          reviewNote: input.note ?? null,
        };
        await db
          .update(leaveRequests)
          .set(changes)
          .where(eq(leaveRequests.id, input.id));
        await appendAuditEvent({
          tenantId: scope.tenantId,
          actorUserId: scope.userId,
          entityType: "leave_request",
          entityId: input.id,
          eventType: `leave.${input.status}`,
          operation: "status_change",
          oldValue: { status: request.status },
          newValue: changes,
          reason: "Leave approval workflow",
        });
        return { success: true };
      }),
    cancel: tenantRoleProcedure(employeeRoles)
      .input(
        z.object({
          id: z.string().uuid(),
          note: z.string().max(2000).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const scope = resolveTenantScope(ctx.user!);
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        const [request] = await db
          .select()
          .from(leaveRequests)
          .where(
            and(
              eq(leaveRequests.id, input.id),
              eq(leaveRequests.tenantId, scope.tenantId),
              eq(leaveRequests.employeeUserId, scope.userId)
            )
          )
          .limit(1);
        if (!request || !isValidLeaveTransition(request.status, "cancelled"))
          throw new Error("Leave request cannot be cancelled");
        const changes = {
          status: "cancelled" as const,
          reviewNote: input.note ?? request.reviewNote,
        };
        await db
          .update(leaveRequests)
          .set(changes)
          .where(eq(leaveRequests.id, input.id));
        await appendAuditEvent({
          tenantId: scope.tenantId,
          actorUserId: scope.userId,
          entityType: "leave_request",
          entityId: input.id,
          eventType: "leave.cancelled",
          operation: "status_change",
          oldValue: { status: request.status },
          newValue: changes,
          reason: "Employee leave cancellation",
        });
        return { success: true };
      }),
  }),
  expenses: router({
    list: tenantRoleProcedure(employeeRoles).query(async ({ ctx }) => {
      const scope = resolveTenantScope(ctx.user!);
      const db = await getDb();
      if (!db) return [];
      const canReview = reviewerRoles.includes(
        ctx.user!.role as (typeof reviewerRoles)[number]
      );
      return db
        .select()
        .from(expenseReports)
        .where(
          and(
            eq(expenseReports.tenantId, scope.tenantId),
            ...(canReview
              ? []
              : [eq(expenseReports.employeeUserId, scope.userId)])
          )
        )
        .orderBy(desc(expenseReports.createdAt))
        .limit(200);
    }),
    submit: tenantRoleProcedure(employeeRoles)
      .input(
        z.object({
          category: z.enum([
            "travel",
            "lodging",
            "meals",
            "mileage",
            "supplies",
            "other",
          ]),
          amount: z.number().positive(),
          currency: z.string().length(3).default("USD"),
          expenseDate: dateInput,
          description: z.string().max(2000).optional(),
          receiptDataUrl: safeImage.optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const scope = resolveTenantScope(ctx.user!);
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        const id = randomUUID();
        let receipt: { key: string; url: string; mime: string } | null = null;
        if (input.receiptDataUrl) {
          const decoded = decodeReceipt(input.receiptDataUrl);
          const stored = await storagePut(
            `${scope.tenantId}/expenses/${id}/receipt.${decoded.extension}`,
            decoded.buffer,
            decoded.mime
          );
          receipt = { ...stored, mime: decoded.mime };
        }
        await db.insert(expenseReports).values({
          id,
          tenantId: scope.tenantId,
          employeeUserId: scope.userId,
          category: input.category,
          amount: String(input.amount),
          currency: input.currency.toUpperCase(),
          expenseDate: input.expenseDate,
          description: input.description ?? null,
          receiptKey: receipt?.key ?? null,
          receiptUrl: receipt?.url ?? null,
          receiptMimeType: receipt?.mime ?? null,
          createdBy: scope.userId,
        });
        await appendAuditEvent({
          tenantId: scope.tenantId,
          actorUserId: scope.userId,
          entityType: "expense_report",
          entityId: id,
          eventType: "expense.submitted",
          operation: "create",
          oldValue: null,
          newValue: {
            category: input.category,
            amount: input.amount,
            expenseDate: input.expenseDate,
            receiptKey: receipt?.key ?? null,
          },
          reason: "Employee expense submission",
        });
        return { id, receiptUrl: receipt?.url ?? null };
      }),
    review: tenantRoleProcedure(reviewerRoles)
      .input(
        z.object({
          id: z.string().uuid(),
          status: reviewStatus,
          note: z.string().max(2000).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const scope = resolveTenantScope(ctx.user!);
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        const [report] = await db
          .select()
          .from(expenseReports)
          .where(
            and(
              eq(expenseReports.id, input.id),
              eq(expenseReports.tenantId, scope.tenantId)
            )
          )
          .limit(1);
        if (!report || !isValidExpenseTransition(report.status, input.status))
          throw new Error("Expense report is not awaiting review");
        const changes = {
          status: input.status,
          reviewerUserId: scope.userId,
          reviewedAt: new Date(),
          reviewNote: input.note ?? null,
        };
        await db
          .update(expenseReports)
          .set(changes)
          .where(eq(expenseReports.id, input.id));
        await appendAuditEvent({
          tenantId: scope.tenantId,
          actorUserId: scope.userId,
          entityType: "expense_report",
          entityId: input.id,
          eventType: `expense.${input.status}`,
          operation: "status_change",
          oldValue: { status: report.status },
          newValue: changes,
          reason: "Expense approval workflow",
        });
        return { success: true };
      }),
    reimburse: tenantRoleProcedure(reviewerRoles)
      .input(
        z.object({
          id: z.string().uuid(),
          note: z.string().max(2000).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const scope = resolveTenantScope(ctx.user!);
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        const [report] = await db
          .select()
          .from(expenseReports)
          .where(
            and(
              eq(expenseReports.id, input.id),
              eq(expenseReports.tenantId, scope.tenantId)
            )
          )
          .limit(1);
        if (!report || !isValidExpenseTransition(report.status, "reimbursed"))
          throw new Error("Only approved expenses can be reimbursed");
        const changes = {
          status: "reimbursed" as const,
          reviewerUserId: scope.userId,
          reviewedAt: new Date(),
          reviewNote: input.note ?? report.reviewNote,
        };
        await db
          .update(expenseReports)
          .set(changes)
          .where(eq(expenseReports.id, input.id));
        await appendAuditEvent({
          tenantId: scope.tenantId,
          actorUserId: scope.userId,
          entityType: "expense_report",
          entityId: input.id,
          eventType: "expense.reimbursed",
          operation: "status_change",
          oldValue: { status: report.status },
          newValue: changes,
          reason: "Expense reimbursement lifecycle",
        });
        return { success: true };
      }),
  }),
  payroll: router({
    export: tenantRoleProcedure(payrollRoles)
      .input(
        z.object({
          periodStart: dateInput,
          periodEnd: dateInput,
          format: z.enum(["csv", "xlsx"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const scope = resolveTenantScope(ctx.user!);
        if (input.periodEnd.getTime() < input.periodStart.getTime())
          throw new Error("Payroll period end must follow start date");
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        const employees = await db
          .select()
          .from(users)
          .where(
            and(eq(users.tenantId, scope.tenantId), eq(users.status, "active"))
          );
        const leave = await db
          .select()
          .from(leaveRequests)
          .where(
            and(
              eq(leaveRequests.tenantId, scope.tenantId),
              eq(leaveRequests.status, "approved"),
              gte(leaveRequests.startDate, input.periodStart),
              lte(leaveRequests.endDate, input.periodEnd)
            )
          );
        const expenses = await db
          .select()
          .from(expenseReports)
          .where(
            and(
              eq(expenseReports.tenantId, scope.tenantId),
              eq(expenseReports.status, "approved"),
              gte(expenseReports.expenseDate, input.periodStart),
              lte(expenseReports.expenseDate, input.periodEnd)
            )
          );
        const rows = employees.map(employee => ({
          employeeId: employee.id,
          employee: employee.name ?? employee.email ?? "",
          department: employee.department ?? "",
          territory: employee.territory ?? "",
          approvedLeaveRequests: leave.filter(
            item => item.employeeUserId === employee.id
          ).length,
          approvedExpenseTotal: expenses
            .filter(item => item.employeeUserId === employee.id)
            .reduce((total, item) => total + Number(item.amount), 0)
            .toFixed(2),
          currency:
            expenses.find(item => item.employeeUserId === employee.id)
              ?.currency ?? "USD",
        }));
        const runId = randomUUID();
        await db.insert(payrollExportRuns).values({
          id: runId,
          tenantId: scope.tenantId,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          format: input.format,
          rowCount: rows.length,
          createdBy: scope.userId,
        });
        await appendAuditEvent({
          tenantId: scope.tenantId,
          actorUserId: scope.userId,
          entityType: "payroll_export",
          entityId: runId,
          eventType: "payroll.exported",
          operation: "create",
          oldValue: null,
          newValue: {
            periodStart: input.periodStart,
            periodEnd: input.periodEnd,
            format: input.format,
            rowCount: rows.length,
          },
          reason: "Authorized payroll export",
        });
        const periodLabel = `${input.periodStart.toISOString().slice(0, 10)}-${input.periodEnd.toISOString().slice(0, 10)}`;
        const formatted = await formatPayrollContent(rows, input.format);
        return {
          filename: `payroll-${periodLabel}.${input.format}`,
          ...formatted,
        };
      }),
  }),
});
