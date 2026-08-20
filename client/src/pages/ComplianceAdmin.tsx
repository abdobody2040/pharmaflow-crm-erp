import {
  formatDate,
  formatDateTime,
  formatNumber,
  formatTime,
} from "@/lib/locale";
import { useState } from "react";
import {
  ClipboardCheck,
  FileClock,
  KeyRound,
  PackageCheck,
  ScrollText,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ComplianceAdmin() {
  const { user } = useAuth();
  const allowed = !!user && ["admin", "exec"].includes(user.role);
  const utils = trpc.useUtils();
  const audit = trpc.compliance.audit.list.useQuery(
    { limit: 50 },
    { enabled: allowed }
  );
  const reviews = trpc.compliance.accessReviews.list.useQuery(undefined, {
    enabled: allowed,
  });
  const changes = trpc.compliance.changes.list.useQuery(undefined, {
    enabled: allowed,
  });
  const custody = trpc.compliance.custody.report.useQuery(undefined, {
    enabled: allowed,
  });
  const revisions = trpc.compliance.revisions.list.useQuery(undefined, {
    enabled: allowed,
  });
  const generate = trpc.compliance.accessReviews.generate.useMutation({
    onSuccess: async result => {
      toast.success(
        `Access review generated: ${result.memberCount} identities assessed.`
      );
      await reviews.refetch();
    },
    onError: error => toast.error(error.message),
  });
  const accept = trpc.compliance.accessReviews.accept.useMutation({
    onSuccess: () => {
      toast.success("Access review accepted with immutable evidence.");
      utils.compliance.accessReviews.list.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const propose = trpc.compliance.changes.propose.useMutation({
    onSuccess: () => {
      toast.success("Change-control request recorded.");
      utils.compliance.changes.list.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const [workflowKey, setWorkflowKey] = useState("regulated-records");
  const [changeTitle, setChangeTitle] = useState("");
  const [rationale, setRationale] = useState("");
  if (!allowed)
    return (
      <Card>
        <CardContent className="p-8">
          <h2 className="text-xl font-bold">
            Compliance review access is restricted
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            An administrator or executive role is required to review regulated
            evidence and access controls.
          </p>
        </CardContent>
      </Card>
    );
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return (
    <section className="space-y-6">
      <div className="rounded-3xl bg-[#10203d] p-7 text-white">
        <p className="text-xs font-bold uppercase tracking-widest text-[#63e1ba]">
          Part 11-style controls
        </p>
        <h2 className="mt-2 text-3xl font-bold">Compliance review center</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          Review immutable evidence, current access, controlled workflow
          changes, and the sample distribution chain without altering regulated
          records.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[
          {
            label: "Audit events",
            value: audit.data?.length ?? 0,
            icon: ScrollText,
          },
          {
            label: "Access reviews",
            value: reviews.data?.length ?? 0,
            icon: KeyRound,
          },
          {
            label: "Record revisions",
            value: revisions.data?.length ?? 0,
            icon: FileClock,
          },
          {
            label: "Custody events",
            value: custody.data?.length ?? 0,
            icon: PackageCheck,
          },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="p-5">
              <item.icon className="h-5 w-5 text-[#147d66]" />
              <p className="mt-4 text-3xl font-bold">{item.value}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                {item.label}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#147d66]">
                  Access review
                </p>
                <h3 className="mt-1 text-lg font-bold">Who can access what</h3>
              </div>
              <Button
                disabled={generate.isPending}
                onClick={() =>
                  generate.mutate({
                    scope: "privileged_access",
                    reportPeriodStart: periodStart,
                    reportPeriodEnd: now,
                  })
                }
              >
                {generate.isPending ? "Generating…" : "Generate review"}
              </Button>
            </div>
            <div className="mt-5 space-y-3">
              {!reviews.data?.length ? (
                <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                  No access-review evidence exists for this tenant yet.
                </p>
              ) : (
                reviews.data.slice(0, 4).map(review => (
                  <div
                    key={review.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 p-4"
                  >
                    <div>
                      <p className="font-medium capitalize">
                        {review.scope.replaceAll("_", " ")}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDateTime(review.createdAt)} · {review.status}
                      </p>
                    </div>
                    {review.status !== "accepted" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={accept.isPending}
                        onClick={() => accept.mutate({ id: review.id })}
                      >
                        Accept
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-[#147d66]">
              Validated workflow change control
            </p>
            <h3 className="mt-1 text-lg font-bold">
              Propose a controlled change
            </h3>
            <div className="mt-5 grid gap-3">
              <Input
                value={workflowKey}
                onChange={event => setWorkflowKey(event.target.value)}
                placeholder="Workflow key"
              />
              <Input
                value={changeTitle}
                onChange={event => setChangeTitle(event.target.value)}
                placeholder="Change title"
              />
              <textarea
                value={rationale}
                onChange={event => setRationale(event.target.value)}
                className="min-h-24 rounded-md border p-3 text-sm"
                placeholder="Rationale, risk assessment, and validation impact"
              />
              <Button
                disabled={
                  propose.isPending ||
                  changeTitle.trim().length < 5 ||
                  rationale.trim().length < 10
                }
                onClick={() =>
                  propose.mutate({
                    workflowKey,
                    changeTitle,
                    rationale,
                    riskAssessment: rationale,
                    validationImpact: rationale,
                    beforeState: { status: "documented" },
                    proposedState: { status: "proposed" },
                  })
                }
              >
                {propose.isPending ? "Recording…" : "Record change request"}
              </Button>
            </div>
            <div className="mt-4 space-y-2">
              {changes.data?.slice(0, 3).map(change => (
                <p
                  key={change.id}
                  className="rounded-lg bg-slate-50 p-3 text-sm"
                >
                  <span className="font-medium">{change.workflowKey}</span> ·{" "}
                  {change.status}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#147d66]" />
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#147d66]">
                Audit trail
              </p>
              <h3 className="font-bold">Recent immutable system evidence</h3>
            </div>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="pb-3">Time</th>
                  <th className="pb-3">Event</th>
                  <th className="pb-3">Entity</th>
                  <th className="pb-3">Reason</th>
                </tr>
              </thead>
              <tbody>
                {audit.data?.map(event => (
                  <tr key={event.id} className="border-t">
                    <td className="py-3 text-slate-500">
                      {formatDateTime(event.createdAt)}
                    </td>
                    <td className="py-3 font-medium">{event.eventType}</td>
                    <td className="py-3">{event.entityType}</td>
                    <td className="py-3 text-slate-500">
                      {event.reason ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-[#147d66]" />
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#147d66]">
                Sample chain of custody
              </p>
              <h3 className="font-bold">
                Allocation through hand-off, lot, expiry, and linked visit
                evidence
              </h3>
            </div>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="pb-3">Occurred</th>
                  <th className="pb-3">Product / lot</th>
                  <th className="pb-3">Expiry</th>
                  <th className="pb-3">Custody hand-off</th>
                  <th className="pb-3">Event</th>
                  <th className="pb-3">Quantity</th>
                  <th className="pb-3">Visit</th>
                </tr>
              </thead>
              <tbody>
                {custody.data?.map(record => (
                  <tr key={record.id} className="border-t">
                    <td className="py-3 text-slate-500">
                      {formatDateTime(record.occurredAt)}
                    </td>
                    <td className="py-3 font-medium">
                      {record.productName} · {record.lotNumber}
                    </td>
                    <td className="py-3">{formatDate(record.expiryDate)}</td>
                    <td className="py-3">
                      {record.fromUserId ?? "Stock"} →{" "}
                      {record.toUserId ?? "Stock"}
                    </td>
                    <td className="py-3 capitalize">
                      {record.transactionType}
                    </td>
                    <td className="py-3">{record.quantity}</td>
                    <td className="py-3 font-mono text-xs">
                      {record.visitLogId
                        ? `${record.visitLogId.slice(0, 10)}…`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
