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
import { symbolCodeToSvg } from '../services/symbolMap';
import styles from './HourlyCharts.module.css';

// ─── constants ───────────────────────────────────────────────────────────────

const PX_PER_HOUR = 16;
const DAYS = 7;
const DURATION_MS = DAYS * 24 * 3600_000;
const Y_LEFT = 36;
const Y_RIGHT = 28; // wide enough to label the rain axis
const CHART_MARGIN = { top: 14, right: 0, left: 0, bottom: 2 };
// Extra headroom for the weather icon drawn above each temperature label.
const TEMP_CHART_MARGIN = { ...CHART_MARGIN, top: 34 };
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
  symbol: string;
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
        symbol: period.summary.symbol_code,
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

// ─── always-on value labels (every even hour) ───────────────────────────────

function isEvenHour(ts: number): boolean {
  return new Date(ts).getHours() % 2 === 0;
}

function TempValueDot(props: { cx?: number; cy?: number; payload?: HourPoint; value?: number }) {
  const { cx, cy, payload, value } = props;
  if (cx == null || cy == null || !payload || !isEvenHour(payload.ts)) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={2.5} fill="var(--temp)" />
      <image href={symbolCodeToSvg(payload.symbol)} x={cx - 8} y={cy - 33} width={16} height={16} />
      <text x={cx} y={cy - 9} textAnchor="middle" fontSize={9} fontWeight={600} fill="var(--temp)">
        {value}°
      </text>
    </g>
  );
}

function WindValueDot(props: { cx?: number; cy?: number; payload?: HourPoint; value?: number }) {
  const { cx, cy, payload, value } = props;
  if (cx == null || cy == null || !payload || !isEvenHour(payload.ts)) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={2.5} fill="var(--brass)" />
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize={9} fontWeight={600} fill="var(--brass)">
        {value}
      </text>
    </g>
  );
}

// Keeps extrema labels from clipping off the left/right edge of the plot area.
function makeTideValueDot(extremaByTs: Map<number, TideExtrema>, plotLeft: number, plotRight: number) {
  return function TideValueDot(props: { cx?: number; cy?: number; payload?: TidePoint }) {
    const { cx, cy, payload } = props;
    const extremum = payload && extremaByTs.get(payload.ts);
    if (cx == null || cy == null || !extremum) return null;
    const isHigh = extremum.type === 'high';
    const EDGE = 18;
    let anchor: 'start' | 'middle' | 'end' = 'middle';
    let textX = cx;
    if (cx - plotLeft < EDGE) {
      anchor = 'start';
      textX = cx + 4;
    } else if (plotRight - cx < EDGE) {
      anchor = 'end';
      textX = cx - 4;
    }
    return (
      <g>
        <circle cx={cx} cy={cy} r={3} fill={isHigh ? 'var(--deep)' : 'var(--brass)'} />
        <text
          x={textX}
          y={isHigh ? cy - 10 : cy + 18}
          textAnchor={anchor}
          fontSize={9}
          fontWeight={600}
          fill={isHigh ? 'var(--deep)' : 'var(--brass)'}
        >
          {extremum.total.toFixed(2)}m
        </text>
      </g>
    );
  };
}

// ─── wind arrow ──────────────────────────────────────────────────────────────

// `direction` is wind_from_direction (meteorological "from" bearing), so the
// arrow is rotated 180° further to point where the wind is actually blowing to.
function WindArrow({ direction }: { direction: number }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      style={{ transform: `rotate(${direction + 180}deg)`, display: 'block', flexShrink: 0 }}
      aria-hidden="true"
    >
      <line x1="12" y1="4" x2="12" y2="20" stroke="var(--brass)" strokeWidth="2.5" strokeLinecap="round" />
      <polyline
        points="7,11 12,4 17,11"
        stroke="var(--brass)"
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
    background: 'var(--parchment)',
    border: '1px solid var(--card-border)',
    borderRadius: 4,
    fontSize: 12,
    fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
    padding: '6px 10px',
  },
  labelStyle: { color: 'var(--ink)' },
};
const TOOLTIP_CURSOR = { stroke: 'var(--shallow)', strokeDasharray: '3 3' };
// Shared syncId keeps the hover cursor + tooltip lined up across all three
// panels; syncMethod "value" matches by timestamp instead of array index,
// since the tide dataset starts earlier and is bucketed differently.
const SYNC_ID = 'hourly-charts';

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

  const hasTide = tideData.length > 0 && !!tideLocation;

  // Extrema (high/low) plotted directly on the tide chart, keyed by timestamp.
  const extremaByTs = new Map<number, TideExtrema>(
    (hasTide ? findExtrema(tideData) : []).map((e) => [new Date(e.time).getTime(), e]),
  );
  const tideDot = makeTideValueDot(extremaByTs, Y_LEFT, chartWidth - Y_RIGHT);

  const xAxisProps = {
    dataKey: 'ts' as const,
    type: 'number' as const,
    scale: 'time' as const,
    domain: [now, domainEnd] as [number, number],
    // Tide data includes a couple of hours before "now" for curve context; without this
    // recharts silently stretches the scale to fit that overflow, shifting the now-line
    // out of alignment with the temperature/wind panels.
    allowDataOverflow: true,
    ticks,
    tickFormatter: tickLabel,
    tick: { fill: 'var(--ink)', fontSize: 9 },
    tickLine: false,
    axisLine: false,
  };

  // Only the bottom-most panel shows the shared time axis labels; the rest stay
  // aligned but hidden so the stacked charts read as one connected block.
  const xAxisHidden = { ...xAxisProps, tick: false, height: 1 };
  const xAxisVisible = { ...xAxisProps, height: 18 };
  const weatherPanelIsLast = !hasTide;

  const yAxisLeft = {
    yAxisId: 'left' as const,
    width: Y_LEFT,
    tick: { fill: 'var(--ink)', fontSize: 10 },
    tickLine: false,
    axisLine: false,
  };

  const yAxisRight = {
    yAxisId: 'right' as const,
    orientation: 'right' as const,
    width: Y_RIGHT,
    tick: { fill: 'var(--ink)', fontSize: 9 },
    tickLine: false,
    axisLine: false,
  };

  return (
    <div className={styles.wrapper}>
      <h2 className={styles.heading}>Timevarsel</h2>
      <p className={styles.hint}>← sveip for å se 7 dager frem</p>

      <div className={styles.scrollOuter}>
        <div className={styles.chartStack} style={{ width: chartWidth }}>

          {/* ── temperature (line, left axis) + rain (bars, right axis) ── */}
          <ComposedChart width={chartWidth} height={CHART_HEIGHT_COMBINED} data={weatherData} margin={TEMP_CHART_MARGIN} syncId={SYNC_ID} syncMethod="value">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--shallow)" vertical={false} />
            <XAxis {...(weatherPanelIsLast ? xAxisVisible : xAxisHidden)} />
            <YAxis
              {...yAxisLeft}
              domain={[tempMin, tempMax]}
              tickFormatter={(v: number) => `${v}°`}
            />
            <YAxis
              {...yAxisRight}
              domain={[0, rainDomainMax]}
              tickFormatter={(v: number) => `${v}`}
              label={{ value: 'mm', position: 'insideTopRight', offset: -2, style: { fill: 'var(--ink)', fontSize: 9 } }}
            />
            {tempMin < 0 && tempMax > 0 && (
              <ReferenceLine yAxisId="left" y={0} stroke="var(--shallow)" strokeDasharray="3 3" />
            )}
            <ReferenceLine yAxisId="left" x={now} stroke="var(--hazard)" strokeDasharray="3 3" strokeWidth={1.5} />
            <Tooltip
              {...TOOLTIP_STYLE}
              cursor={TOOLTIP_CURSOR}
              labelFormatter={(label) => tooltipLabel(Number(label))}
              formatter={(value, name) => {
                const v = Number(value);
                if (name === 'temp') return [`${v} °C`, 'Temperatur'];
                if (name === 'rain') return [`${v} mm`, 'Nedbør'];
                return [v, name];
              }}
            />
            {/* Bars first so the temp line renders on top */}
            <Bar yAxisId="right" dataKey="rain" fill="var(--deep)" opacity={0.55} radius={[2, 2, 0, 0]} maxBarSize={10} />
            <Line yAxisId="left" type="monotone" dataKey="temp" stroke="var(--temp)" strokeWidth={2} dot={TempValueDot} activeDot={{ r: 4, fill: 'var(--temp)' }} />
          </ComposedChart>

          {/* ── wind speed ── */}
          <ComposedChart width={chartWidth} height={CHART_HEIGHT_WIND} data={weatherData} margin={CHART_MARGIN} syncId={SYNC_ID} syncMethod="value">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--shallow)" vertical={false} />
            <XAxis {...(weatherPanelIsLast ? xAxisVisible : xAxisHidden)} />
            <YAxis
              yAxisId="left"
              width={Y_LEFT}
              domain={[0, Math.ceil(maxWind) + 1]}
              tick={{ fill: 'var(--ink)', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis yAxisId="right" orientation="right" width={Y_RIGHT} tick={false} tickLine={false} axisLine={false} />
            <ReferenceLine yAxisId="left" x={now} stroke="var(--hazard)" strokeDasharray="3 3" strokeWidth={1.5} />
            <Tooltip
              cursor={TOOLTIP_CURSOR}
              content={({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: HourPoint }> }) => {
                const point = payload?.[0]?.payload;
                if (!active || !point) return null;
                return (
                  <div style={TOOLTIP_STYLE.contentStyle}>
                    <div style={TOOLTIP_STYLE.labelStyle}>{tooltipLabel(point.ts)}</div>
                    <div style={{ color: 'var(--brass)' }}>{point.windSpeed} m/s · {compassDir(point.windDir)}</div>
                  </div>
                );
              }}
            />
            <Line yAxisId="left" type="monotone" dataKey="windSpeed" stroke="var(--brass)" strokeWidth={1.5} dot={WindValueDot} activeDot={{ r: 3, fill: 'var(--brass)' }} />
          </ComposedChart>

          {/* ── wind direction arrows ── */}
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
          {hasTide && (
            <AreaChart width={chartWidth} height={CHART_HEIGHT_TIDE} data={tideData} margin={CHART_MARGIN} syncId={SYNC_ID} syncMethod="value">
              <defs>
                <linearGradient id="tideGradPanel" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--deep)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--deep)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--shallow)" vertical={false} />
              <XAxis {...xAxisVisible} />
              <YAxis
                yAxisId="left"
                width={Y_LEFT}
                tick={{ fill: 'var(--ink)', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${v}m`}
              />
              {/* Hidden axis reserving the same right-side width as the other panels, so the "now" line lines up */}
              <YAxis yAxisId="right" orientation="right" width={Y_RIGHT} tick={false} tickLine={false} axisLine={false} />
              <ReferenceLine yAxisId="left" x={now} stroke="var(--hazard)" strokeDasharray="3 3" strokeWidth={1.5} />
              <Tooltip
                {...TOOLTIP_STYLE}
                cursor={TOOLTIP_CURSOR}
                labelFormatter={(label) => tooltipLabel(Number(label))}
                formatter={(value) => [`${Number(value).toFixed(2)} m`, 'Vannstand']}
                itemStyle={{ color: 'var(--deep)' }}
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="total"
                stroke="var(--deep)"
                strokeWidth={2}
                fill="url(#tideGradPanel)"
                dot={tideDot}
              />
            </AreaChart>
          )}

        </div>
      </div>

      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <i className={styles.legendLine} style={{ background: 'var(--temp)' }} />
          Temperatur °C
        </span>
        <span className={styles.legendItem}>
          <i className={styles.legendSwatch} style={{ background: 'var(--deep)' }} />
          Nedbør mm
        </span>
        <span className={styles.legendItem}>
          <i className={styles.legendLine} style={{ background: 'var(--brass)' }} />
          Vind m/s
        </span>
        {hasTide && (
          <span className={styles.legendItem}>
            <i className={styles.legendLine} style={{ background: 'var(--deep)' }} />
            Tidevann — {tideLocation!.name}
          </span>
        )}
      </div>
    </div>
  );
}
