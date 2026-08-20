import {
  formatDate,
  formatDateTime,
  formatNumber,
  formatTime,
} from "@/lib/locale";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { FormEvent, useState } from "react";
import { useRoute } from "wouter";
import { toast } from "sonner";
import { AccessDenied } from "./Tenants";

const managers = ["admin", "manager"];
export function TerritoryManager() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const list = trpc.crm.territories.list.useQuery(undefined, {
    enabled: !!user && managers.includes(user.role),
  });
  const create = trpc.crm.territories.create.useMutation({
    onSuccess: async () => {
      setName("");
      setCode("");
      await utils.crm.territories.list.invalidate();
      toast.success("Territory created.");
    },
  });
  if (!user || !managers.includes(user.role)) return <AccessDenied />;
  return (
    <section className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.14em] text-[#1e9274]">
          Field force design
        </p>
        <h2 className="mt-1 text-2xl font-bold">Territory management</h2>
      </div>
      <Card>
        <CardContent className="p-5">
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              create.mutate({ name, code });
            }}
            className="flex gap-3"
          >
            <Input
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Territory name"
            />
            <Input
              required
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="Code"
            />
            <Button>Create territory</Button>
          </form>
        </CardContent>
      </Card>
      <div className="grid gap-3 md:grid-cols-3">
        {list.data?.map(t => (
          <Card key={t.id}>
            <CardContent className="p-4">
              <p className="font-bold">{t.name}</p>
              <p className="mt-1 text-xs text-slate-500">
                {t.code} · {t.status}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
export function CyclePlanner() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const list = trpc.crm.plans.list.useQuery(undefined, {
    enabled: !!user && managers.includes(user.role),
  });
  const create = trpc.crm.plans.create.useMutation({
    onSuccess: async () => {
      setName("");
      await utils.crm.plans.list.invalidate();
      toast.success("Cycle plan created.");
    },
    onError: e => toast.error(e.message),
  });
  if (!user || !managers.includes(user.role)) return <AccessDenied />;
  return (
    <section className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.14em] text-[#1e9274]">
          Call planning
        </p>
        <h2 className="mt-1 text-2xl font-bold">Cycle planner</h2>
      </div>
      <Card>
        <CardContent className="p-5">
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              create.mutate({
                name,
                startDate: new Date(`${startDate}T00:00:00Z`),
                endDate: new Date(`${endDate}T00:00:00Z`),
              });
            }}
            className="grid gap-3 md:grid-cols-4"
          >
            <Input
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Plan name"
            />
            <Input
              required
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
            <Input
              required
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
            <Button>Create cycle plan</Button>
          </form>
        </CardContent>
      </Card>
      <div className="space-y-3">
        {list.data?.map(p => (
          <Card key={p.id}>
            <CardContent className="p-4">
              <p className="font-bold">{p.name}</p>
              <p className="mt-1 text-sm capitalize text-slate-500">
                {p.status} · {formatDate(p.startDate)}–{formatDate(p.endDate)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
export function AccountDetail() {
  const [, params] = useRoute("/crm/accounts/:id");
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const accounts = trpc.crm.accounts.list.useQuery(undefined, {
    enabled: !!user,
  });
  const overview = trpc.crm.account360.useQuery(
    { accountId: params?.id ?? "00000000-0000-4000-8000-000000000000" },
    { enabled: !!user && !!params?.id }
  );
  const [relatedId, setRelatedId] = useState("");
  const [relationshipType, setRelationshipType] = useState<
    | "employs"
    | "affiliated_with"
    | "member_of"
    | "refers_to"
    | "influences"
    | "parent_of"
    | "other"
  >("affiliated_with");
  const addAffiliation = trpc.crm.affiliations.create.useMutation({
    onSuccess: async () => {
      setRelatedId("");
      await utils.crm.account360.invalidate();
      toast.success("Affiliation added to Customer 360.");
    },
    onError: e => toast.error(e.message),
  });
  if (!user || !["admin", "manager", "rep", "exec"].includes(user.role))
    return <AccessDenied />;
  const data = overview.data;
  const canManage = ["admin", "manager"].includes(user.role);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (params?.id && relatedId)
      addAffiliation.mutate({
        sourceAccountId: params.id,
        targetAccountId: relatedId,
        relationshipType,
      });
  };
  return (
    <section className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.14em] text-[#1e9274]">
          Customer 360
        </p>
        <h2 className="mt-1 text-2xl font-bold">
          {data?.account.name ?? "Account detail"}
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          {data?.account.accountType} ·{" "}
          {data?.account.specialty ?? "No specialty recorded"} · Tier{" "}
          {data?.account.tier?.toUpperCase()}
        </p>
      </div>
      {overview.isLoading ? (
        <Card>
          <CardContent className="p-5 text-sm text-slate-500">
            Loading unified account view…
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs uppercase text-slate-500">Contacts</p>
                <p className="mt-1 text-2xl font-bold">
                  {data?.contacts.length ?? 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs uppercase text-slate-500">
                  Recent visits
                </p>
                <p className="mt-1 text-2xl font-bold">
                  {data?.recentVisits.length ?? 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs uppercase text-slate-500">
                  Planned activity
                </p>
                <p className="mt-1 text-2xl font-bold">
                  {data?.plannedActivity.length ?? 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs uppercase text-slate-500">
                  Open opportunities
                </p>
                <p className="mt-1 text-2xl font-bold">
                  {data?.opportunities.filter(o => o.status === "open")
                    .length ?? 0}
                </p>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardContent className="p-5">
                <h3 className="font-bold">Associated contacts</h3>
                <div className="mt-4 space-y-2">
                  {data?.contacts.length ? (
                    data.contacts.map(c => (
                      <div
                        key={c.id}
                        className="rounded-lg bg-slate-50 p-3 text-sm"
                      >
                        {c.firstName} {c.lastName}
                        <span className="ml-2 text-slate-400">
                          {c.title ?? c.email ?? ""}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400">No contacts.</p>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <h3 className="font-bold">Account affiliations</h3>
                <div className="mt-4 space-y-2">
                  {data?.affiliations.length ? (
                    data.affiliations.map(a => (
                      <div
                        key={a.id}
                        className="rounded-lg bg-slate-50 p-3 text-sm"
                      >
                        <b>{a.relatedAccount?.name ?? "Related account"}</b>
                        <span className="ml-2 capitalize text-slate-500">
                          {a.relationshipType.replaceAll("_", " ")}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400">
                      No affiliations yet.
                    </p>
                  )}
                </div>
                {canManage && (
                  <form onSubmit={submit} className="mt-4 grid gap-2">
                    <select
                      required
                      value={relatedId}
                      onChange={e => setRelatedId(e.target.value)}
                      className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                    >
                      <option value="">Choose related account</option>
                      {accounts.data
                        ?.filter(a => a.id !== params?.id)
                        .map(a => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                    </select>
                    <select
                      value={relationshipType}
                      onChange={e =>
                        setRelationshipType(
                          e.target.value as typeof relationshipType
                        )
                      }
                      className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                    >
                      <option value="affiliated_with">Affiliated with</option>
                      <option value="employs">Employs</option>
                      <option value="member_of">Member of</option>
                      <option value="refers_to">Refers to</option>
                      <option value="influences">Influences</option>
                      <option value="parent_of">Parent of</option>
                      <option value="other">Other</option>
                    </select>
                    <Button disabled={addAffiliation.isPending}>
                      Add affiliation
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <h3 className="font-bold">Visit and planned activity</h3>
                <div className="mt-4 space-y-2">
                  {[
                    ...(data?.recentVisits ?? []).map(v => ({
                      id: v.id,
                      label: `Visit · ${formatDate(v.occurredAt)}`,
                    })),
                    ...(data?.plannedActivity ?? []).map(v => ({
                      id: v.id,
                      label: `Planned · ${formatDate(v.plannedStartAt)}`,
                    })),
                  ]
                    .slice(0, 8)
                    .map(item => (
                      <div
                        key={item.id}
                        className="rounded-lg bg-slate-50 p-3 text-sm"
                      >
                        {item.label}
                      </div>
                    )) || (
                    <p className="text-sm text-slate-400">No activity.</p>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <h3 className="font-bold">Commercial context</h3>
                <div className="mt-4 space-y-2">
                  {data?.opportunities.map(o => (
                    <div
                      key={o.id}
                      className="rounded-lg bg-slate-50 p-3 text-sm"
                    >
                      <b>{o.name}</b>
                      <span className="ml-2 capitalize text-slate-500">
                        {o.stage}
                      </span>
                    </div>
                  ))}
                  {data?.commercialSignals.map(s => (
                    <div
                      key={s.id}
                      className="rounded-lg bg-slate-50 p-3 text-sm"
                    >
                      {s.signalType}: {s.value}{" "}
                      <span className="text-slate-400">
                        {formatDate(s.observedAt)}
                      </span>
                    </div>
                  ))}
                  {!data?.opportunities.length &&
                    !data?.commercialSignals.length && (
                      <p className="text-sm text-slate-400">
                        No active opportunity or commercial signal.
                      </p>
                    )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </section>
  );
}
