import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'no.meloyvaer.app',
  appName: 'Meloyvaer',
  webDir: 'dist',
  android: {
    // Custom User-Agent so api.met.no can identify the app
    overrideUserAgent: 'MeloyvaerApp/1.0 https://github.com/meloyvaer/app',
  },
};

export default config;
