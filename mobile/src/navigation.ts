import { Linking } from "react-native";
import type { MobileSession } from "./session";
import { mapsNavigationUrl } from "./routeLinks";

export async function launchNavigation(stop: MobileSession["plannedStops"][number]) { await Linking.openURL(mapsNavigationUrl(stop)); }
