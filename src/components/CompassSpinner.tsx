import styles from './CompassSpinner.module.css';

const MAJOR_TICKS = [0, 45, 90, 135, 180, 225, 270, 315];
const CARDINAL_LABELS: Record<number, string> = { 0: 'N', 90: 'Ø', 180: 'S', 270: 'V' };

// Same compass-rose face as the wind dial on the hero card, but with the
// needle spinning continuously instead of settling on a real bearing.
export function CompassSpinner() {
  return (
    <svg viewBox="0 0 100 100" width="72" height="72" className={styles.dial} role="status" aria-label="Laster">
      <circle cx="50" cy="50" r="44" className={styles.ring} />
      {MAJOR_TICKS.map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const isCardinal = deg in CARDINAL_LABELS;
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
            <line x1={x1} y1={y1} x2={x2} y2={y2} className={styles.tick} />
            {isCardinal && (
              <text x={lx} y={ly} className={styles.label} textAnchor="middle" dominantBaseline="middle">
                {CARDINAL_LABELS[deg]}
              </text>
            )}
          </g>
        );
      })}
      <g className={styles.needle}>
        <path d="M 50 11 L 44 51 L 50 45 L 56 51 Z" className={styles.needleHead} />
        <line x1="50" y1="51" x2="50" y2="83" className={styles.needleTail} />
      </g>
      <circle cx="50" cy="50" r="3.5" className={styles.hub} />
    </svg>
  );
}
