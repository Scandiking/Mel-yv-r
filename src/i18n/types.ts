export type Lang = 'no' | 'en';

export interface Translations {
  lang: Lang;
  dateLocale: string;

  findingPosition: string;
  loadingForecast: string;
  weatherLoadError: string;

  locationTitle: string;
  locationBody: string;
  locationBrowserRejected: (err: string) => string;
  locationNotSupported: string;
  allowLocation: string;
  enterManually: string;
  latitude: string;
  latitudePlaceholder: string;
  longitude: string;
  longitudePlaceholder: string;
  invalidCoords: string;
  useThisPosition: string;
  back: string;
  privacy: string;
  changeLocation: string;

  coordsSuffix: string;

  offline: string;
  humidity: string;
  precipitation: string;
  windFrom: (dir: string) => string;

  cardinals: [string, string, string, string, string, string, string, string];
  compassLabels: Record<number, string>;

  loadingAriaLabel: string;

  next24h: string;
  hourlyForecast: string;
  swipeHint: string;
  forecast7day: string;
  today: string;

  tempLegend: string;
  rainLegend: string;
  windLegend: string;
  tidesLegend: (location: string) => string;
  tempTooltip: string;
  rainTooltip: string;
  waterLevelTooltip: string;

  weather: Record<string, string>;
  weatherFallback: string;
}
