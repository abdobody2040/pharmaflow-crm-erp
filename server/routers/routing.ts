import { and, eq, gte, lt } from "drizzle-orm";
import { z } from "zod";
import { accounts, plannedVisits } from "../../drizzle/schema";
import { getDb } from "../db";
import { optimizeWithOsrm, sequenceStops, type RouteStop } from "../services/routing";
import { resolveTenantScope } from "../security/access";
import { router, tenantRoleProcedure } from "../_core/trpc";

const routingRoles = ["admin", "manager", "rep"] as const;
const dayBounds = (date: Date) => { const start = new Date(date); start.setUTCHours(0, 0, 0, 0); const end = new Date(start); end.setUTCDate(end.getUTCDate() + 1); return { start, end }; };
async function buildDailyRoute(scope: ReturnType<typeof resolveTenantScope>, repUserId: number, date: Date) { const db = await getDb(); if (!db) return { stops: [], distanceMeters: 0, durationSeconds: 0, geometry: null, provider: "fallback" as const, skipped: [] }; const { start, end } = dayBounds(date); const visits = await db.select({ visit: plannedVisits, account: accounts }).from(plannedVisits).innerJoin(accounts, eq(plannedVisits.accountId, accounts.id)).where(and(eq(plannedVisits.tenantId, scope.tenantId), eq(plannedVisits.repUserId, repUserId), eq(plannedVisits.status, "planned"), gte(plannedVisits.plannedStartAt, start), lt(plannedVisits.plannedStartAt, end))); const tenantVisits = visits.filter(row => row.visit.tenantId === scope.tenantId && row.account.tenantId === scope.tenantId); const routeStops: RouteStop[] = tenantVisits.filter(row => row.account.latitude !== null && row.account.longitude !== null).map(row => ({ plannedVisitId: row.visit.id, accountId: row.account.id, accountName: row.account.name, latitude: Number(row.account.latitude), longitude: Number(row.account.longitude), priority: row.visit.priority, plannedStartAt: row.visit.plannedStartAt })); const skipped = tenantVisits.filter(row => row.account.latitude === null || row.account.longitude === null).map(row => ({ plannedVisitId: row.visit.id, accountName: row.account.name, reason: "Account lacks coordinates" })); const route = await optimizeWithOsrm(routeStops); return { stops: sequenceStops(route.orderedStops), distanceMeters: route.distanceMeters, durationSeconds: route.durationSeconds, geometry: route.geometry, provider: route.provider, skipped }; }
export const routingRouter = router({
  optimizeDaily: tenantRoleProcedure(routingRoles).input(z.object({ date: z.date(), repUserId: z.number().int().positive().optional() })).query(async ({ ctx, input }) => { const scope = resolveTenantScope(ctx.user!); const repUserId = ctx.user!.role === "rep" ? scope.userId : input.repUserId ?? scope.userId; return buildDailyRoute(scope, repUserId, input.date); }),
  mobileDaily: tenantRoleProcedure(routingRoles).input(z.object({ date: z.date() })).mutation(async ({ ctx, input }) => { const scope = resolveTenantScope(ctx.user!); return buildDailyRoute(scope, scope.userId, input.date); }),
});
