// Vercel Edge Function — fetches MET Norway Tidalwater 1.1 plain-text format,
// parses it into JSON matching TidalResponse, and returns it with CORS headers.
// Browsers can't call the API directly (User-Agent enforcement), so this proxy adds it.
export const config = { runtime: 'edge' };

interface TideEntry { time: string; surge: number; tide: number; total: number }

function parseTidalText(text: string, displayName: string) {
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

export default async function handler(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const harbor = searchParams.get('harbor');

  if (!harbor) {
    return new Response(JSON.stringify({ error: 'Missing harbor' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const upstream = `https://api.met.no/weatherapi/tidalwater/1.1/?harbor=${encodeURIComponent(harbor)}`;

  try {
    const res = await fetch(upstream, {
      headers: { 'User-Agent': 'MeloyvaerApp/1.0 (https://github.com/meloyvaer/app)' },
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Upstream ${res.status}` }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const text = await res.text();
    // Capitalize first letter for display (API receives lowercase)
    const displayName = harbor.charAt(0).toUpperCase() + harbor.slice(1);
    const json = parseTidalText(text, displayName);

    return new Response(JSON.stringify(json), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=3600',
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Upstream failed' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
