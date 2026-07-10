import styles from './BirthdayCard.module.css';

const PENNANT_COLORS = ['var(--hazard)', 'var(--deep)', 'var(--brass)'];

function Pennants() {
  const flags = Array.from({ length: 9 }, (_, i) => {
    const x = 20 + i * 33;
    return (
      <polygon
        key={i}
        points={`${x},6 ${x + 18},6 ${x + 9},26`}
        fill={PENNANT_COLORS[i % PENNANT_COLORS.length]}
        opacity={0.85}
      />
    );
  });
  return (
    <svg className={styles.pennants} viewBox="0 0 320 30" preserveAspectRatio="xMidYMin meet" aria-hidden="true">
      <path d="M0 4 Q160 12 320 4" fill="none" stroke="var(--brass)" strokeWidth="1.25" opacity="0.6" />
      {flags}
    </svg>
  );
}

function Anchor() {
  return (
    <svg className={styles.tool} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="5" r="2.5" />
      <line x1="12" y1="7.5" x2="12" y2="21" />
      <line x1="8" y1="10.5" x2="16" y2="10.5" />
      <path d="M5 13H2.5a9.5 9.5 0 0 0 19 0H19" />
    </svg>
  );
}

function ShipsWheel() {
  return (
    <svg className={styles.tool} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="1.8" />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        return (
          <line
            key={i}
            x1={12 + 1.8 * Math.cos(a)}
            y1={12 + 1.8 * Math.sin(a)}
            x2={12 + 10 * Math.cos(a)}
            y2={12 + 10 * Math.sin(a)}
          />
        );
      })}
    </svg>
  );
}

function Dividers() {
  return (
    <svg className={styles.tool} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="4" r="1.8" />
      <line x1="11" y1="5.5" x2="6.5" y2="20" />
      <line x1="13" y1="5.5" x2="17.5" y2="20" />
      <path d="M8 15.5a7.5 7.5 0 0 0 8 0" />
    </svg>
  );
}

export function BirthdayCard() {
  const now = new Date();
  if (now.getMonth() !== 6 || now.getDate() !== 10) return null;

  return (
    <div className={styles.card}>
      <Pennants />
      <h2 className={styles.heading}>Kunngjøring fra broen — 10. juli</h2>
      <p className={styles.greeting}>Gratulerer med dagen, Pappa!</p>
      <p className={styles.sub}>Hipp hipp hurra for Kristian</p>
      <div className={styles.toolRow}>
        <Anchor />
        <ShipsWheel />
        <Dividers />
      </div>
      <p className={styles.wish}>Flagget til topps og full musikk – vi ønsker deg en strålende dag!</p>
    </div>
  );
}
