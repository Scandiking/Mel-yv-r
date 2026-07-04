import { useState, useEffect } from 'react';
import { fetchTides } from '../services/tidalApi';
import type { TidalResponse } from '../types/tides';

const CACHE_KEY = 'tides_cache';
const TTL_MS = 60 * 60 * 1000;

interface Cache {
  lat: number;
  lon: number;
  ts: number;
  data: TidalResponse | null;
}

function loadCache(lat: number, lon: number): TidalResponse | null | undefined {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return undefined;
    const cache: Cache = JSON.parse(raw);
    const sameLocation = Math.abs(cache.lat - lat) < 0.01 && Math.abs(cache.lon - lon) < 0.01;
    const fresh = Date.now() - cache.ts < TTL_MS;
    return sameLocation && fresh ? cache.data : undefined;
  } catch {
    return undefined;
  }
}

function saveCache(lat: number, lon: number, data: TidalResponse | null) {
  try {
    const cache: Cache = { lat, lon, ts: Date.now(), data };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
}

export interface TidesState {
  data: TidalResponse | null;
  loading: boolean;
  error: string | null;
}

export function useTides(lat: number | null, lon: number | null): TidesState {
  const [state, setState] = useState<TidesState>({ data: null, loading: false, error: null });

  useEffect(() => {
    if (lat === null || lon === null) return;

    const cached = loadCache(lat, lon);
    if (cached !== undefined) {
      setState({ data: cached, loading: false, error: null });
      return;
    }

    setState({ data: null, loading: true, error: null });
    fetchTides(lat, lon)
      .then((data) => {
        saveCache(lat, lon, data);
        setState({ data, loading: false, error: null });
      })
      .catch((err) => {
        setState({ data: null, loading: false, error: String(err) });
      });
  }, [lat, lon]);

  return state;
}
