import { symbolCodeToSvg } from '../services/symbolMap';
import type { ForecastTimestep } from '../types/weather';
import styles from './DailyForecast.module.css';

interface DayData {
  label: string;
  symbolCode: string;
  min: number;
  max: number;
  rain: number;
}

function groupByDay(timeseries: ForecastTimestep[]): DayData[] {
  const days = new Map<string, { temps: number[]; symbols: string[]; rain: number }>();

  for (const step of timeseries) {
    const date = new Date(step.time);
    const key = date.toISOString().slice(0, 10);
    if (!days.has(key)) days.set(key, { temps: [], symbols: [], rain: 0 });
    const d = days.get(key)!;
    d.temps.push(step.data.instant.details.air_temperature);
    const period = step.data.next_6_hours ?? step.data.next_1_hours;
    if (period) {
      d.symbols.push(period.summary.symbol_code);
      d.rain += period.details.precipitation_amount ?? 0;
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  return Array.from(days.entries())
    .filter(([key]) => key >= today)
    .slice(0, 7)
    .map(([key, { temps, symbols, rain }]) => {
      const date = new Date(key + 'T12:00:00Z');
      const label =
        key === today
          ? 'Today'
          : date.toLocaleDateString('no-NO', { weekday: 'short' });
      const symbolCode = symbols[Math.floor(symbols.length / 2)] ?? 'cloudy';
      return {
        label,
        symbolCode,
        min: Math.round(Math.min(...temps)),
        max: Math.round(Math.max(...temps)),
        rain: parseFloat(rain.toFixed(1)),
      };
    });
}

interface Props {
  timeseries: ForecastTimestep[];
}

export function DailyForecast({ timeseries }: Props) {
  const days = groupByDay(timeseries);

  return (
    <div className={styles.wrapper}>
      <h2 className={styles.heading}>7-day forecast</h2>
      {days.map((day) => (
        <div key={day.label} className={styles.row}>
          <span className={styles.label}>{day.label}</span>
          <img className={styles.icon} src={symbolCodeToSvg(day.symbolCode)} alt={day.symbolCode} />
          <span className={styles.range}>
            <span className={styles.min}>{day.min}°</span>
            <span className={styles.sep}>/</span>
            <span className={styles.max}>{day.max}°</span>
          </span>
          {day.rain > 0 && <span className={styles.rain}>{day.rain} mm</span>}
        </div>
      ))}
    </div>
  );
}
