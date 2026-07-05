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

## Session updates — 2026-07-04

### Fixed: tide chart missing entirely in `npm run dev`
**Problem:** the Vite dev proxy forwarded api.met.no's raw plain-text tidal response
unchanged, but the client (`src/services/tidalApi.ts`) calls `res.json()`, expecting
the same parsed shape the production Vercel Edge Function returns. In dev, that
`JSON.parse` threw, `useTides` swallowed the error silently, and the tide chart just
never received data — it wasn't a rendering bug, the fetch itself was broken locally.

**Fix:** extracted the plain-text parser into a shared module, `api/_tidalParse.ts`,
used by both `api/tides.ts` (the production edge function) and a new Vite
`configureServer` middleware (`tidalDevProxy` in `vite.config.ts`) that now does the
same fetch-with-User-Agent + parse-to-JSON locally, instead of blindly proxying bytes.

### Redesigned the HourlyCharts panel
- Connected the temperature+rain, wind, wind-direction, and tide panels into one
  seamless card: removed the per-panel captions/gaps, hid the repeated time axis on
  all but the bottom-most panel, and added a single shared legend row.
- Added always-visible value labels on the temperature and wind-speed lines at every
  even hour (custom recharts `dot` renderers), so the reading doesn't require hover.
- Tide high/low points are now labeled directly on the tide curve; removed the old
  "pill row" of upcoming extrema that sat outside the scrollable chart.
- Fixed a misaligned "now" reference line in the tide panel: recharts'
  `allowDataOverflow` defaults to `false`, so the ~2h of pre-"now" context data added
  to the tide series silently stretched *that panel's* scale relative to the other
  two, shifting the whole timeline. Fixed with an explicit `allowDataOverflow: true`
  on the shared axis config.
- Added weather-symbol icons above the temperature labels.
- Fixed wind arrow direction: arrows were rotated to point toward where the wind
  comes *from* instead of where it's blowing *to* — rotated 180° so a "wind from
  north" reading now visibly points south.
- Hover is now synced across all three panels via `syncId` + `syncMethod="value"`
  (matched by timestamp, not array index, since the tide dataset has a different
  start offset/length than the weather data) — one hover now shows temperature,
  precipitation, wind speed + direction, and tide height together.

### Redesigned CurrentWeather (the hero)
Replaced the generic big-thin-number weather-widget look with a "ship's instrument
panel" identity, scoped entirely to `CurrentWeather.tsx`/`.module.css` + a Google
Fonts `<link>` in `index.html` (no other components touched):
- Palette: parchment / ink / deep-teal / brass / hazard-red, as local CSS vars on
  `.card` with light + dark variants — grounded in Meløysjøen being a fjord just
  inside the Arctic Circle.
- Type: Spectral serif for the temperature + condition text, IBM Plex Mono for
  instrument-style readouts (humidity, precipitation, compass bearing).
- Signature element: a compass-rose dial replaces the plain "Vind X m/s S" text
  line — brass ring, tick marks, and a needle that animates into the wind's bearing
  on load (respects `prefers-reduced-motion`), reusing the same from→to bearing
  convention fixed in HourlyCharts above.

---

## Session updates — 2026-07-05

### Android: signed release APK, distributed via GitHub Releases (not Play Store)
Decided against the Play Store given Google's new Android developer verification
requirements (see keepandroidopen.org) — distribution is GitHub Releases (installable
`.apk`) and, eventually, F-Droid.

- Installed the Android SDK (cmdline-tools, platform 35, build-tools 35.0.0) to
  `C:\Users\KM\Android\Sdk` — nothing was on this machine before, despite Android
  Studio being installed. Built with the JDK bundled in Android Studio (`jbr`,
  JDK 21) since the system's default `java` is still 1.8.
- Generated a self-signed release keystore (`android/keystore/meloyvaer-release.jks`,
  30-year validity). Keystore + passwords are gitignored and live only on this
  machine and in GitHub Actions secrets — losing the keystore means all future
  releases need a new signing identity and existing installs can't update in place.
- `android/app/build.gradle` reads signing config from `android/app/keystore.properties`
  (gitignored) when present, and accepts `-PversionCode`/`-PversionName` overrides.
- Added `.github/workflows/android-release.yml`: on any pushed `v*` tag, builds the
  web app, runs `cap sync android`, builds a signed release APK, and attaches it to
  a GitHub Release. Needs four repo secrets set manually (`ANDROID_KEYSTORE_BASE64`,
  `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`).

### Fixed: geolocation always failed inside the APK with "User denied Geolocation"
Happened even with the OS permission granted and GPS on. Root cause: `AndroidManifest.xml`
never declared `ACCESS_COARSE_LOCATION`/`ACCESS_FINE_LOCATION` — without those, Android
never shows the WebView a real permission grant to hand to `navigator.geolocation`,
regardless of what the user taps. Added both permissions; works correctly now.

### Fixed: header/footer content clipped by Android browser chrome
On a Samsung Galaxy S22 in Samsung Internet, the location name (top) and the
Personvern link (footer) were hidden behind the browser's UI panels and the
gesture nav bar. `index.html` already had `viewport-fit=cover`, but `App.css` never
consumed `env(safe-area-inset-*)`. Added it to `.app-header` (top) and `.app-footer`
(bottom).

### Got the release workflow actually working — 8 tags, 5 real bugs
First end-to-end run of `.github/workflows/android-release.yml` (`v1.0.0` through
`v1.0.8`), each tag surfacing a new failure once the previous one was fixed:

1. **`npx cap sync android` failed instantly** — `[fatal] The Capacitor CLI requires
   NodeJS >=22.0.0`. The workflow was still pinned to `node-version: 20`. Bumped to 22.
2. **`./gradlew: Permission denied` (exit 126)** — `android/gradlew` was committed from
   Windows as mode `100644` (not executable); Linux runners need the `+x` bit that Git
   itself tracks. Fixed with `git update-index --chmod=+x android/gradlew` and added
   `android/.gitattributes` pinning `gradlew` to LF line endings so a future Windows
   re-add can't quietly regress it again.
3. **`keystore password was incorrect` (from `packageRelease`)** — added a dedicated
   "Verify keystore password" step to fail fast instead of waiting through a multi-minute
   Gradle build, but the first version of that step redirected `keytool`'s stdout to
   `/dev/null` — `keytool` prints its errors to stdout, not stderr, so I'd silenced the
   only diagnostic the step existed to produce. Removed the redirect and added a
   `${#VAR}` length print (never the value) for the keystore file size and the password,
   which is safe to log and immediately shows a blank/wrong-length secret.
4. **Turned out to be a typo'd secret name**: `ANDROID_KEYSYORE_PASSWORD` (Y) instead of
   `ANDROID_KEYSTORE_PASSWORD` (T) — the workflow's real secret was never set, so it
   resolved to an empty string every time, which `keytool` reports as "password was
   incorrect" rather than "secret not found". The length-logging from fix #3 is what
   caught this (`raw secret length: 0`).
5. **"Create GitHub release" failed** after the APK itself built and signed
   successfully — the default `GITHUB_TOKEN` is read-only unless the workflow
   explicitly asks for write access. Added a top-level `permissions: contents: write`.

`v1.0.8` is the first real published release:
https://github.com/Scandiking/Mel-yv-r/releases/tag/v1.0.8

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

### CurrentWeather now depends on Google Fonts (Spectral, IBM Plex Mono)
Loaded via a `<link>` in `index.html`, not self-hosted. First load with no network
will fall back to system fonts (degrades fine, just not on-brand) since the PWA's
Workbox config doesn't cache the Google Fonts CDN yet. Fine for now; revisit if the
offline-first PWA use case ends up mattering more than it does today.

### Vercel proxy not yet deployed/tested in production
The `api/tides.ts` Edge Function has only been tested via the Vite dev proxy.
Needs a Vercel deployment to confirm it works in production before publishing as PWA.

### F-Droid submission not started
F-Droid builds from source rather than accepting our binary — needs a separate PR with a
build recipe to the `fdroiddata` repo. Worth doing once the GitHub Releases APK has had
more real-world testing.

### No PWA icons yet
`public/icons/icon-192.png` and `icon-512.png` referenced in the manifest don't exist.
The PWA will install but show a blank icon. Need to generate proper icons.
