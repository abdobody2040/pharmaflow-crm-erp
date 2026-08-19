export type NavigationStop = { latitude: number; longitude: number };
export const mapsNavigationUrl = (stop: NavigationStop) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${stop.latitude},${stop.longitude}`)}&travelmode=driving`;
