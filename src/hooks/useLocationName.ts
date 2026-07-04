import { useState, useEffect } from 'react';

const CACHE_KEY = 'location_name_cache';

interface NominatimResponse {
  address: {
    village?: string;
    hamlet?: string;
    suburb?: string;
    town?: string;
    city?: string;
    municipality?: string;
    county?: string;
    country?: string;
  };
}

interface Cache {
  lat: number;
  lon: number;
  name: string;
}

function loadCache(lat: number, lon: number): string | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache: Cache = JSON.parse(raw);
    const match = Math.abs(cache.lat - lat) < 0.01 && Math.abs(cache.lon - lon) < 0.01;
    return match ? cache.name : null;
  } catch {
    return null;
  }
}

function saveCache(lat: number, lon: number, name: string) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ lat, lon, name }));
  } catch {
    // ignore
  }
}

function pickName(addr: NominatimResponse['address']): string {
  return (
    addr.village ??
    addr.hamlet ??
    addr.suburb ??
    addr.town ??
    addr.city ??
    addr.municipality ??
    addr.county ??
    'Ukjent sted'
  );
}

export function useLocationName(lat: number | null, lon: number | null): string | null {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (lat === null || lon === null) return;

    const cached = loadCache(lat, lon);
    if (cached) {
      setName(cached);
      return;
    }

    const url =
      `https://nominatim.openstreetmap.org/reverse` +
      `?lat=${lat.toFixed(5)}&lon=${lon.toFixed(5)}&format=json&accept-language=nb`;

    fetch(url, { headers: { Accept: 'application/json' } })
      .then((r) => r.json() as Promise<NominatimResponse>)
      .then((data) => {
        const n = pickName(data.address);
        saveCache(lat, lon, n);
        setName(n);
      })
      .catch(() => {
        // silently ignore — coordinates shown as fallback in the UI
      });
  }, [lat, lon]);

  return name;
}
