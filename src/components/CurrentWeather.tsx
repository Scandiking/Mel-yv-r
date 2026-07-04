import { useEffect, useState } from 'react';
import { symbolCodeToSvg, symbolCodeToNorwegian } from '../services/symbolMap';
import type { ForecastTimestep } from '../types/weather';
import styles from './CurrentWeather.module.css';

const DIRS = ['N', 'NØ', 'Ø', 'SØ', 'S', 'SV', 'V', 'NV'];
function windDir(deg: number): string {
  return DIRS[Math.round(deg / 45) % 8];
}

// Compass-rose dial: the needle shows where the wind is blowing TO (matching the
// hourly-chart arrows), while the printed letter below states the classic
// meteorological "blowing from" bearing.
function CompassRose({ speed, fromDeg }: { speed: number; fromDeg: number }) {
  const toDeg = (fromDeg + 180) % 360;
  const [angle, setAngle] = useState(toDeg - 55);

  useEffect(() => {
    const id = requestAnimationFrame(() => setAngle(toDeg));
    return () => cancelAnimationFrame(id);
  }, [toDeg]);

  const majorTicks = [0, 45, 90, 135, 180, 225, 270, 315];
  const cardinalLabels: Record<number, string> = { 0: 'N', 90: 'Ø', 180: 'S', 270: 'V' };

  return (
    <div className={styles.dialWrap}>
      <svg viewBox="0 0 100 100" width="108" height="108" className={styles.dial} aria-hidden="true">
        <circle cx="50" cy="50" r="44" className={styles.dialRing} />
        {majorTicks.map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const isCardinal = deg in cardinalLabels;
          const rOuter = 44;
          const rInner = isCardinal ? 37 : 39;
          const x1 = 50 + rOuter * Math.sin(rad);
          const y1 = 50 - rOuter * Math.cos(rad);
          const x2 = 50 + rInner * Math.sin(rad);
          const y2 = 50 - rInner * Math.cos(rad);
          const lx = 50 + 30 * Math.sin(rad);
          const ly = 50 - 30 * Math.cos(rad);
          return (
            <g key={deg}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} className={styles.dialTick} />
              {isCardinal && (
                <text x={lx} y={ly} className={styles.dialLabel} textAnchor="middle" dominantBaseline="middle">
                  {cardinalLabels[deg]}
                </text>
              )}
            </g>
          );
        })}
        <g className={styles.needle} style={{ transform: `rotate(${angle}deg)` }}>
          <path d="M 50 11 L 44 51 L 50 45 L 56 51 Z" className={styles.needleHead} />
          <line x1="50" y1="51" x2="50" y2="83" className={styles.needleTail} />
        </g>
        <circle cx="50" cy="50" r="3.5" className={styles.dialHub} />
      </svg>
      <div className={styles.dialReadout}>
        <span className={styles.dialSpeed}>{speed.toFixed(1)} m/s</span>
        <span className={styles.dialFrom}>fra {windDir(fromDeg)}</span>
      </div>
    </div>
  );
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
      {stale && <span className={styles.stale}>Offline</span>}

      <div className={styles.hero}>
        <div className={styles.readingCol}>
          <div className={styles.temp}>
            {Math.round(details.air_temperature)}<span className={styles.unit}>°C</span>
          </div>
          <div className={styles.description}>
            <img
              className={styles.icon}
              src={symbolCodeToSvg(symbolCode)}
              alt=""
            />
            {symbolCodeToNorwegian(symbolCode)}
          </div>

          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>Fuktighet</span>
              <span className={styles.statValue}>{Math.round(details.relative_humidity)}%</span>
            </div>
            {precipitation > 0 && (
              <div className={styles.stat}>
                <span className={styles.statLabel}>Nedbør</span>
                <span className={styles.statValue}>
                  {precipitation.toFixed(1)} mm{precipProb !== undefined ? ` · ${Math.round(precipProb)}%` : ''}
                </span>
              </div>
            )}
          </div>
        </div>

        <CompassRose speed={details.wind_speed} fromDeg={details.wind_from_direction} />
      </div>
    </div>
  );
}
