import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import NotFound from "@/pages/NotFound";
import ComplianceRegistry from "@/pages/ComplianceRegistry";
import DirectoryPage from "@/pages/Directory";
import Overview from "@/pages/Overview";
import TenantsPage from "@/pages/Tenants";
import { AccountsPage, OpportunitiesPage, PlansPage } from "@/pages/CRM";
import { ContactsPage, VisitCapturePage } from "@/pages/CRMOperations";
import { AccountDetail, CyclePlanner, TerritoryManager } from "@/pages/CRMPlanning";
import RepWorkspace from "@/pages/RepWorkspace";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function SettingsPage() {
  return <div className="grid gap-4 md:grid-cols-2"><div className="rounded-3xl border border-slate-200 bg-white p-7"><p className="text-xs font-bold uppercase tracking-[.14em] text-[#1e9274]">Deployment posture</p><h2 className="mt-2 text-xl font-bold">Self-hosted runtime</h2><p className="mt-3 text-sm leading-6 text-slate-500">The included Docker Compose stack runs the Node application, MySQL database, and Nginx proxy with environment-templated configuration.</p></div><div className="rounded-3xl border border-slate-200 bg-white p-7"><p className="text-xs font-bold uppercase tracking-[.14em] text-[#1e9274]">Compliance posture</p><h2 className="mt-2 text-xl font-bold">Append-only records</h2><p className="mt-3 text-sm leading-6 text-slate-500">Application routes do not register update or delete operations for visit logs, samples, e-signatures, or audit evidence. The MySQL deployment migration also installs mutation-blocking triggers.</p></div></div>;
}
function Placeholder({ title, description }: { title: string; description: string }) {
  return <div className="rounded-3xl border border-slate-200 bg-white p-9 shadow-sm"><p className="text-xs font-bold uppercase tracking-[.14em] text-[#178066]">Foundation module</p><h2 className="mt-3 text-2xl font-bold tracking-[-.035em] text-[#172033]">{title}</h2><p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">{description}</p><div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-9 text-sm text-slate-500">This route is provisioned in the dashboard shell. The next module increment can attach its role-gated, tenant-scoped workflow here.</div></div>;
}
function Framed({ children }: { children: React.ReactNode }) { return <DashboardLayout>{children}</DashboardLayout>; }
function Router() { return <Switch><Route path="/"><Framed><Overview /></Framed></Route><Route path="/rep"><Framed><RepWorkspace /></Framed></Route><Route path="/tenants"><Framed><TenantsPage /></Framed></Route><Route path="/crm/accounts/:id"><Framed><AccountDetail /></Framed></Route><Route path="/crm/accounts"><Framed><AccountsPage /></Framed></Route><Route path="/crm/contacts"><Framed><ContactsPage /></Framed></Route><Route path="/crm/plans"><Framed><PlansPage /></Framed></Route><Route path="/crm/territories"><Framed><TerritoryManager /></Framed></Route><Route path="/crm/cycles"><Framed><CyclePlanner /></Framed></Route><Route path="/crm/opportunities"><Framed><OpportunitiesPage /></Framed></Route><Route path="/visits/new"><Framed><VisitCapturePage /></Framed></Route><Route path="/directory"><Framed><DirectoryPage /></Framed></Route><Route path="/visits"><Framed><ComplianceRegistry kind="visits" /></Framed></Route><Route path="/samples"><Framed><ComplianceRegistry kind="samples" /></Framed></Route><Route path="/signatures"><Framed><ComplianceRegistry kind="signatures" /></Framed></Route><Route path="/settings"><Framed><SettingsPage /></Framed></Route><Route component={NotFound} /></Switch>; }
function App() { return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>; }
export default App;
