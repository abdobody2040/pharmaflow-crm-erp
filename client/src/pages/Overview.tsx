import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Activity, Building2, FileCheck2, Shield, UsersRound } from "lucide-react";

const controls = [
  { label: "Tenant isolation", description: "Mandatory scope guard on every tenant query", icon: Shield, tone: "bg-[#e9f8f2] text-[#178066]" },
  { label: "Immutable evidence", description: "Insert-only paths for regulated operational records", icon: FileCheck2, tone: "bg-[#eef2ff] text-[#5865cf]" },
  { label: "Role authority", description: "Procedure-level permissions mapped to business roles", icon: UsersRound, tone: "bg-[#fff4e7] text-[#b76a20]" },
];

export default function Overview() {
  const { data: user } = trpc.auth.me.useQuery();
  const { data: tenants = [] } = trpc.platform.listTenants.useQuery(undefined, { enabled: user?.role === "super_admin" });
  const activeTenants = tenants.filter(tenant => tenant.status === "active").length;
  return <div className="space-y-7">
    <section className="relative overflow-hidden rounded-[28px] bg-[#10203d] px-7 py-8 text-white shadow-[0_20px_45px_rgba(15,32,61,.18)] sm:px-9 sm:py-10">
      <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[#43d0a8]/20 blur-3xl" /><div className="absolute bottom-0 right-24 h-32 w-32 rounded-full bg-[#7e8ef5]/20 blur-3xl" />
      <div className="relative max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.17em] text-[#63e1ba]">System assurance overview</p><h2 className="mt-3 text-3xl font-bold tracking-[-.04em] sm:text-4xl">Good morning, {user?.name?.split(" ")[0] ?? "Operator"}.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">Your platform foundation is configured for tenant-separated operations and durable compliance evidence. Expand modules only through audited, scoped procedures.</p></div>
      <div className="relative mt-7 flex flex-wrap gap-3"><div className="rounded-xl border border-white/10 bg-white/[.08] px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-400">Session role</p><p className="mt-1 text-sm font-bold capitalize">{user?.role.replace("_", " ")}</p></div><div className="rounded-xl border border-white/10 bg-white/[.08] px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-400">Scope</p><p className="mt-1 text-sm font-bold">{user?.tenantId ? "Tenant-restricted" : "Platform-wide"}</p></div></div>
    </section>
    <section className="grid gap-4 md:grid-cols-3">
      {controls.map(control => <Card key={control.label} className="border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(34,53,79,.04)]"><CardContent className="p-5"><div className={`grid h-10 w-10 place-items-center rounded-xl ${control.tone}`}><control.icon className="h-5 w-5" /></div><h3 className="mt-4 text-sm font-bold text-[#1b263a]">{control.label}</h3><p className="mt-1 text-sm leading-5 text-slate-500">{control.description}</p></CardContent></Card>)}
    </section>
    <section className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]"><Card className="border-slate-200/80 bg-white"><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">Foundation status</p><h3 className="mt-1 text-lg font-bold tracking-[-.025em]">Operational control map</h3></div><Activity className="h-5 w-5 text-[#26a684]" /></div><div className="mt-6 space-y-4">{["Database records are tenant-scoped by mandatory query predicates.", "Compliance log writes expose create-only procedures; no update or deletion routes are registered.", "Lifecycle changes use explicit status states and capture hash-linked audit events."].map((item, index) => <div className="flex gap-3" key={item}><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#e9f8f2] text-xs font-bold text-[#178066]">{index + 1}</span><p className="pt-0.5 text-sm leading-5 text-slate-600">{item}</p></div>)}</div></CardContent></Card>
      <Card className="border-slate-200/80 bg-white"><CardContent className="p-6"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#f0f2ff] text-[#5865cf]"><Building2 className="h-5 w-5" /></div><div><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">Platform tenants</p><p className="mt-0.5 text-2xl font-bold tracking-[-.04em]">{user?.role === "super_admin" ? activeTenants : "—"}</p></div></div><p className="mt-5 text-sm leading-6 text-slate-500">{user?.role === "super_admin" ? `${activeTenants} active tenant${activeTenants === 1 ? "" : "s"} in the current platform registry.` : "Tenant counts are reserved for super-admins."}</p></CardContent></Card></section>
  </div>;
}
