import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { detectLang } from './i18n/useT.ts'

const lang = detectLang();
document.documentElement.lang = lang === 'no' ? 'no' : 'en';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
