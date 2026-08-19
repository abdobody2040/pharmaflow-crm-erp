import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Activity, BadgeCheck, Building2, ChevronRight, ClipboardList, ContactRound, FileSignature,
  BarChart3, KanbanSquare, LayoutDashboard, LogOut, MapPinned, Megaphone, Menu, Route, Settings, ShieldCheck, Sparkles, UsersRound,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import LoginPage from "@/pages/Login";

type MenuItem = { label: string; path: string; icon: typeof LayoutDashboard; roles?: string[] };

const sections: Array<{ title: string; items: MenuItem[] }> = [
  { title: "Workspace", items: [{ label: "Command Center", path: "/", icon: LayoutDashboard }] },
  { title: "Rep Tools", items: [{ label: "My Field Day", path: "/rep", icon: Activity, roles: ["admin", "manager", "rep"] }, { label: "Call Assistant", path: "/rep/assistant", icon: Sparkles, roles: ["admin", "manager", "rep"] }] },
  { title: "People", items: [{ label: "ERP / HR", path: "/hr", icon: UsersRound, roles: ["admin", "manager", "rep", "hr"] }] },
  { title: "Engagement", items: [{ label: "Marketing & CLM", path: "/marketing", icon: Megaphone, roles: ["admin", "manager", "exec"] }] },
  { title: "Intelligence", items: [{ label: "AI Control Center", path: "/ai", icon: Sparkles, roles: ["admin", "manager"] }, { label: "Analytics & Alerts", path: "/analytics", icon: BarChart3, roles: ["admin", "manager", "exec"] }, { label: "BI Dashboards", path: "/bi", icon: BarChart3, roles: ["admin", "manager", "rep", "exec"] }] },
  { title: "Routing", items: [{ label: "Daily Routes", path: "/routes", icon: Route, roles: ["admin", "manager", "rep"] }] },
  { title: "Operations", items: [{ label: "GPS Operations", path: "/tracking", icon: MapPinned, roles: ["admin", "manager", "exec"] }] },
  { title: "Platform", items: [{ label: "Tenant Management", path: "/tenants", icon: Building2, roles: ["super_admin"] }] },
  { title: "Core CRM", items: [
    { label: "Accounts & HCPs", path: "/crm/accounts", icon: Building2, roles: ["admin", "manager", "rep", "exec"] },
    { label: "Contacts", path: "/crm/contacts", icon: ContactRound, roles: ["admin", "manager", "rep", "exec"] },
    { label: "Territories & Plans", path: "/crm/plans", icon: MapPinned, roles: ["admin", "manager", "rep", "exec"] },
    { label: "Manage Territories", path: "/crm/territories", icon: MapPinned, roles: ["admin", "manager"] },
    { label: "Cycle Planner", path: "/crm/cycles", icon: ClipboardList, roles: ["admin", "manager"] },
    { label: "Opportunity Pipeline", path: "/crm/opportunities", icon: KanbanSquare, roles: ["admin", "manager", "rep", "exec"] },
  ] },
  { title: "Operations", items: [
    { label: "Employee Directory", path: "/directory", icon: UsersRound, roles: ["admin", "manager", "hr", "exec"] },
    { label: "Visit Logs", path: "/visits", icon: ClipboardList, roles: ["admin", "manager", "exec"] },
    { label: "Log Visit", path: "/visits/new", icon: ClipboardList, roles: ["admin", "manager", "rep"] },
    { label: "Sample Transactions", path: "/samples", icon: Activity, roles: ["admin", "manager", "exec"] },
    { label: "E-Signatures", path: "/signatures", icon: FileSignature, roles: ["admin", "manager", "exec"] },
  ] },
  { title: "Governance", items: [{ label: "Settings", path: "/settings", icon: Settings }] },
];

function initials(name: string | null | undefined) {
  return (name ?? "PF").split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase();
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) return <div className="min-h-screen bg-[#f6f7f9]" />;
  if (!user) return <LoginPage />;

  const currentItem = sections.flatMap(section => section.items).find(item => item.path === location)?.label ?? "PharmaFlow";
  const allowedSections = sections.map(section => ({
    ...section,
    items: section.items.filter(item => !item.roles || item.roles.includes(user.role)),
  })).filter(section => section.items.length > 0);

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-[#101828]">
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[284px] flex-col border-r border-slate-200/70 bg-[#0c162b] px-4 py-5 text-slate-200 transition-transform duration-200 lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="mb-9 flex items-center gap-3 px-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#49d5a7] to-[#1d9c87] shadow-[0_8px_24px_rgba(51,211,161,.28)]">
            <ShieldCheck className="h-5 w-5 text-[#07152a]" strokeWidth={2.4} />
          </div>
          <div>
            <p className="text-sm font-bold tracking-[0.16em] text-white">PHARMAFLOW</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Control Plane</p>
          </div>
        </div>

        <nav className="flex-1 space-y-7 overflow-y-auto">
          {allowedSections.map(section => (
            <div key={section.title}>
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">{section.title}</p>
              <div className="space-y-1">
                {section.items.map(item => {
                  const active = location === item.path;
                  return <button key={item.path} onClick={() => { setLocation(item.path); setMobileOpen(false); }}
                    className={`group flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition-all ${active ? "bg-white/10 font-semibold text-white shadow-sm" : "text-slate-400 hover:bg-white/[.055] hover:text-slate-100"}`}>
                    <item.icon className={`h-[18px] w-[18px] ${active ? "text-[#52d7ae]" : "text-slate-500 group-hover:text-slate-300"}`} />
                    <span className="flex-1">{item.label}</span>
                    {active && <ChevronRight className="h-4 w-4 text-[#52d7ae]" />}
                  </button>;
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="rounded-2xl border border-white/10 bg-white/[.045] p-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 border border-white/10 bg-slate-700"><AvatarFallback className="bg-slate-700 text-xs font-bold text-[#77e6c2]">{initials(user.name)}</AvatarFallback></Avatar>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white">{user.name ?? "Platform user"}</p><p className="mt-0.5 truncate text-[11px] font-medium capitalize text-slate-400">{user.role.replace("_", " ")}</p></div>
            <button onClick={logout} className="rounded-lg p-2 text-slate-500 transition hover:bg-white/10 hover:text-white" aria-label="Sign out"><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
      </aside>

      {mobileOpen && <button aria-label="Close navigation" className="fixed inset-0 z-40 bg-slate-950/45 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <main className="min-h-screen lg:pl-[284px]">
        <header className="sticky top-0 z-30 flex h-[78px] items-center border-b border-slate-200/80 bg-[#f6f7f9]/90 px-5 backdrop-blur-xl lg:px-9">
          <button onClick={() => setMobileOpen(true)} className="mr-4 rounded-lg p-2 text-slate-600 hover:bg-white lg:hidden"><Menu className="h-5 w-5" /></button>
          <div><p className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#7d8796]">PharmaFlow / {user.role === "super_admin" ? "Platform" : "Tenant"}</p><h1 className="mt-1 text-lg font-bold tracking-[-0.02em] text-[#172033]">{currentItem}</h1></div>
          <div className="ml-auto flex items-center gap-2 rounded-full border border-[#ccebdd] bg-[#eafaf4] px-3 py-1.5 text-xs font-semibold text-[#15745d]"><BadgeCheck className="h-4 w-4" /> Controls active</div>
        </header>
        <div className="mx-auto max-w-[1560px] p-5 lg:p-9">{children}</div>
      </main>
    </div>
  );
}
