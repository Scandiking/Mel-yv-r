import type { ForecastResponse } from '../types/weather';

const BASE = 'https://api.met.no/weatherapi/locationforecast/2.0/compact';

export async function fetchForecast(lat: number, lon: number): Promise<ForecastResponse> {
  const url = `${BASE}?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Forecast fetch failed: ${res.status}`);
  return res.json();
}
