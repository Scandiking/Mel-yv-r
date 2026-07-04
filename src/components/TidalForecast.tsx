import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import type { TidalResponse, TideExtrema } from '../types/tides';
import styles from './TidalForecast.module.css';

function findExtrema(entries: { time: string; total: number }[]): TideExtrema[] {
  const result: TideExtrema[] = [];
  for (let i = 1; i < entries.length - 1; i++) {
    const prev = entries[i - 1].total;
    const curr = entries[i].total;
    const next = entries[i + 1].total;
    if (curr > prev && curr > next) result.push({ ...entries[i], type: 'high' });
    else if (curr < prev && curr < next) result.push({ ...entries[i], type: 'low' });
  }
  return result;
}

interface Props {
  data: TidalResponse;
}

export function TidalForecast({ data }: Props) {
  const location = data.tideLocations[0];
  if (!location) return null;

  const now = Date.now();
  const next24 = location.tide.filter((e) => {
    const t = new Date(e.time).getTime();
    return t >= now - 3600000 && t <= now + 23 * 3600000;
  });

  const chartData = next24.map((e) => ({
    time: e.time,
    label: new Date(e.time).toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
    total: parseFloat(e.total.toFixed(2)),
  }));

  const extrema = findExtrema(next24.map((e) => ({ time: e.time, total: e.total })));
  const upcoming = extrema.filter((e) => new Date(e.time).getTime() > now).slice(0, 4);

  const nowLabel = new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={styles.wrapper}>
      <h2 className={styles.heading}>Tidal water — {location.name}</h2>

      <div className={styles.extremaRow}>
        {upcoming.map((e) => (
          <div key={e.time} className={`${styles.extremum} ${e.type === 'high' ? styles.high : styles.low}`}>
            <span className={styles.extremumType}>{e.type === 'high' ? 'High' : 'Low'}</span>
            <span className={styles.extremumVal}>{e.total.toFixed(2)} m</span>
            <span className={styles.extremumTime}>
              {new Date(e.time).toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="tideGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            tick={{ fill: '#64748b', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v}m`}
          />
          <Tooltip
            contentStyle={{ background: '#132040', border: 'none', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: '#94a3b8' }}
            itemStyle={{ color: '#38bdf8' }}
            formatter={(v) => [`${Number(v).toFixed(2)} m`, 'Water level']}
          />
          <ReferenceLine x={nowLabel} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1.5} />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#38bdf8"
            strokeWidth={2}
            fill="url(#tideGrad)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
