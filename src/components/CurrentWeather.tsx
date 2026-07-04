import { symbolCodeToSvg } from '../services/symbolMap';
import type { ForecastTimestep } from '../types/weather';
import styles from './CurrentWeather.module.css';

function windDir(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

interface Props {
  current: ForecastTimestep;
  stale: boolean;
}

export function CurrentWeather({ current, stale }: Props) {
  const details = current.data.instant.details;
  const next = current.data.next_1_hours ?? current.data.next_6_hours;
  const symbolCode = next?.summary.symbol_code ?? 'cloudy';
  const precipitation = next?.details.precipitation_amount ?? 0;
  const precipProb = next?.details.probability_of_precipitation;

  return (
    <div className={styles.card}>
      {stale && <span className={styles.stale}>Offline – showing cached data</span>}
      <img
        className={styles.icon}
        src={symbolCodeToSvg(symbolCode)}
        alt={symbolCode.replace(/_/g, ' ')}
      />
      <div className={styles.temp}>
        {Math.round(details.air_temperature)}<span className={styles.unit}>°C</span>
      </div>
      <div className={styles.meta}>
        <span>Wind {details.wind_speed.toFixed(1)} m/s {windDir(details.wind_from_direction)}</span>
        {precipitation > 0 && (
          <span>{precipitation.toFixed(1)} mm{precipProb !== undefined ? ` (${Math.round(precipProb)}%)` : ''}</span>
        )}
        <span>Humidity {Math.round(details.relative_humidity)}%</span>
      </div>
    </div>
  );
}
