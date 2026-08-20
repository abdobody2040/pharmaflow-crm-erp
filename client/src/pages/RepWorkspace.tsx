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
  CalendarCheck2,
  CircleStop,
  LibraryBig,
  MapPin,
  PackageCheck,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { AccessDenied } from "./Tenants";

const repRoles = ["admin", "manager", "rep"];
type QueuedVisit = {
  clientMutationId: string;
  accountName: string;
  accountId?: string;
  objective: string;
  productsDiscussed: string[];
  nextSteps?: string;
  occurredAt: string;
};
const queueKey = "pharmaflow-rep-web-queue";
const readQueue = (): QueuedVisit[] => {
  try {
    return JSON.parse(localStorage.getItem(queueKey) ?? "[]");
  } catch {
    return [];
  }
};

export default function RepWorkspace() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [query, setQuery] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [objective, setObjective] = useState("");
  const [products, setProducts] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [queue, setQueue] = useState<QueuedVisit[]>([]);
  const [online, setOnline] = useState(navigator.onLine);
  const [sampleProduct, setSampleProduct] = useState("");
  const [sampleLot, setSampleLot] = useState("");
  const [sampleExpiry, setSampleExpiry] = useState("");
  const [sampleQuantity, setSampleQuantity] = useState("");
  const dailyPlan = trpc.rep.dailyPlan.useQuery(undefined, {
    enabled: !!user && repRoles.includes(user.role),
  });
  const hcpLookup = trpc.rep.hcpLookup.useQuery(
    { query },
    { enabled: !!user && repRoles.includes(user.role) }
  );
  const shift = trpc.rep.shift.current.useQuery(undefined, {
    enabled: !!user && repRoles.includes(user.role),
  });
  const inventory = trpc.rep.sampleInventory.useQuery(undefined, {
    enabled: !!user && repRoles.includes(user.role),
  });
  const approvedContent = trpc.marketing.content.list.useQuery(undefined, {
    enabled: !!user && repRoles.includes(user.role),
  });
  const consent = trpc.rep.shift.consent.useMutation({
    onSuccess: data => start.mutate({ consentId: data.id }),
  });
  const start = trpc.rep.shift.start.useMutation({
    onSuccess: async () => {
      toast.success(
        "Shift active. Mobile background location reporting is enabled only during this shift."
      );
      await utils.rep.shift.current.invalidate();
    },
  });
  const stop = trpc.rep.shift.stop.useMutation({
    onSuccess: async () => {
      toast.success("Shift stopped. Location reporting ended immediately.");
      await utils.rep.shift.current.invalidate();
    },
  });
  const syncVisit = trpc.rep.syncVisit.useMutation({
    onSuccess: async () => {
      toast.success("Visit synced through immutable evidence path.");
      await utils.rep.dailyPlan.invalidate();
    },
  });
  const checkout = trpc.rep.sampleCheckout.useMutation({
    onSuccess: async () => {
      setSampleProduct("");
      setSampleLot("");
      setSampleExpiry("");
      setSampleQuantity("");
      await utils.rep.sampleInventory.invalidate();
      toast.success("Immutable sample allocation recorded.");
    },
    onError: error => toast.error(error.message),
  });
  const recordPresentation = trpc.marketing.usage.record.useMutation({
    onSuccess: () => toast.success("Approved content presentation recorded."),
    onError: error => toast.error(error.message),
  });
  useEffect(() => {
    setQueue(readQueue());
    const sync = () => setOnline(navigator.onLine);
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  if (!user || !repRoles.includes(user.role)) return <AccessDenied />;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedAccount) return toast.error("Select an HCP/account first.");
    const payload: QueuedVisit = {
      clientMutationId: crypto.randomUUID(),
      accountId: selectedAccount.id,
      accountName: selectedAccount.name,
      objective,
      productsDiscussed: products
        .split(",")
        .map(value => value.trim())
        .filter(Boolean),
      nextSteps: nextSteps || undefined,
      occurredAt: new Date().toISOString(),
    };
    if (!online) {
      const next = [...queue, payload];
      localStorage.setItem(queueKey, JSON.stringify(next));
      setQueue(next);
      toast.message(
        "Offline: visit saved to the browser queue for later sync."
      );
      return;
    }
    syncVisit.mutate({ ...payload, occurredAt: new Date(payload.occurredAt) });
  };
  const flushQueue = async () => {
    if (!online || !queue.length) return;
    const first = queue[0];
    syncVisit.mutate(
      { ...first, occurredAt: new Date(first.occurredAt) },
      {
        onSuccess: () => {
          const next = queue.slice(1);
          localStorage.setItem(queueKey, JSON.stringify(next));
          setQueue(next);
        },
      }
    );
  };
  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-[#10203d] p-6 text-white sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.15em] text-[#63e1ba]">
              Rep field workspace
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-[-.04em]">
              Today’s route
            </h2>
            <p className="mt-2 max-w-xl text-sm text-slate-300">
              Visit work is captured through immutable sync operations. Web
              keeps a small browser queue; mobile uses its local encrypted
              SQLite store.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[.08] p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Tracking status
            </p>
            {shift.data ? (
              <Button
                variant="outline"
                onClick={() => stop.mutate()}
                className="mt-2 border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                <CircleStop className="mr-2 h-4 w-4" />
                Stop shift
              </Button>
            ) : (
              <Button
                onClick={() =>
                  consent.mutate({
                    policyVersion: "rep-location-v1",
                    retentionDays: 90,
                  })
                }
                className="mt-2 bg-[#49d5a7] text-[#07152a] hover:bg-[#6ee5bf]"
              >
                <MapPin className="mr-2 h-4 w-4" />
                Start shift
              </Button>
            )}
          </div>
        </div>
        {shift.data && (
          <p className="mt-5 rounded-xl bg-[#173357] px-4 py-3 text-xs text-[#c4ecdf]">
            <ShieldCheck className="mr-2 inline h-4 w-4" />
            Active shift: mobile captures every 60 seconds, or every 15 seconds
            near a planned HCP stop. Stop ends tracking immediately.
          </p>
        )}
      </section>
      <div className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <CalendarCheck2 className="h-5 w-5 text-[#178066]" />
              <h3 className="font-bold">Daily call plan</h3>
            </div>
            <div className="mt-4 space-y-3">
              {dailyPlan.data?.length ? (
                dailyPlan.data.map(row => (
                  <button
                    key={row.plan.id}
                    onClick={() =>
                      setSelectedAccount(
                        row.account
                          ? { id: row.account.id, name: row.account.name }
                          : null
                      )
                    }
                    className="w-full rounded-xl border border-slate-100 bg-slate-50 p-4 text-left transition hover:border-[#9ad7c4] hover:bg-[#f3fcf8]"
                  >
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="font-semibold">
                          {row.account?.name ?? "Unassigned account"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {row.plan.objective ?? "Planned call"}
                        </p>
                      </div>
                      <Badge className="h-fit border-0 bg-[#e9f8f2] capitalize text-[#188064]">
                        {row.plan.priority}
                      </Badge>
                    </div>
                    <p className="mt-3 text-xs text-slate-400">
                      {formatTime(row.plan.plannedStartAt)}
                    </p>
                  </button>
                ))
              ) : (
                <p className="py-10 text-center text-sm text-slate-400">
                  No planned calls assigned for today.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-[#5865cf]" />
              <h3 className="font-bold">Sample inventory</h3>
            </div>
            <form
              onSubmit={event => {
                event.preventDefault();
                checkout.mutate({
                  clientMutationId: crypto.randomUUID(),
                  productName: sampleProduct,
                  lotNumber: sampleLot,
                  expiryDate: new Date(`${sampleExpiry}T00:00:00Z`),
                  quantity: sampleQuantity,
                });
              }}
              className="mt-4 grid gap-2 sm:grid-cols-2"
            >
              <Input
                required
                value={sampleProduct}
                onChange={event => setSampleProduct(event.target.value)}
                placeholder="Product"
              />
              <Input
                required
                value={sampleLot}
                onChange={event => setSampleLot(event.target.value)}
                placeholder="Lot number"
              />
              <Input
                required
                type="date"
                value={sampleExpiry}
                onChange={event => setSampleExpiry(event.target.value)}
              />
              <Input
                required
                value={sampleQuantity}
                onChange={event => setSampleQuantity(event.target.value)}
                placeholder="Quantity"
              />
              <Button className="sm:col-span-2" disabled={checkout.isPending}>
                Check out sample
              </Button>
            </form>
            <div className="mt-5 space-y-3">
              {inventory.data?.length ? (
                inventory.data.map(item => (
                  <div key={item.id} className="rounded-xl bg-slate-50 p-3">
                    <p className="text-sm font-semibold">{item.productName}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Lot {item.lotNumber} · Qty {item.quantity}
                    </p>
                  </div>
                ))
              ) : (
                <p className="py-8 text-center text-sm text-slate-400">
                  No checked-out sample records.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-[#178066]" />
            <h3 className="font-bold">HCP lookup and visit capture</h3>
          </div>
          <div className="mt-4 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
            <div>
              <Input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search HCP or account"
              />
              <div className="mt-3 max-h-72 space-y-2 overflow-auto">
                {hcpLookup.data
                  ?.filter(
                    account =>
                      !query ||
                      account.name.toLowerCase().includes(query.toLowerCase())
                  )
                  .map(account => (
                    <button
                      key={account.id}
                      onClick={() =>
                        setSelectedAccount({
                          id: account.id,
                          name: account.name,
                        })
                      }
                      className={`w-full rounded-xl border p-3 text-left text-sm ${selectedAccount?.id === account.id ? "border-[#35a98a] bg-[#effcf6]" : "border-slate-100 hover:bg-slate-50"}`}
                    >
                      <p className="font-semibold">{account.name}</p>
                      <p className="mt-1 text-xs capitalize text-slate-500">
                        {account.accountType} · {account.specialty ?? "General"}
                      </p>
                    </button>
                  ))}
              </div>
            </div>
            <form onSubmit={submit} className="space-y-3">
              <p className="text-sm font-semibold">
                {selectedAccount
                  ? selectedAccount.name
                  : "Select an HCP to begin"}
              </p>
              <textarea
                required
                value={objective}
                onChange={event => setObjective(event.target.value)}
                className="min-h-24 w-full rounded-xl border p-3 text-sm"
                placeholder="Visit objective"
              />
              <Input
                required
                value={products}
                onChange={event => setProducts(event.target.value)}
                placeholder="Products discussed, comma separated"
              />
              <textarea
                value={nextSteps}
                onChange={event => setNextSteps(event.target.value)}
                className="min-h-20 w-full rounded-xl border p-3 text-sm"
                placeholder="Next steps"
              />
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`text-xs font-semibold ${online ? "text-[#178066]" : "text-[#b96b22]"}`}
                >
                  {online
                    ? "Online · sync ready"
                    : `Offline · ${queue.length} queued`}
                </span>
                <Button
                  disabled={syncVisit.isPending}
                  className="bg-[#147d66] hover:bg-[#0f6956]"
                >
                  Record visit
                </Button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2">
            <LibraryBig className="h-5 w-5 text-[#b96b22]" />
            <h3 className="font-bold">Approved content for HCP discussion</h3>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Only currently approved materials can be presented. Each
            presentation is immutable evidence tied to the selected HCP.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {approvedContent.data?.length ? (
              approvedContent.data.map(item => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-100 p-4"
                >
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.contentType} · version {item.version}
                  </p>
                  <p className="mt-3 line-clamp-3 text-sm text-slate-600">
                    {item.description ?? item.body}
                  </p>
                  <Button
                    size="sm"
                    className="mt-4 bg-[#b96b22] hover:bg-[#985010]"
                    disabled={!selectedAccount || recordPresentation.isPending}
                    onClick={() =>
                      selectedAccount &&
                      recordPresentation.mutate({
                        contentId: item.id,
                        accountId: selectedAccount.id,
                        eventType: "presented",
                        occurredAt: new Date(),
                      })
                    }
                  >
                    Record shown
                  </Button>
                </div>
              ))
            ) : (
              <p className="py-6 text-sm text-slate-400">
                No approved materials are currently available.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
      {queue.length > 0 && (
        <button
          onClick={flushQueue}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#eed9ba] bg-[#fffaf1] p-3 text-sm font-semibold text-[#9a5c1b]"
        >
          <RefreshCw className="h-4 w-4" />
          Sync {queue.length} queued visit{queue.length === 1 ? "" : "s"}
        </button>
      )}
    </div>
  );
}
