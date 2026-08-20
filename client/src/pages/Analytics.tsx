import {
  formatDate,
  formatDateTime,
  formatNumber,
  formatTime,
} from "@/lib/locale";
import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  MessageSquareText,
  Play,
  Send,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const prompts = [
  "Show visit activity for the last 90 days",
  "Show approved expense spend by category",
  "Show recorded sample distribution by product",
  "Show active accounts by tier",
];
function ResultChart({ result }: { result: any }) {
  if (!result.rows.length) return null;
  const Chart = result.plan.chart === "line" ? LineChart : BarChart;
  return (
    <div className="mt-5 h-60 rounded-xl border border-slate-100 bg-white p-3">
      <ResponsiveContainer width="100%" height="100%">
        <Chart data={result.rows}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey={result.plan.xKey} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          {result.plan.chart === "line" ? (
            <Line
              type="monotone"
              dataKey={result.plan.yKey}
              stroke="#147d66"
              strokeWidth={3}
            />
          ) : (
            <Bar
              dataKey={result.plan.yKey}
              fill="#147d66"
              radius={[5, 5, 0, 0]}
            />
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}
export default function Analytics() {
  const [question, setQuestion] = useState(prompts[0]);
  const [status, setStatus] = useState("open");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const utils = trpc.useUtils();
  const ask = trpc.analytics.ask.useMutation();
  const monitor = trpc.analytics.monitor.get.useQuery();
  const alerts = trpc.analytics.alerts.list.useQuery({ status: status as any });
  const runNow = trpc.analytics.monitor.runNow.useMutation({
    onSuccess: () => {
      utils.analytics.alerts.list.invalidate();
      utils.analytics.monitor.get.invalidate();
    },
  });
  const review = trpc.analytics.alerts.review.useMutation({
    onSuccess: () => utils.analytics.alerts.list.invalidate(),
  });
  const configure = trpc.analytics.monitor.configure.useMutation({
    onSuccess: () => utils.analytics.monitor.get.invalidate(),
  });
  const result = ask.data;
  const act = (
    id: string,
    action: "acknowledged" | "resolved" | "dismissed" | "reopened"
  ) => review.mutate({ id, action, note: notes[id] || undefined });
  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-[#10203d] p-6 text-white sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[.15em] text-[#63e1ba]">
          Governed analytics
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-[-.04em]">
          Ask your operational data
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
          Approved semantic metrics only; tenant data never reaches free-form
          SQL.
        </p>
      </section>
      <div className="grid gap-5 xl:grid-cols-[1.22fr_.78fr]">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <MessageSquareText className="h-5 w-5 text-[#147d66]" />
              <h3 className="font-bold">Natural-language query</h3>
            </div>
            <div className="mt-4 flex gap-2">
              <Input
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => e.key === "Enter" && ask.mutate({ question })}
              />
              <Button
                className="bg-[#147d66] hover:bg-[#0f6956]"
                disabled={ask.isPending}
                onClick={() => ask.mutate({ question })}
              >
                <Send className="mr-2 h-4 w-4" />
                Ask
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {prompts.map(p => (
                <button
                  key={p}
                  onClick={() => setQuestion(p)}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600"
                >
                  {p}
                </button>
              ))}
            </div>
            {ask.error && (
              <p className="mt-4 text-sm text-rose-600">{ask.error.message}</p>
            )}
            {result && (
              <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <div className="flex justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#147d66]">
                      {result.plan.intent.replaceAll("_", " ")}
                    </p>
                    <h4 className="mt-1 font-bold">{result.plan.title}</h4>
                    <p className="mt-1 text-sm text-slate-500">
                      {result.plan.explanation}
                    </p>
                  </div>
                  <p className="text-2xl font-bold">{result.summary.value}</p>
                </div>
                <ResultChart result={result} />
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        {result.columns.map((c: string) => (
                          <th
                            key={c}
                            className="border-b p-2 text-left capitalize"
                          >
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map((row: any, i: number) => (
                        <tr key={i}>
                          {result.columns.map((c: string) => (
                            <td key={c} className="border-b p-2">
                              {String(row[c])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-[#b96b22]" />
              <h3 className="font-bold">Daily anomaly monitor</h3>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              02:00 UTC after deployment; thresholds can be tuned after
              reviewing false positives.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Sample</p>
                <p className="text-xl font-bold">
                  {monitor.data?.sampleMultiplier ?? 3}×
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Expense</p>
                <p className="text-xl font-bold">
                  {monitor.data?.expenseMultiplier ?? 2}×
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" onClick={() => runNow.mutate()}>
                <Play className="mr-2 h-4 w-4" />
                Run now
              </Button>
              <Button
                className="bg-[#147d66]"
                disabled={!monitor.data}
                onClick={() =>
                  monitor.data &&
                  configure.mutate({
                    enabled: true,
                    sampleMultiplier: monitor.data.sampleMultiplier,
                    expenseMultiplier: monitor.data.expenseMultiplier,
                    territoryLookbackHours: monitor.data.territoryLookbackHours,
                  })
                }
              >
                Enable daily monitor
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between gap-3">
            <div className="flex gap-2">
              <ShieldAlert className="h-5 w-5 text-[#b96b22]" />
              <div>
                <h3 className="font-bold">Manager anomaly queue</h3>
                <p className="text-sm text-slate-500">
                  Review evidence with an immutable lifecycle note.
                </p>
              </div>
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["open", "acknowledged", "resolved", "dismissed"].map(x => (
                  <SelectItem key={x} value={x}>
                    {x}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="mt-5 space-y-3">
            {alerts.data?.map((alert: any) => (
              <div
                key={alert.id}
                className="rounded-2xl border border-slate-100 p-4"
              >
                <div className="flex flex-wrap justify-between gap-3">
                  <div className="flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="font-semibold capitalize">
                        {alert.anomalyType.replaceAll("_", " ")}{" "}
                        <Badge variant="outline" className="ml-2 capitalize">
                          {alert.severity}
                        </Badge>
                      </p>
                      <p className="text-xs text-slate-500">
                        Detected {formatDateTime(alert.detectedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {alert.status === "open" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => act(alert.id, "acknowledged")}
                        >
                          Acknowledge
                        </Button>
                        <Button
                          size="sm"
                          className="bg-[#147d66]"
                          onClick={() => act(alert.id, "resolved")}
                        >
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                          Resolve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => act(alert.id, "dismissed")}
                        >
                          Dismiss
                        </Button>
                      </>
                    )}
                    {(alert.status === "resolved" ||
                      alert.status === "dismissed") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => act(alert.id, "reopened")}
                      >
                        Reopen
                      </Button>
                    )}
                  </div>
                </div>
                <Input
                  className="mt-3"
                  value={notes[alert.id] ?? ""}
                  onChange={e =>
                    setNotes({ ...notes, [alert.id]: e.target.value })
                  }
                  placeholder="Review note retained as immutable investigation evidence"
                />
              </div>
            ))}
            {!alerts.data?.length && (
              <div className="rounded-2xl bg-slate-50 p-8 text-center">
                <Sparkles className="mx-auto h-6 w-6 text-emerald-600" />
                <p className="mt-2 font-medium">No {status} alerts</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
