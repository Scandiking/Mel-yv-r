import { useGeolocation } from './hooks/useGeolocation';
import { useWeather } from './hooks/useWeather';
import { useTides } from './hooks/useTides';
import { useLocationName } from './hooks/useLocationName';
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

  if (geo.loading) {
    return (
      <div className="status">
        <div className="spinner" />
        <p>Finner posisjon…</p>
      </div>
    );
  }

  if (geo.error) {
    return (
      <div className="status">
        <p className="error-msg">Posisjonstilgang avvist.<br />Tillat posisjonstilgang og last siden på nytt.</p>
      </div>
    );
  }

  if (weather.loading && !weather.data) {
    return (
      <div className="status">
        <div className="spinner" />
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
        <div className="location">
          <span className="location-name">
            {locationName ?? `${geo.lat?.toFixed(3)}° N`}
          </span>
          {locationName && (
            <span className="coords">
              {geo.lat?.toFixed(3)}° N, {geo.lon?.toFixed(3)}° Ø
            </span>
          )}
        </div>
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
    </main>
  );
}
