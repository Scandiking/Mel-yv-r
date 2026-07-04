# Meloyvaer — Dev Log

## What's been built

### Core architecture
- React 18 + TypeScript + Vite
- PWA via `vite-plugin-pwa` (service worker, manifest, offline caching)
- Android APK via Capacitor.js (`capacitor.config.ts`, `overrideUserAgent` set)
- No login, no backend (except a thin Vercel proxy for tidal data — see below)
- `localStorage` caching: weather 30 min TTL, tides 1 h TTL

### Weather (Yr.no Locationforecast 2.0)
- `src/services/yrApi.ts` — bare `fetch(url)`, no custom headers (browser handles it fine)
- `src/hooks/useWeather.ts` — fetches, caches, exposes `stale` flag for offline display
- `src/types/weather.ts` — typed interfaces for the compact JSON response

### UI components
- `CurrentWeather` — big temp + symbol + wind/humidity/pressure
- `HourlyForecast` — scrollable 24 h strip with icons and temps
- `DailyForecast` — 7-day summary rows with min/max temps and precipitation
- `HourlyCharts` — combined swipeable 7-day panel:
  - Temperature line + rainfall bars (shared ComposedChart, dual Y axes)
  - Wind speed line chart (purple)
  - Wind direction arrows strip
  - Tidal area chart (when data available)

### Theming
- CSS custom properties (`--bg`, `--text`, `--accent`, etc.) in `src/index.css`
- `@media (prefers-color-scheme: dark)` automatically follows device theme

### Location
- `src/hooks/useGeolocation.ts` — `navigator.geolocation.getCurrentPosition()`
- `src/hooks/useLocationName.ts` — Nominatim reverse geocoding, returns village/town name in Norwegian (`accept-language=nb`)
- Location name shown large; coordinates shown small below it

### Weather icons
- Package: `@yr/weather-symbols` (83 SVGs in `dist/svg/`)
- `scripts/copy-icons.js` copies them to `public/weather-icons/` (ESM script, needs `import` not `require`)
- Run via `predev` / `prebuild` npm hooks so they're always fresh
- `src/services/symbolMap.ts` maps API `symbol_code` strings to filenames and Norwegian descriptions

---

## Tidal data — the long story

### API facts (learned the hard way)
- **Endpoint:** `GET https://api.met.no/weatherapi/tidalwater/1.1/`
- **Required parameter:** `harbor=bodø` — a named Norwegian harbour, NOT lat/lon
- **Available harbours:** 31 stations listed at `/weatherapi/tidalwater/1.1/available`
- **Response format:** Plain text (fixed-width columns), NOT JSON
- **Columns:** `AAR MND DAG TIM MIN SURGE TIDE TOTAL 0p 25p 50p 75p 100p`
- **Interval:** 10 minutes; covers ~3 days ahead
- **User-Agent:** Required (requests with generic browser UA get 400 with no CORS headers)

### Why direct browser fetch always failed
Browsers cannot set the `User-Agent` header via `fetch()` — it's a forbidden header.
The API returns 400 for generic browser UAs, and 400 responses don't include CORS headers,
so the browser throws `TypeError: NetworkError` before we can even inspect the status code.

### Solution
- **`api/tides.ts`** — Vercel Edge Function that:
  1. Accepts `?harbor=bodø`
  2. Adds `User-Agent` header server-side
  3. Fetches plain text from api.met.no
  4. Parses fixed-width text into `TidalResponse` JSON
  5. Returns JSON with `Access-Control-Allow-Origin: *`
- **`vite.config.ts`** — Vite dev proxy `/api/tides` → `api.met.no` (same logic, for local dev)
- **`src/services/nearestHarbor.ts`** — lookup table of 31 harbour coordinates; finds closest to user's GPS position
- **Android APK** — Capacitor sets custom User-Agent, so the APK calls the API directly (no proxy needed)

---

## Known issues / still open

### Tidal data only covers ~3 days, chart expects 7
The Tidalwater API returns ~3 days of 10-min data. The HourlyCharts panel is 7 days wide.
The last 4 days of the tide chart area will be empty. No simple fix without a different data source.

### TidalForecast component is dead code
`src/components/TidalForecast.tsx` and `TidalForecast.module.css` still exist but are not
imported anywhere (replaced by the inline tide section in HourlyCharts). Safe to delete.

### CSS parsing warnings in console
Two warnings: `Error in parsing value for 'letter-spacing'` and `Error in parsing value for 'font-size'`.
These come from the existing component CSS and don't affect functionality. Track down and fix later.

### Vercel proxy not yet deployed/tested in production
The `api/tides.ts` Edge Function has only been tested via the Vite dev proxy.
Needs a Vercel deployment to confirm it works in production before publishing as PWA.

### Android APK not yet built or tested
`npx cap sync android` and Android Studio build steps have not been run since the tidal rewrite.
The `overrideUserAgent` in `capacitor.config.ts` is set correctly but untested end-to-end.

### No PWA icons yet
`public/icons/icon-192.png` and `icon-512.png` referenced in the manifest don't exist.
The PWA will install but show a blank icon. Need to generate proper icons.
