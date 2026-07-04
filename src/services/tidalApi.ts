import type { TidalResponse } from '../types/tides';
import { findNearestHarbor } from './nearestHarbor';

// The Tidalwater 1.1 API takes a ?harbor=Name parameter (not lat/lon).
// In a browser the API rejects generic browser User-Agents, so we proxy through a Vercel
// Edge Function / Vite dev proxy that adds the required User-Agent header server-side.
// In the Capacitor Android APK the WebView sends the custom User-Agent from capacitor.config.ts
// so it can call the API directly without the proxy.
const isNative =
  typeof window !== 'undefined' &&
  !!(window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();

const BASE = isNative
  ? 'https://api.met.no/weatherapi/tidalwater/1.1/'
  : '/api/tides';

export async function fetchTides(lat: number, lon: number): Promise<TidalResponse | null> {
  // API expects lowercase harbor name
  const harbor = findNearestHarbor(lat, lon).toLowerCase();
  const url = `${BASE}?harbor=${encodeURIComponent(harbor)}`;
  const res = await fetch(url);
  if (res.status === 422 || res.status === 404) return null;
  if (!res.ok) throw new Error(`Tidal fetch ${res.status}`);
  return res.json();
}
