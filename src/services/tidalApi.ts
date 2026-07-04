import type { TidalResponse } from '../types/tides';

const BASE = 'https://api.met.no/weatherapi/tidalwater/1.1/';

export async function fetchTides(lat: number, lon: number): Promise<TidalResponse | null> {
  const url = `${BASE}?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'MeloyvaerApp/1.0 https://github.com/meloyvaer/app',
    },
  });
  if (res.status === 422 || res.status === 404) return null;
  if (!res.ok) throw new Error(`Tidal fetch failed: ${res.status}`);
  return res.json();
}
