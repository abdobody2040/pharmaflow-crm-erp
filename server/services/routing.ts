export type RouteStop = { plannedVisitId: string; accountId: string; accountName: string; latitude: number; longitude: number; priority: "critical" | "high" | "normal" | "low"; plannedStartAt: Date };
const priorityRank = { critical: 0, high: 1, normal: 2, low: 3 } as const;
const radians = (value: number) => value * Math.PI / 180;
const meters = (a: RouteStop, b: RouteStop) => { const dLat = radians(b.latitude - a.latitude); const dLon = radians(b.longitude - a.longitude); const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLon / 2) ** 2; return 6371000 * 2 * Math.asin(Math.sqrt(h)); };
export const priorityOrderedStops = (stops: RouteStop[]) => [...stops].sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || a.plannedStartAt.getTime() - b.plannedStartAt.getTime());
export const sequenceStops = <T extends RouteStop>(stops: T[]) => stops.map((stop, index) => ({ ...stop, sequence: index + 1 }));
export const fallbackRoute = (stops: RouteStop[]) => { const orderedStops = priorityOrderedStops(stops); const distanceMeters = orderedStops.reduce((total, stop, index) => index ? total + meters(orderedStops[index - 1]!, stop) : 0, 0); return { orderedStops, distanceMeters: Math.round(distanceMeters), durationSeconds: Math.round(distanceMeters / (40000 / 3600)), geometry: null as null, provider: "fallback" as const }; };

export async function optimizeWithOsrm(stops: RouteStop[]) {
  const fallback = fallbackRoute(stops); if (stops.length < 2 || !process.env.OSRM_BASE_URL) return fallback;
  const groups = ["critical", "high", "normal", "low"] as const; const orderedStops: RouteStop[] = []; let distanceMeters = 0; let durationSeconds = 0; let geometry: unknown = null;
  try {
    for (const priority of groups) { const group = fallback.orderedStops.filter(stop => stop.priority === priority); if (!group.length) continue; if (group.length === 1) { orderedStops.push(group[0]!); continue; }
      const coordinates = group.map(stop => `${stop.longitude},${stop.latitude}`).join(";"); const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), Number(process.env.ROUTING_TIMEOUT_MS ?? 5000));
      const response = await fetch(`${process.env.OSRM_BASE_URL.replace(/\/$/, "")}/trip/v1/driving/${coordinates}?source=first&roundtrip=false&overview=full&geometries=geojson&steps=false`, { signal: controller.signal }); clearTimeout(timer); if (!response.ok) throw new Error("OSRM unavailable"); const data = await response.json() as { code?: string; waypoints?: Array<{ waypoint_index: number }>; trips?: Array<{ distance: number; duration: number; geometry: unknown }> }; if (data.code !== "Ok" || !data.trips?.[0]) throw new Error("OSRM route unavailable");
      const optimized = data.waypoints!.map((waypoint, originalIndex) => ({ originalIndex, waypointIndex: waypoint.waypoint_index })).sort((a, b) => a.waypointIndex - b.waypointIndex).map(item => group[item.originalIndex]!); orderedStops.push(...optimized); distanceMeters += data.trips[0].distance; durationSeconds += data.trips[0].duration; geometry ??= data.trips[0].geometry;
    }
    return { orderedStops, distanceMeters: Math.round(distanceMeters), durationSeconds: Math.round(durationSeconds), geometry, provider: "osrm" as const };
  } catch { return fallback; }
}
