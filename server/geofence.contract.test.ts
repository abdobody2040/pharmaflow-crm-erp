import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { geofenceTransition, haversineMeters, IDLE_DISTANCE_METERS, IDLE_WINDOW_SECONDS, isIdlePair } from "./services/geofence";
import { tripMileageMeters } from "./routers/tracking";

describe("MySQL-compatible GPS analytics", () => {
  it("calculates predictable geodesic distances without a PostGIS dependency", () => {
    const meters = haversineMeters({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0.001 });
    expect(meters).toBeGreaterThan(110);
    expect(meters).toBeLessThan(112);
  });
  it("detects idle only after the configured duration within the configured distance", () => {
    expect(isIdlePair(IDLE_DISTANCE_METERS, IDLE_WINDOW_SECONDS)).toBe(true);
    expect(isIdlePair(IDLE_DISTANCE_METERS + 1, IDLE_WINDOW_SECONDS)).toBe(false);
    expect(isIdlePair(IDLE_DISTANCE_METERS, IDLE_WINDOW_SECONDS - 1)).toBe(false);
  });
  it("emits the correct territory and planned-HCP transition labels", () => {
    expect(geofenceTransition("territory", true)).toBe("enter");
    expect(geofenceTransition("territory", false)).toBe("exit");
    expect(geofenceTransition("hcp_stop", true)).toBe("near");
    expect(geofenceTransition("hcp_stop", false)).toBe("far");
  });
  it("accumulates Haversine distance across a trip route", () => {
    const meters = tripMileageMeters([{ latitude: "0", longitude: "0" }, { latitude: "0", longitude: "0.001" }, { latitude: "0", longitude: "0.002" }]);
    expect(meters).toBeGreaterThan(220);
    expect(meters).toBeLessThan(224);
  });
  it("registers tracking reads/configuration without destructive geofence routes", () => {
    const paths = Object.keys((appRouter as any)._def.procedures);
    expect(paths).toContain("tracking.live");
    expect(paths).toContain("tracking.trip");
    expect(paths).toContain("tracking.geofences.create");
    expect(paths.some(path => /^tracking\.geofences\.(delete|remove)/.test(path))).toBe(false);
  });
});
