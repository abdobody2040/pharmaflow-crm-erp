import {
  formatDate,
  formatDateTime,
  formatNumber,
  formatTime,
} from "@/lib/locale";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  Building2,
  CalendarDays,
  CirclePlus,
  KanbanSquare,
  MapPinned,
  Users,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { AccessDenied } from "./Tenants";

const managerRoles = ["admin", "manager"];
const crmRoles = ["admin", "manager", "rep", "exec"];
export function AccountsPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<
    "hcp" | "pharmacy" | "hospital" | "distributor" | "organization"
  >("hcp");
  const accounts = trpc.crm.accounts.list.useQuery(undefined, {
    enabled: !!user && crmRoles.includes(user.role),
  });
  const create = trpc.crm.accounts.create.useMutation({
    onSuccess: async () => {
      setName("");
      setExpanded(false);
      toast.success("Account created within the active tenant.");
      await utils.crm.accounts.list.invalidate();
    },
    onError: e => toast.error(e.message),
  });
  if (!user || !crmRoles.includes(user.role)) return <AccessDenied />;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate({ name, accountType: type, tier: "unclassified" });
  };
  return (
    <section className="space-y-6">
      <Header
        eyebrow="CRM account universe"
        title="Accounts & HCP directory"
        copy="Manage HCPs, doctors, pharmacies, hospitals, distributors, and organizations inside the active tenant boundary."
        icon={Building2}
        action={
          managerRoles.includes(user.role) ? (
            <Button
              onClick={() => setExpanded(!expanded)}
              className="bg-[#147d66] hover:bg-[#0f6956]"
            >
              <CirclePlus className="mr-2 h-4 w-4" />
              New account
            </Button>
          ) : undefined
        }
      />
      {expanded && (
        <Card>
          <CardContent className="p-5">
            <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
              <Input
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Account or HCP name"
              />
              <select
                value={type}
                onChange={e => setType(e.target.value as typeof type)}
                className="h-10 rounded-md border px-3 text-sm"
              >
                <option value="hcp">HCP / Doctor</option>
                <option value="pharmacy">Pharmacy</option>
                <option value="hospital">Hospital</option>
                <option value="distributor">Distributor</option>
                <option value="organization">Organization</option>
              </select>
              <Button disabled={create.isPending}>Create</Button>
            </form>
          </CardContent>
        </Card>
      )}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs uppercase text-slate-400">
              <tr>
                <th className="p-4">Account</th>
                <th className="p-4">Type</th>
                <th className="p-4">Tier</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {accounts.data?.length ? (
                accounts.data.map(a => (
                  <tr key={a.id} className="border-t">
                    <td className="p-4 font-semibold">
                      {a.name}
                      <p className="text-xs font-normal text-slate-400">
                        {a.specialty ?? a.email ?? "—"}
                      </p>
                    </td>
                    <td className="p-4 capitalize">{a.accountType}</td>
                    <td className="p-4">
                      <Badge className="capitalize">{a.tier}</Badge>
                    </td>
                    <td className="p-4 capitalize text-slate-500">
                      {a.status}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="p-12 text-center text-sm text-slate-400"
                  >
                    No CRM accounts are registered for this tenant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </section>
  );
}
export function PlansPage() {
  const { user } = useAuth();
  const plans = trpc.crm.plans.list.useQuery(undefined, {
    enabled: !!user && crmRoles.includes(user.role),
  });
  const territories = trpc.crm.territories.list.useQuery(undefined, {
    enabled: !!user && crmRoles.includes(user.role),
  });
  if (!user || !crmRoles.includes(user.role)) return <AccessDenied />;
  return (
    <section className="space-y-6">
      <Header
        eyebrow="Field execution"
        title="Territories & cycle plans"
        copy="Coordinate territory ownership and planned calls without changing immutable visit evidence."
        icon={CalendarDays}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <MapPinned className="h-5 w-5 text-[#178066]" />
              <h3 className="font-bold">Territories</h3>
            </div>
            <div className="mt-5 space-y-3">
              {territories.data?.length ? (
                territories.data.map(t => (
                  <div key={t.id} className="rounded-xl bg-slate-50 p-3">
                    <p className="font-semibold">{t.name}</p>
                    <p className="text-xs text-slate-500">
                      {t.code} · {t.region ?? "No region"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">
                  No territories defined.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-[#5865cf]" />
              <h3 className="font-bold">Cycle plans</h3>
            </div>
            <div className="mt-5 space-y-3">
              {plans.data?.length ? (
                plans.data.map(p => (
                  <div key={p.id} className="rounded-xl bg-slate-50 p-3">
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-xs capitalize text-slate-500">
                      {p.status} · {formatDate(p.startDate)} –{" "}
                      {formatDate(p.endDate)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">
                  No cycle plans defined.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
export function OpportunitiesPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState("");
  const opportunities = trpc.crm.opportunities.list.useQuery(undefined, {
    enabled: !!user && crmRoles.includes(user.role),
  });
  const create = trpc.crm.opportunities.create.useMutation({
    onSuccess: async () => {
      setExpanded(false);
      setName("");
      await utils.crm.opportunities.list.invalidate();
      toast.success("Opportunity created.");
    },
  });
  const move = trpc.crm.opportunities.moveStage.useMutation({
    onSuccess: () => utils.crm.opportunities.list.invalidate(),
  });
  if (!user || !crmRoles.includes(user.role)) return <AccessDenied />;
  const stages = [
    "qualification",
    "discovery",
    "proposal",
    "negotiation",
    "won",
    "lost",
  ] as const;
  return (
    <section className="space-y-6">
      <Header
        eyebrow="B2B sales workspace"
        title="Opportunity pipeline"
        copy="A role-gated Kanban pipeline for non-pharma B2B deals, always scoped to the active tenant."
        icon={KanbanSquare}
        action={
          managerRoles.includes(user.role) ? (
            <Button
              onClick={() => setExpanded(!expanded)}
              className="bg-[#147d66] hover:bg-[#0f6956]"
            >
              <CirclePlus className="mr-2 h-4 w-4" />
              New opportunity
            </Button>
          ) : undefined
        }
      />
      {expanded && (
        <Card>
          <CardContent className="p-5">
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                create.mutate({ name, value: "0.00", probability: 10 });
              }}
              className="flex gap-3"
            >
              <Input
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Opportunity name"
              />
              <Button>Create</Button>
            </form>
          </CardContent>
        </Card>
      )}
      <div className="flex gap-4 overflow-x-auto pb-3">
        {stages.map(stage => (
          <div
            key={stage}
            className="w-[260px] shrink-0 rounded-2xl border border-slate-200 bg-slate-100/70 p-3"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {stage}
              </p>
              <Badge variant="outline">
                {opportunities.data?.filter(o => o.stage === stage).length ?? 0}
              </Badge>
            </div>
            <div className="space-y-3">
              {opportunities.data
                ?.filter(o => o.stage === stage)
                .map(o => (
                  <Card key={o.id} className="border-slate-200 bg-white">
                    <CardContent className="p-3">
                      <p className="text-sm font-semibold">{o.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        ${formatNumber(o.value)} · {o.probability}%
                      </p>
                      {managerRoles.includes(user.role) && (
                        <select
                          aria-label={`Move ${o.name}`}
                          value={o.stage}
                          onChange={e =>
                            move.mutate({
                              id: o.id,
                              stage: e.target.value as typeof stage,
                            })
                          }
                          className="mt-3 h-8 w-full rounded border px-2 text-xs"
                        >
                          <option value="qualification">Qualification</option>
                          <option value="discovery">Discovery</option>
                          <option value="proposal">Proposal</option>
                          <option value="negotiation">Negotiation</option>
                          <option value="won">Won</option>
                          <option value="lost">Lost</option>
                        </select>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
function Header({
  eyebrow,
  title,
  copy,
  icon: Icon,
  action,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  icon: typeof Building2;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#e9f8f2] text-[#178066]">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[.14em] text-[#1e9274]">
            {eyebrow}
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-[-.035em]">
            {title}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            {copy}
          </p>
        </div>
      </div>
      {action}
    </div>
  );
}
