import { useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, FileText, LayoutDashboard, LoaderCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type BiView = "rep" | "manager" | "fleet" | "exec";

function achievementTone(value: number) {
  if (value >= 90) return "bg-emerald-500";
  if (value >= 70) return "bg-emerald-300";
  if (value >= 45) return "bg-amber-300";
  return "bg-rose-300";
}

export default function BI() {
  const { user } = useAuth();
  const allowed: BiView[] = user?.role === "rep" ? ["rep"] : user?.role === "exec" ? ["exec"] : ["manager", "fleet", "exec", "rep"];
  const [view, setView] = useState<BiView>("manager");
  useEffect(() => { setView(user?.role === "rep" ? "rep" : user?.role === "exec" ? "exec" : "manager"); }, [user?.role]);
  const dashboard = trpc.bi.dashboard.useQuery({ view });
  const exportReport = trpc.bi.export.useMutation({ onSuccess: file => { const link = document.createElement("a"); link.href = `data:${file.mimeType};base64,${file.base64}`; link.download = file.filename; link.click(); } });
  const data = dashboard.data;
  const rowKeys = Object.keys(data?.rows?.[0] ?? {});
  const managerRows = view === "manager" ? data?.rows ?? [] : [];

  return <div className="space-y-6">
    <section className="rounded-3xl bg-[#10203d] p-7 text-white shadow-lg shadow-slate-900/10"><p className="text-xs font-bold uppercase tracking-widest text-[#63e1ba]">Business intelligence</p><div className="mt-2 flex flex-wrap justify-between gap-4"><div><h2 className="text-3xl font-bold">{data?.title ?? "Role-based dashboard"}</h2><p className="mt-2 text-sm text-slate-300">Tenant-scoped coverage, operations, and KPI reporting.</p></div><div className="flex flex-wrap gap-2"><Select value={view} onValueChange={value => setView(value as BiView)}><SelectTrigger className="w-36 bg-white text-slate-900"><SelectValue /></SelectTrigger><SelectContent>{allowed.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select><Button disabled={exportReport.isPending || dashboard.isLoading} onClick={() => exportReport.mutate({ view, format: "xlsx" })}>{exportReport.isPending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}XLSX</Button><Button disabled={exportReport.isPending || dashboard.isLoading} variant="outline" className="border-white/30 text-white" onClick={() => exportReport.mutate({ view, format: "pdf" })}><FileText className="mr-2 h-4 w-4" />PDF</Button></div></div></section>
    {dashboard.error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Unable to load this permitted BI view: {dashboard.error.message}</p>}{exportReport.error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Report export could not be completed: {exportReport.error.message}</p>}
    {dashboard.isLoading ? <div className="grid gap-4 md:grid-cols-3">{[1, 2, 3].map(item => <Card key={item}><CardContent className="h-28 animate-pulse bg-slate-100 p-5" /></Card>)}</div> : <><div className="grid gap-4 md:grid-cols-3">{data?.kpis.map(kpi => <Card key={kpi.label}><CardContent className="p-5"><p className="text-xs uppercase tracking-wide text-slate-500">{kpi.label}</p><p className="mt-2 text-3xl font-bold">{kpi.value}{kpi.unit ?? ""}</p></CardContent></Card>)}</div>
      {view === "manager" && <Card><CardContent className="p-6"><div><p className="text-xs font-bold uppercase tracking-widest text-[#147d66]">Team coverage heatmap</p><h3 className="mt-1 font-bold">Target achievement by representative</h3></div>{managerRows.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{managerRows.map((row, index) => { const achievement = Number(row.achievement ?? 0); return <div key={`${row.rep}-${index}`} className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between gap-3"><span className="font-medium text-slate-800">{row.rep}</span><span className="text-sm font-bold text-slate-700">{achievement}%</span></div><div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${achievementTone(achievement)}`} style={{ width: `${Math.min(achievement, 100)}%` }} /></div><p className="mt-3 text-xs text-slate-500">{row.visits} completed of {row.planned} planned calls</p></div>; })}</div> : <p className="mt-5 rounded-lg bg-slate-50 p-5 text-sm text-slate-500">No team call-plan data is available for this reporting period.</p>}</CardContent></Card>}
      <Card><CardContent className="p-6"><div className="flex items-center gap-2"><LayoutDashboard className="h-5 w-5 text-[#147d66]" /><h3 className="font-bold">Performance detail</h3></div>{data?.rows.length ? <><div className="mt-5 h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.rows}><XAxis dataKey={rowKeys[0]} /><YAxis /><Tooltip /><Bar dataKey={rowKeys[1]} fill="#147d66" /></BarChart></ResponsiveContainer></div><div className="mt-5 overflow-x-auto"><table className="w-full text-sm"><thead><tr>{rowKeys.map(key => <th key={key} className="border-b p-2 text-left font-medium text-slate-500">{key}</th>)}</tr></thead><tbody>{data.rows.map((row, index) => <tr key={index}>{rowKeys.map(key => <td key={key} className="border-b p-2">{row[key]}</td>)}</tr>)}</tbody></table></div></> : <p className="mt-5 rounded-lg bg-slate-50 p-5 text-sm text-slate-500">No permitted data is available for this reporting view yet.</p>}</CardContent></Card></>}
  </div>;
}
