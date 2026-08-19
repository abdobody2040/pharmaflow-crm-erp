import { describe, expect, it } from "vitest";
import { fallbackRoute, optimizeWithOsrm, priorityOrderedStops, sequenceStops } from "./services/routing";
import { mapsNavigationUrl } from "../mobile/src/routeLinks";

const stops = [
  { plannedVisitId: "11111111-1111-4111-8111-111111111111", accountId: "21111111-1111-4111-8111-111111111111", accountName: "Low", latitude: 0, longitude: 0.002, priority: "low" as const, plannedStartAt: new Date("2026-08-19T11:00:00Z") },
  { plannedVisitId: "12222222-2222-4222-8222-222222222222", accountId: "22222222-2222-4222-8222-222222222222", accountName: "Critical", latitude: 0, longitude: 0, priority: "critical" as const, plannedStartAt: new Date("2026-08-19T10:00:00Z") },
  { plannedVisitId: "13333333-3333-4333-8333-333333333333", accountId: "23333333-3333-4333-8333-333333333333", accountName: "High", latitude: 0, longitude: 0.001, priority: "high" as const, plannedStartAt: new Date("2026-08-19T09:00:00Z") },
];

describe("self-hosted route optimization", () => {
  it("preserves visit priority ahead of planned time in its fallback ordering", () => {
    expect(priorityOrderedStops(stops).map(stop => stop.accountName)).toEqual(["Critical", "High", "Low"]);
  });
  it("returns a nonzero Haversine fallback route when OSRM is not configured", async () => {
    const previous = process.env.OSRM_BASE_URL; delete process.env.OSRM_BASE_URL; const route = await optimizeWithOsrm(stops); if (previous) process.env.OSRM_BASE_URL = previous;
    expect(route.provider).toBe("fallback"); expect(route.distanceMeters).toBeGreaterThan(220); expect(route.durationSeconds).toBeGreaterThan(0);
  });
  it("returns the same priority-preserving route for explicit fallback calculation", () => {
    expect(fallbackRoute(stops).orderedStops.map(stop => stop.priority)).toEqual(["critical", "high", "low"]);
  });
  it("generates stable 1-based waypoint sequence values for dispatch", () => {
    expect(sequenceStops(priorityOrderedStops(stops)).map(stop => `${stop.accountName}:${stop.sequence}`)).toEqual(["Critical:1", "High:2", "Low:3"]);
  });
  it("generates an installed-maps compatible turn-by-turn hand-off URL", () => {
    expect(mapsNavigationUrl({ latitude: 40.7128, longitude: -74.006 })).toBe("https://www.google.com/maps/dir/?api=1&destination=40.7128%2C-74.006&travelmode=driving");
  });
});
