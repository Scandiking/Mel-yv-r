// Shared parser for MET Norway Tidalwater 1.1 plain-text format.
// Used by both the production Vercel Edge Function (api/tides.ts) and the Vite dev proxy.
export interface TideEntry { time: string; surge: number; tide: number; total: number }

export function parseTidalText(text: string, displayName: string) {
  const entries: TideEntry[] = [];

  for (const line of text.split('\n')) {
    const parts = line.trim().split(/\s+/);
    // Data lines: AAR MND DAG TIM MIN SURGE TIDE TOTAL ...
    if (parts.length < 8) continue;
    const year = parseInt(parts[0]);
    if (isNaN(year) || year < 2000 || year > 2100) continue;

    const surge = parseFloat(parts[5]);
    const tide  = parseFloat(parts[6]);
    const total = parseFloat(parts[7]);
    if (isNaN(surge) || isNaN(tide) || isNaN(total)) continue;

    const time = new Date(Date.UTC(
      year,
      parseInt(parts[1]) - 1,
      parseInt(parts[2]),
      parseInt(parts[3]),
      parseInt(parts[4]),
    )).toISOString();

    entries.push({ time, surge, tide, total });
  }

  return {
    tideLocations: [{
      name: displayName,
      coordinate: { lon: 0, lat: 0 },
      tide: entries,
    }],
  };
}
