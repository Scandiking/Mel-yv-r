import type { TidalResponse } from '../types/tides';
import { findNearestHarbor } from './nearestHarbor';
import { parseTidalText } from '../../api/_tidalParse';

// The Tidalwater 1.1 API takes a ?harbor=Name parameter (not lat/lon), rejects generic
// browser User-Agents, and returns plain text (not JSON) even when the request succeeds.
// In the browser we proxy through a Vercel Edge Function / Vite dev proxy that adds the
// User-Agent header and parses the plain text into JSON server-side. In the Capacitor
// Android APK the WebView sends the custom User-Agent from capacitor.config.ts, so it can
// call the API directly — but the response is still plain text, so it needs the same
// parsing step the proxy does.
function isNative(): boolean {
  // Checked at call time, not module load: on a cold start Capacitor injects
  // window.Capacitor into the WebView asynchronously, so freezing this as a
  // top-level constant could see it as "not native" and hit the (nonexistent)
  // /api/tides path if the bridge hadn't attached yet by the time this module
  // first evaluated.
  return (
    typeof window !== 'undefined' &&
    !!(window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()
  );
}

export async function fetchTides(lat: number, lon: number): Promise<TidalResponse | null> {
  const native = isNative();
  const base = native ? 'https://api.met.no/weatherapi/tidalwater/1.1/' : '/api/tides';
  // API expects lowercase harbor name
  const harbor = findNearestHarbor(lat, lon).toLowerCase();
  const url = `${base}?harbor=${encodeURIComponent(harbor)}`;
  const res = await fetch(url);
  if (res.status === 422 || res.status === 404) return null;
  if (!res.ok) throw new Error(`Tidal fetch ${res.status}`);
  if (!native) return res.json();

  const text = await res.text();
  const displayName = harbor.charAt(0).toUpperCase() + harbor.slice(1);
  return parseTidalText(text, displayName);
}
