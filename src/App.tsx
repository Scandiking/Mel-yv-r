import { useGeolocation } from './hooks/useGeolocation';
import { useWeather } from './hooks/useWeather';
import { useTides } from './hooks/useTides';
import { CurrentWeather } from './components/CurrentWeather';
import { HourlyForecast } from './components/HourlyForecast';
import { DailyForecast } from './components/DailyForecast';
import { TidalForecast } from './components/TidalForecast';
import './App.css';

export default function App() {
  const geo = useGeolocation();
  const weather = useWeather(geo.lat, geo.lon);
  const tides = useTides(geo.lat, geo.lon);

  if (geo.loading) {
    return (
      <div className="status">
        <div className="spinner" />
        <p>Finding your location…</p>
      </div>
    );
  }

  if (geo.error) {
    return (
      <div className="status">
        <p className="error-msg">Location access denied.<br />Allow location access and reload.</p>
      </div>
    );
  }

  if (weather.loading && !weather.data) {
    return (
      <div className="status">
        <div className="spinner" />
        <p>Loading weather…</p>
      </div>
    );
  }

  if (weather.error && !weather.data) {
    return (
      <div className="status">
        <p className="error-msg">Could not load weather data.<br />{weather.error}</p>
      </div>
    );
  }

  const timeseries = weather.data?.properties.timeseries ?? [];
  const current = timeseries[0];

  return (
    <main className="app">
      <header className="app-header">
        <span className="coords">{geo.lat?.toFixed(3)}° N, {geo.lon?.toFixed(3)}° E</span>
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
        <DailyForecast timeseries={timeseries} />
      )}

      {tides.data && (
        <>
          <div className="divider" />
          <TidalForecast data={tides.data} />
        </>
      )}
    </main>
  );
}
