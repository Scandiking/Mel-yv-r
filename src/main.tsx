import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { detectLang } from './i18n/useT.ts'
import { Capacitor } from '@capacitor/core'
import { registerSW } from 'virtual:pwa-register'

// The offline cache (service worker) is for the website only. Inside the
// Android app it kept serving the old bundle after updates, so remove any
// left over from earlier versions and reload once onto the bundled files.
if (Capacitor.isNativePlatform()) {
  if ('serviceWorker' in navigator) {
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.getRegistrations().then(async (regs) => {
      await Promise.all(regs.map((r) => r.unregister()));
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if (hadController) location.reload();
    });
  }
} else {
  registerSW({ immediate: true });
}

const lang = detectLang();
document.documentElement.lang = lang === 'no' ? 'no' : 'en';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
