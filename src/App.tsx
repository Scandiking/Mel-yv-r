import { useGeolocation } from './hooks/useGeolocation';
import { useWeather } from './hooks/useWeather';
import { useTides } from './hooks/useTides';
import { useLocationName } from './hooks/useLocationName';
import { LocationConsent } from './components/LocationConsent';
import { CompassSpinner } from './components/CompassSpinner';
import { CurrentWeather } from './components/CurrentWeather';
import { HourlyForecast } from './components/HourlyForecast';
import { HourlyCharts } from './components/HourlyCharts';
import { DailyForecast } from './components/DailyForecast';
import './App.css';

export default function App() {
  const geo = useGeolocation();
  const weather = useWeather(geo.lat, geo.lon);
  const tides = useTides(geo.lat, geo.lon);
  const locationName = useLocationName(geo.lat, geo.lon);

  if (geo.needsConsent) {
    return <LocationConsent onAllow={geo.requestGeolocation} onManual={geo.setManualLocation} />;
  }

  if (geo.loading) {
    return (
      <div className="status">
        <CompassSpinner />
        <p>Finner posisjon…</p>
      </div>
    );
  }

  if (geo.error) {
    return <LocationConsent error={geo.error} onAllow={geo.requestGeolocation} onManual={geo.setManualLocation} />;
  }

  if (weather.loading && !weather.data) {
    return (
      <div className="status">
        <CompassSpinner />
        <p>Laster varsel…</p>
      </div>
    );
  }

  if (weather.error && !weather.data) {
    return (
      <div className="status">
        <p className="error-msg">Kunne ikke laste værdata.<br />{weather.error}</p>
      </div>
    );
  }

  const timeseries = weather.data?.properties.timeseries ?? [];
  const current = timeseries[0];

  return (
    <main className="app">
      <header className="app-header">
        <button className="location" onClick={geo.resetLocation} title="Endre posisjon">
          <span className="location-name">
            {locationName ?? `${geo.lat?.toFixed(3)}° N`}
          </span>
          {locationName && (
            <span className="coords">
              {geo.lat?.toFixed(3)}° N, {geo.lon?.toFixed(3)}° Ø
            </span>
          )}
        </button>
      </header>

      {current && (
        <CurrentWeather current={current} stale={weather.stale} />
      )}

      <div className="divider" />

      {timeseries.length > 0 && (
        <HourlyForecast timeseries={timeseries} />
      )}

      <div className="divider" />

      {timeseries.length > 0 && (
        <HourlyCharts timeseries={timeseries} tides={tides.data} />
      )}

      <div className="divider" />

      {timeseries.length > 0 && (
        <DailyForecast timeseries={timeseries} />
      )}

      <footer className="app-footer">
        <a href="/personvern.html">Personvern</a>
      </footer>
    </main>
  );
}
