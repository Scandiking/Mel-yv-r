import { useState, type FormEvent } from 'react';
import styles from './LocationConsent.module.css';
import { useT } from '../i18n/useT';

interface Props {
  error?: string | null;
  onAllow: () => void;
  onManual: (lat: number, lon: number) => void;
}

export function LocationConsent({ error, onAllow, onManual }: Props) {
  const t = useT();
  const [showManual, setShowManual] = useState(!!error);
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  function submitManual(e: FormEvent) {
    e.preventDefault();
    const latNum = parseFloat(lat.replace(',', '.'));
    const lonNum = parseFloat(lon.replace(',', '.'));
    if (Number.isNaN(latNum) || latNum < -90 || latNum > 90 || Number.isNaN(lonNum) || lonNum < -180 || lonNum > 180) {
      setFormError(t.invalidCoords);
      return;
    }
    onManual(latNum, lonNum);
  }

  function errorMessage() {
    if (!error) return null;
    if (error === 'GEO_NOT_SUPPORTED') return t.locationNotSupported;
    return t.locationBrowserRejected(error);
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h1 className={styles.heading}>{t.locationTitle}</h1>
        <p className={styles.body}>{t.locationBody}</p>

        {error && (
          <p className={styles.errorMsg}>{errorMessage()}</p>
        )}

        {!showManual ? (
          <div className={styles.actions}>
            <button className={styles.primary} onClick={onAllow}>{t.allowLocation}</button>
            <button className={styles.secondary} onClick={() => setShowManual(true)}>
              {t.enterManually}
            </button>
          </div>
        ) : (
          <form className={styles.form} onSubmit={submitManual}>
            <label className={styles.field}>
              {t.latitude}
              <input inputMode="decimal" placeholder={t.latitudePlaceholder} value={lat} onChange={(e) => setLat(e.target.value)} />
            </label>
            <label className={styles.field}>
              {t.longitude}
              <input inputMode="decimal" placeholder={t.longitudePlaceholder} value={lon} onChange={(e) => setLon(e.target.value)} />
            </label>
            {formError && <p className={styles.errorMsg}>{formError}</p>}
            <div className={styles.actions}>
              <button type="submit" className={styles.primary}>{t.useThisPosition}</button>
              {!error && (
                <button type="button" className={styles.secondary} onClick={() => setShowManual(false)}>
                  {t.back}
                </button>
              )}
            </div>
          </form>
        )}

        <a className={styles.privacyLink} href="/personvern.html">{t.privacy}</a>
      </div>
    </div>
  );
}
