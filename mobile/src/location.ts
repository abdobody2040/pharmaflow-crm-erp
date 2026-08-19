import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { enqueueMutation } from "./offline";
import SuperJSON from "superjson";

const TASK = "pharmaflow-active-shift-location";
const sessionKey = "pharmaflow-location-session";
type Session = { shiftId: string; accessToken: string; apiBaseUrl: string; plannedStops: Array<{ latitude: number; longitude: number }> };

function metresBetween(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const rad = (n: number) => n * Math.PI / 180; const R = 6371000; const dLat = rad(b.latitude - a.latitude); const dLon = rad(b.longitude - a.longitude); const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h));
}

TaskManager.defineTask(TASK, async ({ data, error }) => {
  if (error || !data) return;
  const sessionRaw = await AsyncStorage.getItem(sessionKey); if (!sessionRaw) return;
  const session: Session = JSON.parse(sessionRaw); const locations = (data as { locations: Location.LocationObject[] }).locations;
  for (const location of locations) {
    const point = location.coords; const nearPlannedStop = session.plannedStops.some(stop => metresBetween(point, stop) <= 200); const cadenceSeconds = nearPlannedStop ? 15 : 60;
    const payload = { clientMutationId: crypto.randomUUID(), shiftId: session.shiftId, latitude: String(point.latitude), longitude: String(point.longitude), accuracyMeters: Math.round(point.accuracy ?? 0), nearPlannedStop, capturedAt: new Date(location.timestamp).toISOString() };
    try { const response = await fetch(`${session.apiBaseUrl}/api/trpc/rep.location`, { method: "POST", headers: { Authorization: `Bearer ${session.accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ json: SuperJSON.serialize(payload) }) }); if (!response.ok) throw new Error("sync failed"); } catch { enqueueMutation({ id: payload.clientMutationId, type: "location", payload: JSON.stringify(payload), createdAt: new Date().toISOString() }); }
    await Location.startLocationUpdatesAsync(TASK, { accuracy: Location.Accuracy.Balanced, timeInterval: cadenceSeconds * 1000, distanceInterval: 0, pausesUpdatesAutomatically: false, showsBackgroundLocationIndicator: true, foregroundService: { notificationTitle: "PharmaFlow shift tracking active", notificationBody: `Location reporting every ${cadenceSeconds} seconds while your shift is active.` } });
  }
});

export async function requestShiftLocationConsent() {
  const foreground = await Location.requestForegroundPermissionsAsync(); if (foreground.status !== "granted") return false; const background = await Location.requestBackgroundPermissionsAsync(); return background.status === "granted";
}

export async function startShiftLocation(session: Session) { await AsyncStorage.setItem(sessionKey, JSON.stringify(session)); await Location.startLocationUpdatesAsync(TASK, { accuracy: Location.Accuracy.Balanced, timeInterval: 60000, distanceInterval: 0, pausesUpdatesAutomatically: false, showsBackgroundLocationIndicator: true, foregroundService: { notificationTitle: "PharmaFlow shift tracking active", notificationBody: "Location reporting every 60 seconds during your active shift." } }); }
export async function stopShiftLocation() { await Location.stopLocationUpdatesAsync(TASK); await AsyncStorage.removeItem(sessionKey); }
