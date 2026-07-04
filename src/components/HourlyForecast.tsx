import { symbolCodeToSvg } from '../services/symbolMap';
import type { ForecastTimestep } from '../types/weather';
import styles from './HourlyForecast.module.css';

interface Props {
  timeseries: ForecastTimestep[];
}

export function HourlyForecast({ timeseries }: Props) {
  const hours = timeseries.slice(0, 24).filter((t) => t.data.next_1_hours);

  return (
    <div className={styles.wrapper}>
      <h2 className={styles.heading}>Neste 24 timer</h2>
      <div className={styles.strip}>
        {hours.map((step) => {
          const date = new Date(step.time);
          const hour = date.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
          const code = step.data.next_1_hours!.summary.symbol_code;
          const temp = Math.round(step.data.instant.details.air_temperature);
          const rain = step.data.next_1_hours!.details.precipitation_amount ?? 0;
          return (
            <div key={step.time} className={styles.item}>
              <span className={styles.time}>{hour}</span>
              <img className={styles.icon} src={symbolCodeToSvg(code)} alt={code} />
              <span className={styles.temp}>{temp}°</span>
              {rain > 0 && <span className={styles.rain}>{rain.toFixed(1)}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
