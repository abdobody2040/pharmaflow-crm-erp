import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatNumber } from "@/lib/locale";
import { trpc } from "@/lib/trpc";
import {
  ArrowDownUp,
  Building2,
  ClipboardList,
  PackageCheck,
  Plus,
  RefreshCw,
  TriangleAlert,
  Warehouse,
} from "lucide-react";
import { useState } from "react";

const isManager = (role?: string) => role === "admin" || role === "manager";

export default function InventoryPage() {
  const { user } = useAuth();
  const canManage = isManager(user?.role);
  const utils = trpc.useUtils();
  const sites = trpc.inventory.sites.list.useQuery();
  const ledger = trpc.inventory.ledger.list.useQuery();
  const balances = trpc.inventory.ledger.balances.useQuery();
  const reorder = trpc.inventory.reorder.list.useQuery();
  const [siteName, setSiteName] = useState("");
  const [siteCode, setSiteCode] = useState("");
  const [siteType, setSiteType] = useState<
    "warehouse" | "office" | "vehicle" | "field_stock" | "other"
  >("warehouse");
  const [movement, setMovement] = useState({
    siteId: "",
    productName: "",
    quantityDelta: "",
    transactionType: "receipt" as
      | "receipt"
      | "issue"
      | "transfer_in"
      | "transfer_out"
      | "return"
      | "adjustment",
    reason: "",
  });
  const [threshold, setThreshold] = useState({
    siteId: "",
    productName: "",
    minimumQuantity: "",
    reorderQuantity: "",
  });
  const refresh = () =>
    Promise.all([
      utils.inventory.sites.list.invalidate(),
      utils.inventory.ledger.list.invalidate(),
      utils.inventory.ledger.balances.invalidate(),
      utils.inventory.reorder.list.invalidate(),
    ]);
  const createSite = trpc.inventory.sites.create.useMutation({
    onSuccess: () => {
      setSiteName("");
      setSiteCode("");
      refresh();
    },
  });
  const recordMovement = trpc.inventory.ledger.record.useMutation({
    onSuccess: () => {
      setMovement({
        siteId: "",
        productName: "",
        quantityDelta: "",
        transactionType: "receipt",
        reason: "",
      });
      refresh();
    },
  });
  const setReorder = trpc.inventory.reorder.set.useMutation({
    onSuccess: () => {
      setThreshold({
        siteId: "",
        productName: "",
        minimumQuantity: "",
        reorderQuantity: "",
      });
      refresh();
    },
  });
  const siteNameById = new Map(
    (sites.data ?? []).map(site => [site.id, site.name])
  );
  const alerts = (balances.data ?? []).filter(balance => {
    const level = (reorder.data ?? []).find(
      row =>
        row.siteId === balance.siteId && row.productName === balance.productName
    );
    return level && balance.quantity <= Number(level.minimumQuantity);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.14em] text-[#178066]">
            General warehouse
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-[-.04em] text-[#172033]">
            Inventory control
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Tenant-scoped warehouse locations, append-only movements, stock
            position, and replenishment thresholds. Regulated sample custody
            remains in its dedicated compliance chain.
          </p>
        </div>
        <Button variant="outline" onClick={() => refresh()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
              <Warehouse className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Active sites
              </p>
              <p className="mt-1 text-2xl font-bold">
                {sites.data?.filter(site => site.status === "active").length ??
                  0}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
              <PackageCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Stock positions
              </p>
              <p className="mt-1 text-2xl font-bold">
                {balances.data?.length ?? 0}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-amber-50 p-3 text-amber-700">
              <TriangleAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Reorder attention
              </p>
              <p className="mt-1 text-2xl font-bold">{alerts.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>
      <Tabs defaultValue="balances">
        <TabsList className="grid w-full grid-cols-4 sm:w-[560px]">
          <TabsTrigger value="balances">Balances</TabsTrigger>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
          <TabsTrigger value="sites">Sites</TabsTrigger>
          <TabsTrigger value="reorder">Reorder</TabsTrigger>
        </TabsList>
        <TabsContent value="balances" className="mt-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <PackageCheck className="h-5 w-5 text-emerald-600" />
                Current stock position
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="pb-3">Site</th>
                    <th className="pb-3">Product</th>
                    <th className="pb-3">Lot / expiry</th>
                    <th className="pb-3">Quantity</th>
                    <th className="pb-3">Threshold</th>
                  </tr>
                </thead>
                <tbody>
                  {(balances.data ?? []).map(row => {
                    const level = (reorder.data ?? []).find(
                      item =>
                        item.siteId === row.siteId &&
                        item.productName === row.productName
                    );
                    const low = Boolean(
                      level && row.quantity <= Number(level.minimumQuantity)
                    );
                    return (
                      <tr
                        key={`${row.siteId}-${row.productName}-${row.lotNumber ?? ""}`}
                        className="border-b last:border-0"
                      >
                        <td className="py-4 font-medium">
                          {siteNameById.get(row.siteId) ?? row.siteId}
                        </td>
                        <td className="py-4">{row.productName}</td>
                        <td className="py-4 text-slate-500">
                          {row.lotNumber ?? "—"}{" "}
                          {row.expiryDate
                            ? `· ${formatDate(row.expiryDate)}`
                            : ""}
                        </td>
                        <td className="py-4">
                          <Badge variant={low ? "destructive" : "secondary"}>
                            {formatNumber(row.quantity)}
                          </Badge>
                        </td>
                        <td className="py-4 text-slate-500">
                          {level
                            ? `${formatNumber(level.minimumQuantity)} min / ${formatNumber(level.reorderQuantity)} reorder`
                            : "Not set"}
                        </td>
                      </tr>
                    );
                  })}
                  {!balances.data?.length && (
                    <tr>
                      <td
                        className="py-10 text-center text-slate-500"
                        colSpan={5}
                      >
                        No warehouse ledger movements have been recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="ledger" className="mt-5 space-y-5">
          {canManage && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ArrowDownUp className="h-5 w-5 text-emerald-600" />
                  Record compensating movement
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                <Select
                  value={movement.siteId}
                  onValueChange={siteId =>
                    setMovement(current => ({ ...current, siteId }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select site" />
                  </SelectTrigger>
                  <SelectContent>
                    {(sites.data ?? [])
                      .filter(site => site.status === "active")
                      .map(site => (
                        <SelectItem key={site.id} value={site.id}>
                          {site.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Product name"
                  value={movement.productName}
                  onChange={event =>
                    setMovement(current => ({
                      ...current,
                      productName: event.target.value,
                    }))
                  }
                />
                <Input
                  type="number"
                  placeholder="Quantity (+ / -)"
                  value={movement.quantityDelta}
                  onChange={event =>
                    setMovement(current => ({
                      ...current,
                      quantityDelta: event.target.value,
                    }))
                  }
                />
                <Select
                  value={movement.transactionType}
                  onValueChange={transactionType =>
                    setMovement(current => ({
                      ...current,
                      transactionType:
                        transactionType as typeof current.transactionType,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "receipt",
                      "issue",
                      "transfer_in",
                      "transfer_out",
                      "return",
                      "adjustment",
                    ].map(type => (
                      <SelectItem key={type} value={type}>
                        {type.replaceAll("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Reason for movement"
                  value={movement.reason}
                  onChange={event =>
                    setMovement(current => ({
                      ...current,
                      reason: event.target.value,
                    }))
                  }
                />
                <Button
                  className="md:col-span-2 lg:col-span-5"
                  disabled={
                    !movement.siteId ||
                    !movement.productName ||
                    !movement.quantityDelta ||
                    movement.reason.trim().length < 3 ||
                    recordMovement.isPending
                  }
                  onClick={() =>
                    recordMovement.mutate({
                      ...movement,
                      quantityDelta: Number(movement.quantityDelta),
                    })
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Append movement
                </Button>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardList className="h-5 w-5 text-emerald-600" />
                Movement ledger
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="border-b text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="pb-3">When</th>
                    <th className="pb-3">Site</th>
                    <th className="pb-3">Product</th>
                    <th className="pb-3">Movement</th>
                    <th className="pb-3">Quantity</th>
                    <th className="pb-3">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {(ledger.data ?? []).map(row => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="py-4 text-slate-500">
                        {formatDate(row.occurredAt)}
                      </td>
                      <td className="py-4">
                        {siteNameById.get(row.siteId) ?? row.siteId}
                      </td>
                      <td className="py-4 font-medium">{row.productName}</td>
                      <td className="py-4">
                        <Badge variant="outline">
                          {row.transactionType.replaceAll("_", " ")}
                        </Badge>
                      </td>
                      <td className="py-4 font-semibold">
                        {formatNumber(row.quantityDelta)}
                      </td>
                      <td className="py-4 text-slate-500">{row.reason}</td>
                    </tr>
                  ))}
                  {!ledger.data?.length && (
                    <tr>
                      <td
                        className="py-10 text-center text-slate-500"
                        colSpan={6}
                      >
                        The ledger is intentionally empty until the first
                        approved movement.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="sites" className="mt-5 space-y-5">
          {canManage && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5 text-emerald-600" />
                  Add an inventory site
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-4">
                <Input
                  placeholder="Site name"
                  value={siteName}
                  onChange={event => setSiteName(event.target.value)}
                />
                <Input
                  placeholder="Unique site code"
                  value={siteCode}
                  onChange={event =>
                    setSiteCode(event.target.value.toUpperCase())
                  }
                />
                <Select
                  value={siteType}
                  onValueChange={value => setSiteType(value as typeof siteType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "warehouse",
                      "office",
                      "vehicle",
                      "field_stock",
                      "other",
                    ].map(type => (
                      <SelectItem key={type} value={type}>
                        {type.replaceAll("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  disabled={
                    siteName.trim().length < 2 ||
                    siteCode.trim().length < 2 ||
                    createSite.isPending
                  }
                  onClick={() =>
                    createSite.mutate({
                      name: siteName,
                      code: siteCode,
                      siteType,
                    })
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create site
                </Button>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
              {(sites.data ?? []).map(site => (
                <div
                  key={site.id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{site.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                        {site.code} · {site.siteType.replaceAll("_", " ")}
                      </p>
                    </div>
                    <Badge
                      variant={
                        site.status === "active" ? "secondary" : "outline"
                      }
                    >
                      {site.status}
                    </Badge>
                  </div>
                  {site.address && (
                    <p className="mt-4 text-sm text-slate-500">
                      {site.address}
                    </p>
                  )}
                </div>
              ))}
              {!sites.data?.length && (
                <p className="col-span-full py-8 text-center text-sm text-slate-500">
                  No inventory sites have been configured.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="reorder" className="mt-5 space-y-5">
          {canManage && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TriangleAlert className="h-5 w-5 text-amber-600" />
                  Set reorder threshold
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-5">
                <Select
                  value={threshold.siteId}
                  onValueChange={siteId =>
                    setThreshold(current => ({ ...current, siteId }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select site" />
                  </SelectTrigger>
                  <SelectContent>
                    {(sites.data ?? [])
                      .filter(site => site.status === "active")
                      .map(site => (
                        <SelectItem key={site.id} value={site.id}>
                          {site.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Product name"
                  value={threshold.productName}
                  onChange={event =>
                    setThreshold(current => ({
                      ...current,
                      productName: event.target.value,
                    }))
                  }
                />
                <Input
                  type="number"
                  min="0"
                  placeholder="Minimum quantity"
                  value={threshold.minimumQuantity}
                  onChange={event =>
                    setThreshold(current => ({
                      ...current,
                      minimumQuantity: event.target.value,
                    }))
                  }
                />
                <Input
                  type="number"
                  min="0"
                  placeholder="Reorder quantity"
                  value={threshold.reorderQuantity}
                  onChange={event =>
                    setThreshold(current => ({
                      ...current,
                      reorderQuantity: event.target.value,
                    }))
                  }
                />
                <Button
                  disabled={
                    !threshold.siteId ||
                    !threshold.productName ||
                    !threshold.minimumQuantity ||
                    !threshold.reorderQuantity ||
                    setReorder.isPending
                  }
                  onClick={() =>
                    setReorder.mutate({
                      ...threshold,
                      minimumQuantity: Number(threshold.minimumQuantity),
                      reorderQuantity: Number(threshold.reorderQuantity),
                    })
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Save threshold
                </Button>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="overflow-x-auto p-5">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="border-b text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="pb-3">Site</th>
                    <th className="pb-3">Product</th>
                    <th className="pb-3">Minimum</th>
                    <th className="pb-3">Reorder amount</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(reorder.data ?? []).map(row => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="py-4 font-medium">
                        {siteNameById.get(row.siteId) ?? row.siteId}
                      </td>
                      <td className="py-4">{row.productName}</td>
                      <td className="py-4">{row.minimumQuantity}</td>
                      <td className="py-4">{row.reorderQuantity}</td>
                      <td className="py-4">
                        <Badge variant="secondary">{row.status}</Badge>
                      </td>
                    </tr>
                  ))}
                  {!reorder.data?.length && (
                    <tr>
                      <td
                        className="py-10 text-center text-slate-500"
                        colSpan={5}
                      >
                        No reorder thresholds have been configured.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
