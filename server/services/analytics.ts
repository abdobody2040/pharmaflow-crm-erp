import { and, eq, gte } from "drizzle-orm";
import { accounts, expenseReports, sampleTransactions, visitLogs } from "../../drizzle/schema";
import { getDb } from "../db";

export type AnalyticsIntent = "visit_activity" | "expense_summary" | "sample_distribution" | "account_tiers";
export type AnalyticsPlan = { intent: AnalyticsIntent; title: string; explanation: string; chart: "bar" | "line" | "table"; xKey: string; yKey: string };
export type AnalyticsResult = { plan: AnalyticsPlan; columns: string[]; rows: Array<Record<string, string | number>>; summary: { headline: string; value: number; unit: string } };

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000);
const monthKey = (date: Date) => date.toISOString().slice(0, 7);

/** Maps natural-language phrasing only to audited, allow-listed semantic plans—never to arbitrary SQL. */
export function planAnalyticsQuestion(question: string): AnalyticsPlan {
  const text = question.trim().toLowerCase();
  if (/(expense|spend|reimburse|cost)/.test(text)) return { intent: "expense_summary", title: "Approved expense by category", explanation: "Approved and reimbursed expense records grouped by category for the last 90 days.", chart: "bar", xKey: "category", yKey: "amount" };
  if (/(sample|distribution|lot|handoff)/.test(text)) return { intent: "sample_distribution", title: "Sample distribution by product", explanation: "Recorded sample handoffs grouped by product for the last 90 days.", chart: "bar", xKey: "product", yKey: "quantity" };
  if (/(tier|account|hcp|doctor|pharmacy|hospital)/.test(text)) return { intent: "account_tiers", title: "Active accounts by tier", explanation: "Active CRM accounts grouped by account tier.", chart: "bar", xKey: "tier", yKey: "accounts" };
  if (/(visit|call|activity|engagement|rep)/.test(text)) return { intent: "visit_activity", title: "Visit activity by month", explanation: "Recorded visit evidence grouped by month for the last 90 days.", chart: "line", xKey: "month", yKey: "visits" };
  throw new Error("I can answer questions about visit activity, account tiers, approved expenses, or recorded sample distribution. Try one of the suggested questions.");
}

export async function runAnalyticsPlan(tenantId: string, plan: AnalyticsPlan): Promise<AnalyticsResult> {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  if (plan.intent === "visit_activity") {
    const rows = await db.select().from(visitLogs).where(and(eq(visitLogs.tenantId, tenantId), gte(visitLogs.occurredAt, daysAgo(90))));
    const grouped = new Map<string, number>(); for (const row of rows) grouped.set(monthKey(row.occurredAt), (grouped.get(monthKey(row.occurredAt)) ?? 0) + 1);
    const result = Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([month, visits]) => ({ month, visits })); return { plan, columns: ["month", "visits"], rows: result, summary: { headline: "Recorded visits", value: rows.length, unit: "visits" } };
  }
  if (plan.intent === "expense_summary") {
    const rows = await db.select().from(expenseReports).where(and(eq(expenseReports.tenantId, tenantId), gte(expenseReports.expenseDate, daysAgo(90) as any)));
    const grouped = new Map<string, number>(); for (const row of rows) if (row.status === "approved" || row.status === "reimbursed") grouped.set(row.category, (grouped.get(row.category) ?? 0) + Number(row.amount));
    const result = Array.from(grouped.entries()).map(([category, amount]) => ({ category, amount: Number(amount.toFixed(2)) })).sort((a, b) => b.amount - a.amount); return { plan, columns: ["category", "amount"], rows: result, summary: { headline: "Approved expense", value: Number(result.reduce((sum, item) => sum + item.amount, 0).toFixed(2)), unit: "USD" } };
  }
  if (plan.intent === "sample_distribution") {
    const rows = await db.select().from(sampleTransactions).where(and(eq(sampleTransactions.tenantId, tenantId), eq(sampleTransactions.transactionType, "handoff"), gte(sampleTransactions.occurredAt, daysAgo(90))));
    const grouped = new Map<string, number>(); for (const row of rows) grouped.set(row.productName, (grouped.get(row.productName) ?? 0) + Number(row.quantity));
    const result = Array.from(grouped.entries()).map(([product, quantity]) => ({ product, quantity })).sort((a, b) => b.quantity - a.quantity); return { plan, columns: ["product", "quantity"], rows: result, summary: { headline: "Recorded handoff quantity", value: result.reduce((sum, item) => sum + item.quantity, 0), unit: "units" } };
  }
  const rows = await db.select().from(accounts).where(and(eq(accounts.tenantId, tenantId), eq(accounts.status, "active"))); const grouped = new Map<string, number>(); for (const row of rows) grouped.set(row.tier, (grouped.get(row.tier) ?? 0) + 1);
  const result = Array.from(grouped.entries()).map(([tier, accounts]) => ({ tier, accounts })).sort((a, b) => a.tier.localeCompare(b.tier)); return { plan, columns: ["tier", "accounts"], rows: result, summary: { headline: "Active accounts", value: rows.length, unit: "accounts" } };
}
