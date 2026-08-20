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
import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, Polyline, TileLayer } from "react-leaflet";
import {
  CalendarDays,
  Navigation,
  Route,
  Timer,
  TriangleAlert,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AccessDenied } from "./Tenants";

const allowed = ["admin", "manager", "rep"];
const color = {
  critical: "#d25f55",
  high: "#d98b2b",
  normal: "#5865cf",
  low: "#64748b",
};

export default function RoutesPage() {
  const { user } = useAuth();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [repUserId, setRepUserId] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const dateValue = useMemo(() => new Date(`${date}T12:00:00Z`), [date]);
  const route = trpc.routing.optimizeDaily.useQuery(
    { date: dateValue, repUserId: repUserId ? Number(repUserId) : undefined },
    { enabled: submitted && !!user && allowed.includes(user.role) }
  );
  if (!user || !allowed.includes(user.role)) return <AccessDenied />;
  const stops = route.data?.stops ?? [];
  const center: [number, number] = stops.length
    ? [stops[0]!.latitude, stops[0]!.longitude]
    : [20, 0];
  const line = stops.map(
    stop => [stop.latitude, stop.longitude] as [number, number]
  );
  const distanceMiles = ((route.data?.distanceMeters ?? 0) / 1609.344).toFixed(
    1
  );
  const durationMinutes = Math.round((route.data?.durationSeconds ?? 0) / 60);
  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.15em] text-[#1e9274]">
            Routing operations
          </p>
          <h2 className="mt-1 text-2xl font-bold">Daily route optimization</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Priority-preserving multi-stop sequencing through the private OSRM
            service. Critical visits remain ahead of lower-priority stops.
          </p>
        </div>
        <Badge className="h-fit border-0 bg-[#e9f8f2] px-3 py-2 text-[#168064]">
          <Route className="mr-2 h-4 w-4" />
          Self-hosted OSRM
        </Badge>
      </section>
      <Card>
        <CardContent className="p-5">
          <form
            onSubmit={event => {
              event.preventDefault();
              setSubmitted(true);
            }}
            className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
          >
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">
                Route date
              </label>
              <Input
                type="date"
                value={date}
                onChange={event => {
                  setDate(event.target.value);
                  setSubmitted(false);
                }}
              />
            </div>
            {user.role !== "rep" && (
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">
                  Rep user ID
                </label>
                <Input
                  value={repUserId}
                  onChange={event => {
                    setRepUserId(event.target.value);
                    setSubmitted(false);
                  }}
                  placeholder="Leave blank for your route"
                />
              </div>
            )}
            <Button className="self-end bg-[#147d66] hover:bg-[#0f6956]">
              <Navigation className="mr-2 h-4 w-4" />
              Optimize route
            </Button>
          </form>
        </CardContent>
      </Card>
      {submitted && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <Route className="h-5 w-5 text-[#5865cf]" />
                <p className="mt-3 text-sm font-semibold">{distanceMiles} mi</p>
                <p className="mt-1 text-xs text-slate-500">
                  Estimated route distance
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <Timer className="h-5 w-5 text-[#b96b22]" />
                <p className="mt-3 text-sm font-semibold">
                  {durationMinutes} min
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Estimated driving time
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <CalendarDays className="h-5 w-5 text-[#168064]" />
                <p className="mt-3 text-sm font-semibold">
                  {stops.length} stops
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {route.data?.provider === "osrm"
                    ? "OSRM-optimized"
                    : "Priority-preserving fallback"}
                </p>
              </CardContent>
            </Card>
          </div>
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="h-[420px] bg-slate-100">
                <MapContainer
                  center={center}
                  zoom={stops.length ? 11 : 2}
                  className="h-full w-full"
                >
                  <TileLayer
                    url="/tiles/{z}/{x}/{y}.png"
                    attribution="&copy; OpenStreetMap contributors"
                  />
                  {line.length > 1 && (
                    <Polyline
                      positions={line}
                      pathOptions={{ color: "#5865cf", weight: 5 }}
                    />
                  )}{" "}
                  {stops.map(stop => (
                    <CircleMarker
                      key={stop.plannedVisitId}
                      center={[stop.latitude, stop.longitude]}
                      radius={9}
                      pathOptions={{
                        color: color[stop.priority],
                        fillColor: color[stop.priority],
                        fillOpacity: 1,
                      }}
                    />
                  ))}
                </MapContainer>
              </div>
            </CardContent>
          </Card>
          <div className="grid gap-5 xl:grid-cols-[1fr_.85fr]">
            <Card>
              <CardContent className="p-5">
                <h3 className="font-bold">Optimized stop sequence</h3>
                <div className="mt-4 space-y-3">
                  {stops.length ? (
                    stops.map(stop => (
                      <div
                        key={stop.plannedVisitId}
                        className="flex gap-3 rounded-xl border border-slate-100 p-3"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold">
                          {stop.sequence}
                        </div>
                        <div>
                          <p className="font-semibold">{stop.accountName}</p>
                          <p className="mt-1 text-xs capitalize text-slate-500">
                            <span
                              className="font-bold"
                              style={{ color: color[stop.priority] }}
                            >
                              {stop.priority}
                            </span>{" "}
                            · {formatTime(stop.plannedStartAt)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="py-10 text-center text-sm text-slate-400">
                      No coordinate-ready planned visits for this route.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2">
                  <TriangleAlert className="h-5 w-5 text-[#b96b22]" />
                  <h3 className="font-bold">Route exceptions</h3>
                </div>
                <div className="mt-4 space-y-3">
                  {route.data?.skipped.length ? (
                    route.data.skipped.map(stop => (
                      <div
                        key={stop.plannedVisitId}
                        className="rounded-xl bg-[#fff8ed] p-3"
                      >
                        <p className="text-sm font-semibold">
                          {stop.accountName}
                        </p>
                        <p className="mt-1 text-xs text-[#9b5e1f]">
                          {stop.reason}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="py-10 text-center text-sm text-slate-400">
                      No coordinate exceptions.
                    </p>
                  )}{" "}
                  {route.data?.provider === "fallback" && (
                    <p className="rounded-xl border border-[#f2d5af] bg-[#fff8ed] p-3 text-xs text-[#8a561f]">
                      OSRM was not available, so the route preserves priority
                      and uses straight-line estimates. Confirm OSRM readiness
                      before dispatch.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
