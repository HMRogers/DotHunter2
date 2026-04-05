import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';

// ─── Constants ───────────────────────────────────────────────────────────────
const BG_COLOR   = '#0a0a1a';   // Game's dark background
const ACCENT     = '#00E5FF';   // Game's primary neon accent (cyan)
const ACCENT_DIM = '#00E5FF33'; // Translucent glow layer
const SPLASH_DURATION_MS = 2500; // How long the splash is fully visible
const FADE_IN_MS         = 600;  // Entrance animation duration
const FADE_OUT_MS        = 400;  // Exit animation duration

const GAME_HTML = require('./assets/web/game.html');

// ─── SplashScreen Component ───────────────────────────────────────────────────
function SplashScreen({ onFinished }) {
  // Animated values for entrance (fade + scale)
  const titleOpacity = React.useRef(new Animated.Value(0)).current;
  const titleScale   = React.useRef(new Animated.Value(0.88)).current;
  const dotOpacity   = React.useRef(new Animated.Value(0)).current;
  const dotScale     = React.useRef(new Animated.Value(0.6)).current;

  // Animated value for the whole-screen fade-out
  const screenOpacity = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    // ── Step 1: Animate the dot indicator in first ──
    Animated.parallel([
      Animated.timing(dotOpacity, {
        toValue: 1,
        duration: FADE_IN_MS * 0.6,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(dotScale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();

    // ── Step 2: Animate the title in with a slight delay ──
    Animated.sequence([
      Animated.delay(180),
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: FADE_IN_MS,
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

    // ── Step 3: After splash duration, fade the whole screen out ──
    const exitTimer = setTimeout(() => {
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: FADE_OUT_MS,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        onFinished();
      });
    }, SPLASH_DURATION_MS);

    return () => clearTimeout(exitTimer);
  }, []);

  return (
    <Animated.View style={[styles.splashContainer, { opacity: screenOpacity }]}>
      <StatusBar barStyle="light-content" backgroundColor={BG_COLOR} />

      {/* Ambient glow behind the dot */}
      <Animated.View
        style={[
          styles.glowRing,
          {
            opacity: dotOpacity,
            transform: [{ scale: dotScale }],
          },
        ]}
      />

      {/* Animated dot icon */}
      <Animated.View
        style={[
          styles.dotIcon,
          {
            opacity: dotOpacity,
            transform: [{ scale: dotScale }],
          },
        ]}
      />

      {/* ── VIDEO_PLACEHOLDER — drop video asset here ──────────────────────────
       *
       *  To add an intro video, replace this comment block with:
       *
       *    import { Video, ResizeMode } from 'expo-av';
       *
       *    <Video
       *      source={require('./assets/intro.mp4')}
       *      style={styles.splashVideo}
       *      resizeMode={ResizeMode.COVER}
       *      shouldPlay
       *      isLooping={false}
       *      isMuted={false}
       *      onPlaybackStatusUpdate={(status) => {
       *        if (status.didJustFinish) onFinished();
       *      }}
       *    />
       *
       *  Also install: npx expo install expo-av
       *  And remove the setTimeout-based exit in the useEffect above.
       *
       * ─────────────────────────────────────────────────────────────────────── */}

      {/* Game title */}
      <Animated.View
        style={{
          opacity: titleOpacity,
          transform: [{ scale: titleScale }],
          alignItems: 'center',
          marginTop: 28,
        }}
      >
        <Text style={styles.titleDot}>●</Text>
        <Text style={styles.titleMain}>DOT HUNTER</Text>
        <Text style={styles.titleSub}>focus · reflex · speed</Text>
      </Animated.View>
    </Animated.View>
  );
}

// ─── Root App Component ───────────────────────────────────────────────────────
export default function App() {
  const [htmlContent, setHtmlContent]   = React.useState(null);
  const [splashDone, setSplashDone]     = React.useState(false);

  // Load the game HTML from the bundled asset
  React.useEffect(() => {
    async function loadHtml() {
      try {
        const asset = Asset.fromModule(GAME_HTML);
        await asset.downloadAsync();
        const content = await FileSystem.readAsStringAsync(asset.localUri);
        setHtmlContent(content);
      } catch (e) {
        console.error('Failed to load game HTML:', e);
      }
    }
    loadHtml();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BG_COLOR} />

      {/* ── Game WebView (always mounted so it loads in the background) ── */}
      {htmlContent ? (
        <WebView
          originWhitelist={['*']}
          source={{ html: htmlContent, baseUrl: '' }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
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
          mixedContentMode="compatibility"
          allowFileAccess={true}
          textZoom={100}
        />
      ) : (
        // Dark placeholder while the HTML asset is being read
        <View style={[styles.webview, { backgroundColor: BG_COLOR }]} />
      )}

      {/* ── Splash overlay (rendered on top, removed after animation) ── */}
      {!splashDone && (
        <SplashScreen onFinished={() => setSplashDone(true)} />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Root container
  container: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },

  // WebView fills the whole screen
  webview: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },

  // Splash screen — absolute overlay covering the entire screen
  splashContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BG_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },

  // Soft ambient glow ring behind the dot
  glowRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: ACCENT_DIM,
    // Offset slightly upward to sit behind the dot
    marginTop: -20,
  },

  // The neon dot icon
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

  // Decorative dot above the title
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
  },

  // Subtitle tagline
  titleSub: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 4,
    color: '#FFFFFF55',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});
