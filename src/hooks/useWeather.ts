import { useState, useEffect } from 'react';
import { fetchForecast } from '../services/yrApi';
import type { ForecastResponse } from '../types/weather';

const CACHE_KEY = 'weather_cache';
const TTL_MS = 30 * 60 * 1000;

interface Cache {
  lat: number;
  lon: number;
  ts: number;
  data: ForecastResponse;
}

function loadCache(lat: number, lon: number): ForecastResponse | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache: Cache = JSON.parse(raw);
    const sameLocation = Math.abs(cache.lat - lat) < 0.01 && Math.abs(cache.lon - lon) < 0.01;
    const fresh = Date.now() - cache.ts < TTL_MS;
    return sameLocation && fresh ? cache.data : null;
  } catch {
    return null;
  }
}

function saveCache(lat: number, lon: number, data: ForecastResponse) {
  try {
    const cache: Cache = { lat, lon, ts: Date.now(), data };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // storage full or unavailable — ignore
  }
}

export interface WeatherState {
  data: ForecastResponse | null;
  error: string | null;
  loading: boolean;
  stale: boolean;
}

export function useWeather(lat: number | null, lon: number | null): WeatherState {
  const [state, setState] = useState<WeatherState>({
    data: null,
    error: null,
    loading: false,
    stale: false,
  });

  useEffect(() => {
    if (lat === null || lon === null) return;

    const cached = loadCache(lat, lon);
    if (cached) {
      setState({ data: cached, error: null, loading: false, stale: false });
    } else {
      setState((s) => ({ ...s, loading: true }));
    }

    fetchForecast(lat, lon)
      .then((data) => {
        saveCache(lat, lon, data);
        setState({ data, error: null, loading: false, stale: false });
      })
      .catch((err) => {
        setState((s) => ({
          ...s,
          loading: false,
          error: s.data ? null : String(err),
          stale: !!s.data,
        }));
      });
  }, [lat, lon]);

  return state;
}
