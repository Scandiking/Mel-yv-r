import {
  ComposedChart,
  AreaChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import type { ForecastTimestep } from '../types/weather';
import type { TidalResponse, TideExtrema } from '../types/tides';
import styles from './HourlyCharts.module.css';

// ─── constants ───────────────────────────────────────────────────────────────

const PX_PER_HOUR = 16;
const DAYS = 7;
const DURATION_MS = DAYS * 24 * 3600_000;
const Y_LEFT = 36;
const Y_RIGHT = 28; // wide enough to label the rain axis
const CHART_MARGIN = { top: 6, right: 0, left: 0, bottom: 0 };
const CHART_HEIGHT_COMBINED = 160; // temperature line + rain bars
const CHART_HEIGHT_WIND = 80;     // wind speed line
const CHART_HEIGHT_TIDE = 100;

// ─── helpers ─────────────────────────────────────────────────────────────────

const DIRS = ['N', 'NØ', 'Ø', 'SØ', 'S', 'SV', 'V', 'NV'];
function compassDir(deg: number): string {
  return DIRS[Math.round(deg / 45) % 8];
}

function every6h(start: number, end: number): number[] {
  const step = 6 * 3600_000;
  const first = Math.ceil(start / step) * step;
  const ticks: number[] = [];
  for (let t = first; t <= end; t += step) ticks.push(t);
  return ticks;
}

function tickLabel(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours();
  if (h === 0) return d.toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric' });
  return String(h).padStart(2, '0') + ':00';
}

function tooltipLabel(ts: number): string {
  return new Date(ts).toLocaleString('nb-NO', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── extrema ─────────────────────────────────────────────────────────────────

function findExtrema(entries: { ts: number; total: number }[]): TideExtrema[] {
  const result: TideExtrema[] = [];
  for (let i = 1; i < entries.length - 1; i++) {
    const prev = entries[i - 1].total;
    const curr = entries[i].total;
    const next = entries[i + 1].total;
    if (curr > prev && curr > next) {
      result.push({ time: new Date(entries[i].ts).toISOString(), total: curr, type: 'high' });
    } else if (curr < prev && curr < next) {
      result.push({ time: new Date(entries[i].ts).toISOString(), total: curr, type: 'low' });
    }
  }
  return result;
}

// ─── data builders ───────────────────────────────────────────────────────────

interface HourPoint {
  ts: number;
  temp: number;
  rain: number;
  windDir: number;
  windSpeed: number;
}

function buildWeatherData(timeseries: ForecastTimestep[], now: number, cutoff: number): HourPoint[] {
  return timeseries
    .filter((t) => {
      const ts = new Date(t.time).getTime();
      return ts >= now && ts <= cutoff && (t.data.next_1_hours ?? t.data.next_6_hours);
    })
    .map((t) => {
      const period = t.data.next_1_hours ?? t.data.next_6_hours!;
      return {
        ts: new Date(t.time).getTime(),
        temp: parseFloat(t.data.instant.details.air_temperature.toFixed(1)),
        rain: parseFloat((period.details.precipitation_amount ?? 0).toFixed(1)),
        windDir: t.data.instant.details.wind_from_direction,
        windSpeed: parseFloat(t.data.instant.details.wind_speed.toFixed(1)),
      };
    });
}

interface TidePoint { ts: number; total: number }

function buildTideData(tides: TidalResponse, now: number, cutoff: number): TidePoint[] {
  const location = tides.tideLocations[0];
  if (!location?.tide?.length) return [];

  // Downsample to hourly buckets regardless of the API's native interval.
  // Start 2 hours before now so the chart has context around the "now" marker.
  const windowStart = now - 2 * 3_600_000;
  const hourlyMap = new Map<number, number>();
  for (const entry of location.tide) {
    const ts = new Date(entry.time).getTime();
    if (ts < windowStart || ts > cutoff) continue;
    const bucket = Math.round(ts / 3_600_000) * 3_600_000;
    if (!hourlyMap.has(bucket)) hourlyMap.set(bucket, parseFloat(entry.total.toFixed(2)));
  }

  return Array.from(hourlyMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([ts, total]) => ({ ts, total }));
}

// ─── wind arrow ──────────────────────────────────────────────────────────────

function WindArrow({ direction }: { direction: number }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      style={{ transform: `rotate(${direction}deg)`, display: 'block', flexShrink: 0 }}
      aria-hidden="true"
    >
      <line x1="12" y1="4" x2="12" y2="20" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
      <polyline
        points="7,11 12,4 17,11"
        stroke="var(--accent)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

// ─── tooltip style ───────────────────────────────────────────────────────────

const TOOLTIP_STYLE = {
  contentStyle: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: 12,
  },
  labelStyle: { color: 'var(--text-2)' },
};

// ─── component ───────────────────────────────────────────────────────────────

interface Props {
  timeseries: ForecastTimestep[];
  tides?: TidalResponse | null;
}

export function HourlyCharts({ timeseries, tides }: Props) {
  const now = Date.now();
  const domainEnd = now + DURATION_MS;

  const weatherData = buildWeatherData(timeseries, now, domainEnd);
  if (weatherData.length === 0) return null;

  const tideData = tides ? buildTideData(tides, now, domainEnd) : [];
  const tideLocation = tides?.tideLocations[0];

  const ticks = every6h(now, domainEnd);
  const chartWidth = DAYS * 24 * PX_PER_HOUR + Y_LEFT + Y_RIGHT;

  const temps = weatherData.map((d) => d.temp);
  const tempMin = Math.floor(Math.min(...temps)) - 1;
  const tempMax = Math.ceil(Math.max(...temps)) + 1;
  const maxRain = Math.max(...weatherData.map((d) => d.rain), 1);
  // Rain domain: multiply so bars occupy roughly the bottom third of the combined chart
  const rainDomainMax = Math.max(5, Math.ceil(maxRain)) * 4;

  const maxWind = Math.max(...weatherData.map((d) => d.windSpeed), 2);

  // Wind direction arrows: every other hour to avoid crowding
  const windItems = weatherData.filter((_, i) => i % 2 === 0);

  // Tide extrema pills shown above the scroll (always visible)
  const upcomingExtrema: TideExtrema[] = tideData.length > 0
    ? findExtrema(tideData).filter((e) => new Date(e.time).getTime() > now).slice(0, 4)
    : [];

  const xAxisProps = {
    dataKey: 'ts' as const,
    type: 'number' as const,
    scale: 'time' as const,
    domain: [now, domainEnd] as [number, number],
    ticks,
    tickFormatter: tickLabel,
    tick: { fill: 'var(--text-3)', fontSize: 9 },
    tickLine: false,
    axisLine: false,
  };

  const yAxisLeft = {
    yAxisId: 'left' as const,
    width: Y_LEFT,
    tick: { fill: 'var(--text-3)', fontSize: 10 },
    tickLine: false,
    axisLine: false,
  };

  const yAxisRight = {
    yAxisId: 'right' as const,
    orientation: 'right' as const,
    width: Y_RIGHT,
    tick: { fill: 'var(--text-3)', fontSize: 9 },
    tickLine: false,
    axisLine: false,
  };

  return (
    <div className={styles.wrapper}>
      <h2 className={styles.heading}>Timevarsel</h2>
      <p className={styles.hint}>← sveip for å se 7 dager frem</p>

      {/* Tide extrema pills — outside scroll so always visible */}
      {upcomingExtrema.length > 0 && (
        <div className={styles.extremaRow}>
          {upcomingExtrema.map((e) => (
            <div
              key={e.time}
              className={`${styles.extremum} ${e.type === 'high' ? styles.high : styles.low}`}
            >
              <span className={styles.extremumType}>{e.type === 'high' ? 'Høyvann' : 'Lavvann'}</span>
              <span className={styles.extremumVal}>{e.total.toFixed(2)} m</span>
              <span className={styles.extremumTime}>
                {new Date(e.time).toLocaleTimeString('nb-NO', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className={styles.scrollOuter}>
        <div style={{ width: chartWidth }}>

          {/* ── temperature (line, left axis) + rain (bars, right axis) ── */}
          <p className={styles.chartLabel}>Temperatur °C · Nedbør mm</p>
          <ComposedChart width={chartWidth} height={CHART_HEIGHT_COMBINED} data={weatherData} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
            <XAxis {...xAxisProps} />
            <YAxis
              {...yAxisLeft}
              domain={[tempMin, tempMax]}
              tickFormatter={(v: number) => `${v}°`}
            />
            <YAxis
              {...yAxisRight}
              domain={[0, rainDomainMax]}
              tickFormatter={(v: number) => `${v}`}
              label={{ value: 'mm', position: 'insideTopRight', offset: -2, style: { fill: 'var(--text-3)', fontSize: 9 } }}
            />
            {tempMin < 0 && tempMax > 0 && (
              <ReferenceLine yAxisId="left" y={0} stroke="var(--text-4)" strokeDasharray="3 3" />
            )}
            <ReferenceLine yAxisId="left" x={now} stroke="var(--warn)" strokeDasharray="3 3" strokeWidth={1.5} />
            <Tooltip
              {...TOOLTIP_STYLE}
              labelFormatter={tooltipLabel}
              formatter={(v: number, name: string) => {
                if (name === 'temp') return [`${v} °C`, 'Temperatur'];
                if (name === 'rain') return [`${v} mm`, 'Nedbør'];
                return [v, name];
              }}
            />
            {/* Bars first so the temp line renders on top */}
            <Bar yAxisId="right" dataKey="rain" fill="var(--accent-b)" opacity={0.75} radius={[2, 2, 0, 0]} maxBarSize={10} />
            <Line yAxisId="left" type="monotone" dataKey="temp" stroke="var(--accent)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: 'var(--accent)' }} />
          </ComposedChart>

          {/* ── wind speed ── */}
          <p className={styles.chartLabel}>Vind m/s</p>
          <ComposedChart width={chartWidth} height={CHART_HEIGHT_WIND} data={weatherData} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
            <XAxis {...xAxisProps} />
            <YAxis
              yAxisId="left"
              width={Y_LEFT}
              domain={[0, Math.ceil(maxWind) + 1]}
              tick={{ fill: 'var(--text-3)', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis yAxisId="right" orientation="right" width={Y_RIGHT} tick={false} tickLine={false} axisLine={false} />
            <ReferenceLine yAxisId="left" x={now} stroke="var(--warn)" strokeDasharray="3 3" strokeWidth={1.5} />
            <Tooltip
              {...TOOLTIP_STYLE}
              labelFormatter={tooltipLabel}
              formatter={(v: number) => [`${v} m/s`, 'Vind']}
              itemStyle={{ color: '#8b5cf6' }}
            />
            <Line yAxisId="left" type="monotone" dataKey="windSpeed" stroke="#8b5cf6" strokeWidth={1.5} dot={false} activeDot={{ r: 3, fill: '#8b5cf6' }} />
          </ComposedChart>

          {/* ── wind direction arrows ── */}
          <p className={styles.chartLabel}>Vindretning</p>
          <div className={styles.windStrip} style={{ width: chartWidth }}>
            {windItems.map((d) => {
              const offsetPx = ((d.ts - now) / 3600_000) * PX_PER_HOUR;
              return (
                <div key={d.ts} className={styles.windItem} style={{ left: Y_LEFT + offsetPx }}>
                  <WindArrow direction={d.windDir} />
                  <span className={styles.windDir}>{compassDir(d.windDir)}</span>
                </div>
              );
            })}
          </div>

          {/* ── tide ── */}
          {tideData.length > 0 && tideLocation && (
            <>
              <p className={styles.chartLabel}>Tidevann — {tideLocation.name}</p>
              <AreaChart width={chartWidth} height={CHART_HEIGHT_TIDE} data={tideData} margin={CHART_MARGIN}>
                <defs>
                  <linearGradient id="tideGradPanel" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                <XAxis {...xAxisProps} />
                <YAxis
                  width={Y_LEFT}
                  tick={{ fill: 'var(--text-3)', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `${v}m`}
                />
                <ReferenceLine x={now} stroke="var(--warn)" strokeDasharray="3 3" strokeWidth={1.5} />
                <Tooltip
                  {...TOOLTIP_STYLE}
                  labelFormatter={tooltipLabel}
                  formatter={(v: number) => [`${Number(v).toFixed(2)} m`, 'Vannstand']}
                  itemStyle={{ color: 'var(--accent)' }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  fill="url(#tideGradPanel)"
                  dot={false}
                />
              </AreaChart>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
