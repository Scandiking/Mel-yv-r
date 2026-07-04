import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'locationPref';

type StoredPref =
  | { mode: 'auto' }
  | { mode: 'manual'; lat: number; lon: number };

function loadPref(): StoredPref | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.mode === 'auto') return { mode: 'auto' };
    if (parsed?.mode === 'manual' && typeof parsed.lat === 'number' && typeof parsed.lon === 'number') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function savePref(pref: StoredPref) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pref));
  } catch {
    // storage full or unavailable — ignore
  }
}

function clearPref() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export interface GeoState {
  lat: number | null;
  lon: number | null;
  error: string | null;
  loading: boolean;
  /** No stored preference yet — show the explanation screen before asking the browser. */
  needsConsent: boolean;
  requestGeolocation: () => void;
  setManualLocation: (lat: number, lon: number) => void;
  resetLocation: () => void;
}

export function useGeolocation(): GeoState {
  const [pref, setPref] = useState<StoredPref | null>(() => loadPref());
  const [state, setState] = useState({
    lat: null as number | null,
    lon: null as number | null,
    error: null as string | null,
    loading: false,
  });

  const requestGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState({ lat: null, lon: null, error: 'Nettleseren støtter ikke posisjonstjenester.', loading: false });
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({ lat: pos.coords.latitude, lon: pos.coords.longitude, error: null, loading: false });
        savePref({ mode: 'auto' });
        setPref({ mode: 'auto' });
      },
      (err) => {
        setState({ lat: null, lon: null, error: err.message, loading: false });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }, []);

  // If the user already granted GPS access on a previous visit, fetch silently
  // without showing the explanation screen again.
  useEffect(() => {
    if (pref?.mode === 'auto') requestGeolocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setManualLocation = useCallback((lat: number, lon: number) => {
    savePref({ mode: 'manual', lat, lon });
    setPref({ mode: 'manual', lat, lon });
    setState({ lat, lon, error: null, loading: false });
  }, []);

  const resetLocation = useCallback(() => {
    clearPref();
    setPref(null);
    setState({ lat: null, lon: null, error: null, loading: false });
  }, []);

  if (pref?.mode === 'manual') {
    return {
      lat: pref.lat,
      lon: pref.lon,
      error: null,
      loading: false,
      needsConsent: false,
      requestGeolocation,
      setManualLocation,
      resetLocation,
    };
  }

  return {
    lat: state.lat,
    lon: state.lon,
    error: state.error,
    loading: state.loading,
    needsConsent: pref === null,
    requestGeolocation,
    setManualLocation,
    resetLocation,
  };
}
