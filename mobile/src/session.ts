import AsyncStorage from "@react-native-async-storage/async-storage";

const key = "pharmaflow-mobile-session";
export type MobileSession = { shiftId: string; accessToken: string; apiBaseUrl: string; plannedStops: Array<{ latitude: number; longitude: number }> };

export async function readMobileSession(): Promise<MobileSession | null> {
  const stored = await AsyncStorage.getItem(key); if (!stored) return null;
  try { return JSON.parse(stored) as MobileSession; } catch { return null; }
}

export async function writeMobileSession(session: MobileSession) { await AsyncStorage.setItem(key, JSON.stringify(session)); }
