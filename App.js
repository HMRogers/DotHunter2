/**
 * DotHunter — App.js
 *
 * Splash screen: plays assets/splash.mp4 fullscreen with "DOT HUNTER" text
 * overlay. When the video finishes (or after a 4-second fallback timeout),
 * the splash fades out and reveals the game WebView.
 *
 * WebView loads game HTML from gameHtml.js (inlined JS string — no async
 * filesystem I/O, fixes blank screen on all Android versions).
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

// Inlined game HTML bundled by Metro (no runtime filesystem access)
import GAME_HTML_STRING from './gameHtml';

// ─── Constants ────────────────────────────────────────────────────────────────
const BG_COLOR            = '#0a0a1a';   // Game's dark background
const ACCENT              = '#00E5FF';   // Neon cyan accent
const ACCENT_DIM          = '#00E5FF33'; // Translucent glow
const FADE_OUT_MS         = 500;         // Splash to game fade duration
const FALLBACK_TIMEOUT_MS = 4000;        // Max wait if video fails to load/play

// Android WebView base URL for correct relative-path resolution
const WEBVIEW_BASE_URL = Platform.OS === 'android'
  ? 'file:///android_asset/'
  : '';

// ─── SplashScreen Component ───────────────────────────────────────────────────
function SplashScreen({ onFinished }) {
  const screenOpacity = React.useRef(new Animated.Value(1)).current;
  const titleOpacity  = React.useRef(new Animated.Value(0)).current;
  const titleScale    = React.useRef(new Animated.Value(0.9)).current;
  const hasFinished   = React.useRef(false);

  // Fade the title text in once the component mounts
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

  // Trigger the fade-out transition (called once, guarded by ref)
  const triggerExit = React.useCallback(() => {
    if (hasFinished.current) return;
    hasFinished.current = true;

    Animated.timing(screenOpacity, {
      toValue: 0,
      duration: FADE_OUT_MS,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => onFinished());
  }, [onFinished, screenOpacity]);

  // 4-second fallback: exit even if video never loads or errors
  React.useEffect(() => {
    const timer = setTimeout(triggerExit, FALLBACK_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [triggerExit]);

  // Called by expo-av on every playback status update
  const handlePlaybackStatus = React.useCallback((status) => {
    if (status.didJustFinish) {
      triggerExit();
    }
  }, [triggerExit]);

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
        onError={triggerExit}
      />

      {/* "DOT HUNTER" text overlay on top of the video */}
      <Animated.View
        style={[
          styles.titleOverlay,
          { opacity: titleOpacity, transform: [{ scale: titleScale }] },
        ]}
        pointerEvents="none"
      >
        {/* Soft glow ring */}
        <View style={styles.glowRing} />

        {/* Neon dot */}
        <View style={styles.dotIcon} />

        {/* Title text */}
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
  const [splashDone, setSplashDone] = React.useState(false);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BG_COLOR} />

      {/*
       * Game WebView — always mounted immediately.
       * GAME_HTML_STRING is a plain JS string bundled by Metro, so it is
       * available synchronously on first render — no blank screen, ever.
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
      />

      {/* Splash overlay — sits on top until video finishes or fallback fires */}
      {!splashDone && (
        <SplashScreen onFinished={() => setSplashDone(true)} />
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

  // Splash: absolute overlay covering the entire screen
  splashContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BG_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },

  // Text + icon group centered over the video
  titleOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  // Ambient glow ring behind the dot
  glowRing: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: ACCENT_DIM,
    marginTop: -30,
  },

  // Neon dot icon
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

  // Wrapper for title text below the dot
  titleTextGroup: {
    alignItems: 'center',
    marginTop: 24,
  },

  // Small decorative dot above the title text
  titleDot: {
    fontSize: 18,
    color: ACCENT,
    marginBottom: 6,
    textShadowColor: ACCENT,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },

  // Main game title
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

  // Subtitle tagline
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
