import { no } from './no';
import { en } from './en';
import type { Lang, Translations } from './types';

export function detectLang(): Lang {
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith('no') || lang.startsWith('nb') || lang.startsWith('nn')) return 'no';
  return 'en';
}

const translations: Record<Lang, Translations> = { no, en };

export function useT(): Translations {
  return translations[detectLang()];
}
