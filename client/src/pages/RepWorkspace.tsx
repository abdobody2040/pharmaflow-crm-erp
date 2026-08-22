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
import { useLanguage } from "@/contexts/LanguageContext";
import {
  recordSyncAttempt,
  recordSyncFailure,
  statusForSyncFailure,
  statusTone,
  type SyncConnectionStatus,
  type SyncQueueMetadata,
} from "@/lib/syncConnection";
import { trpc } from "@/lib/trpc";
import {
  CalendarCheck2,
  CircleStop,
  CloudCog,
  CloudOff,
  LibraryBig,
  MapPin,
  PackageCheck,
  RefreshCw,
  Search,
  ShieldCheck,
  Wifi,
  WifiOff,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AccessDenied } from "./Tenants";

const repRoles = ["admin", "manager", "rep"];
type QueuedVisit = SyncQueueMetadata & {
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
    const parsed: unknown = JSON.parse(localStorage.getItem(queueKey) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.map(item => {
      const entry = item as QueuedVisit;
      return {
        ...entry,
        syncAttempts:
          typeof entry.syncAttempts === "number" ? entry.syncAttempts : 0,
      };
    });
  } catch {
    return [];
  }
};
const isBrowserOnline = () =>
  typeof navigator === "undefined" ? true : navigator.onLine;

export default function RepWorkspace() {
  const { user } = useAuth();
  const { tr } = useLanguage();
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
  const [online, setOnline] = useState(isBrowserOnline);
  const [connectionStatus, setConnectionStatus] =
    useState<SyncConnectionStatus>(() =>
      isBrowserOnline() ? "ready" : "offline"
    );
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
  const syncVisit = trpc.rep.syncVisit.useMutation();
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
    const handleOnline = () => {
      setOnline(true);
      setConnectionStatus("reconnecting");
      toast.success(
        tr("Network connection restored. Queued data is ready to sync.")
      );
    };
    const handleOffline = () => {
      setOnline(false);
      setConnectionStatus("offline");
      toast.warning(
        tr(
          "Network connection lost. New visit data will be saved safely for later sync."
        )
      );
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [tr]);

  const persistQueue = useCallback((next: QueuedVisit[]) => {
    localStorage.setItem(queueKey, JSON.stringify(next));
    setQueue(next);
  }, []);

  const updateQueueItem = useCallback((payload: QueuedVisit) => {
    setQueue(current => {
      const next = current.map(item =>
        item.clientMutationId === payload.clientMutationId ? payload : item
      );
      localStorage.setItem(queueKey, JSON.stringify(next));
      return next;
    });
  }, []);

  const enqueueVisit = useCallback((payload: QueuedVisit) => {
    setQueue(current => {
      if (
        current.some(item => item.clientMutationId === payload.clientMutationId)
      ) {
        return current;
      }
      const next = [...current, payload];
      localStorage.setItem(queueKey, JSON.stringify(next));
      return next;
    });
  }, []);
  if (!user || !repRoles.includes(user.role)) return <AccessDenied />;

  const syncPayload = async (payload: QueuedVisit, alreadyQueued = false) => {
    if (!isBrowserOnline()) {
      setOnline(false);
      setConnectionStatus("offline");
      const failedPayload = recordSyncFailure(
        payload,
        "Browser is offline",
        new Date().toISOString()
      );
      if (alreadyQueued) updateQueueItem(failedPayload);
      else enqueueVisit(failedPayload);
      toast.warning(
        tr("Offline: visit saved to the browser queue for later sync.")
      );
      return false;
    }

    setConnectionStatus("syncing");
    const attemptedPayload = recordSyncAttempt(
      payload,
      new Date().toISOString()
    );
    if (alreadyQueued) updateQueueItem(attemptedPayload);
    const {
      syncAttempts: _syncAttempts,
      lastAttemptAt: _lastAttemptAt,
      lastFailureReason: _lastFailureReason,
      ...visitPayload
    } = attemptedPayload;
    try {
      await syncVisit.mutateAsync({
        ...visitPayload,
        occurredAt: new Date(visitPayload.occurredAt),
      });
      setConnectionStatus("ready");
      await utils.rep.dailyPlan.invalidate();
      toast.success(tr("Visit synced through immutable evidence path."));
      return true;
    } catch (error) {
      const failure = statusForSyncFailure(error, isBrowserOnline());
      if (failure) {
        setConnectionStatus(failure);
        const failureReason =
          failure === "offline"
            ? "Browser went offline during sync"
            : `Server unavailable: ${
                error instanceof Error ? error.message : "transport failure"
              }`;
        const failedPayload = recordSyncFailure(
          attemptedPayload,
          failureReason,
          new Date().toISOString()
        );
        if (alreadyQueued) updateQueueItem(failedPayload);
        else enqueueVisit(failedPayload);
        toast.error(
          failure === "offline"
            ? tr(
                "Network connection lost. Your visit was saved for later sync."
              )
            : tr(
                "Server is unreachable. Your visit was saved and will remain queued until retry."
              )
        );
      } else {
        setConnectionStatus("ready");
        toast.error(
          error instanceof Error ? error.message : tr("Unable to sync visit.")
        );
      }
      return false;
    }
  };

  const connectionLabel = {
    ready: tr("Connected to server · sync ready"),
    syncing: tr("Syncing data with server…"),
    offline: tr("Offline · data is protected in this device queue"),
    reconnecting: tr("Connection restored · checking server…"),
    "server-unreachable": tr("Server unreachable · queued data is protected"),
  }[connectionStatus];
  const queueSummary = queue.length
    ? tr("{count} visit record(s) waiting to sync.").replace(
        "{count}",
        String(queue.length)
      )
    : tr("No visit data is waiting to sync.");
  const ConnectionIcon =
    connectionStatus === "ready"
      ? Wifi
      : connectionStatus === "offline"
        ? WifiOff
        : connectionStatus === "server-unreachable"
          ? CloudOff
          : CloudCog;
  const connectionTone = statusTone(connectionStatus);

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
    void syncPayload(payload);
  };
  const flushQueue = async () => {
    if (!queue.length) return;
    if (!isBrowserOnline()) {
      setOnline(false);
      setConnectionStatus("offline");
      toast.warning(
        tr(
          "Network connection is still unavailable. Queued data remains protected."
        )
      );
      return;
    }
    let remaining = [...queue];
    for (const payload of queue) {
      const synced = await syncPayload(payload, true);
      if (!synced) break;
      remaining = remaining.slice(1);
      persistQueue(remaining);
    }
    if (!remaining.length) {
      toast.success(tr("All queued visit data is now synced."));
    }
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
        <div
          aria-live="polite"
          data-i18n-dynamic
          data-testid="sync-connection-status"
          className={`mt-5 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
            connectionTone === "success"
              ? "border-[#2b9b7c]/35 bg-[#123c3c] text-[#c4ecdf]"
              : connectionTone === "warning"
                ? "border-amber-200/30 bg-amber-400/10 text-amber-100"
                : "border-sky-200/25 bg-sky-400/10 text-sky-100"
          }`}
        >
          <ConnectionIcon
            className={`h-5 w-5 shrink-0 ${
              connectionStatus === "syncing" ||
              connectionStatus === "reconnecting"
                ? "animate-spin"
                : ""
            }`}
          />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{connectionLabel}</p>
            <p className="mt-0.5 text-xs opacity-85">{queueSummary}</p>
          </div>
          {queue.length > 0 && online && connectionStatus !== "syncing" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void flushQueue()}
              className="border-current bg-transparent text-inherit hover:bg-white/10 hover:text-inherit"
            >
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              {tr("Retry sync")}
            </Button>
          )}
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
                  {connectionLabel}
                </span>
                <Button
                  disabled={connectionStatus === "syncing"}
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
          onClick={() => void flushQueue()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#eed9ba] bg-[#fffaf1] p-3 text-sm font-semibold text-[#9a5c1b]"
        >
          <RefreshCw className="h-4 w-4" />
          {tr("Sync queued visits")}
        </button>
      )}
      {queue.length > 0 && (
        <div
          data-i18n-dynamic
          className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600"
        >
          {queue.map(item => (
            <div
              key={item.clientMutationId}
              className="flex flex-wrap items-center justify-between gap-2"
            >
              <span className="font-semibold">{item.accountName}</span>
              <span>
                {tr("Attempts")}: {item.syncAttempts ?? 0}
                {item.lastAttemptAt
                  ? ` · ${new Date(item.lastAttemptAt).toLocaleString()}`
                  : ""}
              </span>
              {item.lastFailureReason && (
                <span className="w-full text-amber-700">
                  {tr("Last failure")}: {item.lastFailureReason}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
