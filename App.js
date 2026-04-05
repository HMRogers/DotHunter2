/**
 * DotHunter — App.js  (versionCode 9)
 *
 * FIX: Blank screen after splash.
 *
 * Root cause: the splash was dismissed as soon as the video finished, but the
 * WebView underneath hadn't finished rendering yet — leaving a blank gap.
 *
 * Fix: gate the splash fade-out on BOTH conditions:
 *   1. splashTimerDone  — video finished (or 4-second fallback fired)
 *   2. webViewReady     — WebView fired onLoadEnd
 *
 * A useEffect watches both values and starts the fade-out only when both are true.
 * onError / onHttpError on the WebView also set webViewReady=true as a fallback
 * so the app never gets stuck on a load failure.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Video, ResizeMode } from 'expo-av';

// Inlined game HTML — bundled by Metro as a plain JS string.
// No async filesystem I/O; available synchronously on first render.
import GAME_HTML_STRING from './gameHtml';

// ─── Constants ────────────────────────────────────────────────────────────────
const BG_COLOR            = '#0a0a1a';
const ACCENT              = '#00E5FF';
const ACCENT_DIM          = '#00E5FF33';
const FADE_OUT_MS         = 500;
const FALLBACK_TIMEOUT_MS = 4000;   // max wait for video before marking splashTimerDone

const WEBVIEW_BASE_URL = Platform.OS === 'android'
  ? 'file:///android_asset/'
  : '';

// ─── SplashScreen ─────────────────────────────────────────────────────────────
/**
 * Props:
 *   onTimerDone  — called when the video ends (or fallback fires).
 *                  Does NOT trigger the visual fade-out; that is controlled
 *                  by the parent via the `shouldFadeOut` prop.
 *   shouldFadeOut — when true, start the exit animation.
 *   onFadeOutComplete — called after the exit animation finishes.
 */
function SplashScreen({ onTimerDone, shouldFadeOut, onFadeOutComplete }) {
  const screenOpacity = React.useRef(new Animated.Value(1)).current;
  const titleOpacity  = React.useRef(new Animated.Value(0)).current;
  const titleScale    = React.useRef(new Animated.Value(0.9)).current;
  const timerFired    = React.useRef(false);
  const fadeStarted   = React.useRef(false);

  // Fade title in on mount
  React.useEffect(() => {
    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(titleScale, {
          toValue: 1,
          friction: 6,
          tension: 60,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  // 4-second fallback — mark timer done even if video never plays
  React.useEffect(() => {
    const t = setTimeout(() => {
      if (!timerFired.current) {
        timerFired.current = true;
        onTimerDone();
      }
    }, FALLBACK_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [onTimerDone]);

  // Watch shouldFadeOut — when parent sets it true, start the exit animation
  React.useEffect(() => {
    if (shouldFadeOut && !fadeStarted.current) {
      fadeStarted.current = true;
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: FADE_OUT_MS,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(() => onFadeOutComplete());
    }
  }, [shouldFadeOut, screenOpacity, onFadeOutComplete]);

  const handlePlaybackStatus = React.useCallback((status) => {
    if (status.didJustFinish && !timerFired.current) {
      timerFired.current = true;
      onTimerDone();
    }
  }, [onTimerDone]);

  const handleVideoError = React.useCallback(() => {
    if (!timerFired.current) {
      timerFired.current = true;
      onTimerDone();
    }
  }, [onTimerDone]);

  return (
    <Animated.View style={[styles.splashContainer, { opacity: screenOpacity }]}>
      <StatusBar barStyle="light-content" backgroundColor={BG_COLOR} hidden />

      {/* VIDEO_PLACEHOLDER — video asset is at assets/splash.mp4 */}
      <Video
        source={require('./assets/splash.mp4')}
        style={StyleSheet.absoluteFill}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping={false}
        isMuted={false}
        onPlaybackStatusUpdate={handlePlaybackStatus}
        onError={handleVideoError}
      />

      {/* "DOT HUNTER" text overlay on top of the video */}
      <Animated.View
        style={[
          styles.titleOverlay,
          { opacity: titleOpacity, transform: [{ scale: titleScale }] },
        ]}
        pointerEvents="none"
      >
        <View style={styles.glowRing} />
        <View style={styles.dotIcon} />
        <View style={styles.titleTextGroup}>
          <Text style={styles.titleDot}>●</Text>
          <Text style={styles.titleMain}>DOT HUNTER</Text>
          <Text style={styles.titleSub}>focus · reflex · speed</Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

// ─── Root App Component ───────────────────────────────────────────────────────
export default function App() {
  // splashTimerDone: video finished (or fallback fired)
  const [splashTimerDone, setSplashTimerDone] = React.useState(false);
  // webViewReady: WebView fired onLoadEnd (or onError as fallback)
  const [webViewReady, setWebViewReady]       = React.useState(false);
  // shouldFadeOut: both conditions met — tell SplashScreen to animate out
  const [shouldFadeOut, setShouldFadeOut]     = React.useState(false);
  // splashVisible: controls whether SplashScreen is in the tree at all
  const [splashVisible, setSplashVisible]     = React.useState(true);

  // Gate: only start the fade-out when BOTH conditions are satisfied
  React.useEffect(() => {
    if (splashTimerDone && webViewReady && !shouldFadeOut) {
      setShouldFadeOut(true);
    }
  }, [splashTimerDone, webViewReady, shouldFadeOut]);

  const handleWebViewLoad = React.useCallback(() => {
    console.log('[DotHunter] WebView onLoadEnd — game ready');
    setWebViewReady(true);
  }, []);

  const handleWebViewError = React.useCallback((syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.warn('[DotHunter] WebView onError:', nativeEvent);
    // Still mark ready so the app doesn't get stuck
    setWebViewReady(true);
  }, []);

  const handleWebViewHttpError = React.useCallback((syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.warn('[DotHunter] WebView onHttpError:', nativeEvent.statusCode, nativeEvent.url);
    setWebViewReady(true);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BG_COLOR} />

      {/*
       * WebView — ALWAYS mounted from the very first render, loading in the
       * background while the splash is visible. Never conditionally rendered.
       *
       * onLoadEnd fires when the HTML has been parsed and the initial render
       * is complete, which sets webViewReady=true and unblocks the splash exit.
       */}
      <WebView
        originWhitelist={['*']}
        source={{ html: GAME_HTML_STRING, baseUrl: WEBVIEW_BASE_URL }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        mixedContentMode="always"
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        setBuiltInZoomControls={false}
        setDisplayZoomControls={false}
        scalesPageToFit={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        cacheEnabled={true}
        textZoom={100}
        onLoadEnd={handleWebViewLoad}
        onError={handleWebViewError}
        onHttpError={handleWebViewHttpError}
      />

      {/* Splash overlay — removed from tree only after fade-out completes */}
      {splashVisible && (
        <SplashScreen
          onTimerDone={() => setSplashTimerDone(true)}
          shouldFadeOut={shouldFadeOut}
          onFadeOutComplete={() => setSplashVisible(false)}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  webview: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  splashContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BG_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  titleOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  glowRing: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: ACCENT_DIM,
    marginTop: -30,
  },
  dotIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: ACCENT,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 20,
    elevation: 12,
  },
  titleTextGroup: {
    alignItems: 'center',
    marginTop: 24,
  },
  titleDot: {
    fontSize: 18,
    color: ACCENT,
    marginBottom: 6,
    textShadowColor: ACCENT,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  titleMain: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 6,
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  titleSub: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 4,
    color: '#FFFFFFAA',
    textAlign: 'center',
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
