import { useState, type FormEvent } from 'react';
import styles from './LocationConsent.module.css';

interface Props {
  error?: string | null;
  onAllow: () => void;
  onManual: (lat: number, lon: number) => void;
}

export function LocationConsent({ error, onAllow, onManual }: Props) {
  const [showManual, setShowManual] = useState(!!error);
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  function submitManual(e: FormEvent) {
    e.preventDefault();
    const latNum = parseFloat(lat.replace(',', '.'));
    const lonNum = parseFloat(lon.replace(',', '.'));
    if (Number.isNaN(latNum) || latNum < -90 || latNum > 90 || Number.isNaN(lonNum) || lonNum < -180 || lonNum > 180) {
      setFormError('Skriv inn gyldig breddegrad (-90 til 90) og lengdegrad (-180 til 180).');
      return;
    }
    onManual(latNum, lonNum);
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h1 className={styles.heading}>Om posisjonen din</h1>
        <p className={styles.body}>
          Denne appen gir egentlig blaffen i hvor du er — men den spør om posisjonen din
          likevel, rett og slett så du slipper å taste inn GPS-koordinater for hånd hver gang.
        </p>

        {error && (
          <p className={styles.errorMsg}>
            Nettleseren avviste forespørselen ({error}). Sett posisjonen manuelt i stedet.
          </p>
        )}

        {!showManual ? (
          <div className={styles.actions}>
            <button className={styles.primary} onClick={onAllow}>Ja, del posisjon</button>
            <button className={styles.secondary} onClick={() => setShowManual(true)}>
              Nei, jeg setter den selv
            </button>
          </div>
        ) : (
          <form className={styles.form} onSubmit={submitManual}>
            <label className={styles.field}>
              Breddegrad
              <input inputMode="decimal" placeholder="66.83" value={lat} onChange={(e) => setLat(e.target.value)} />
            </label>
            <label className={styles.field}>
              Lengdegrad
              <input inputMode="decimal" placeholder="13.41" value={lon} onChange={(e) => setLon(e.target.value)} />
            </label>
            {formError && <p className={styles.errorMsg}>{formError}</p>}
            <div className={styles.actions}>
              <button type="submit" className={styles.primary}>Bruk denne posisjonen</button>
              {!error && (
                <button type="button" className={styles.secondary} onClick={() => setShowManual(false)}>
                  Tilbake
                </button>
              )}
            </div>
          </form>
        )}

        <a className={styles.privacyLink} href="/personvern.html">Personvern</a>
      </div>
    </div>
  );
}
