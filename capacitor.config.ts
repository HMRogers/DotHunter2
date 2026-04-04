import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dothunter.app',
  appName: 'Dot Hunter',
  webDir: 'build',
  server: {
    androidScheme: 'https'
  },
  android: {
    backgroundColor: '#0a0a1a',
    allowMixedContent: false,
    overScrollMode: 'never',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1500,
      backgroundColor: '#0a0a1a',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0a1a',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'none',
    }
  }
};

export default config;
