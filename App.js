/**
 * DotHunter — App.js  (versionCode 10)
 *
 * Clean build: WebView loads the game HTML directly on launch.
 * No splash screen, no video, no animations.
 *
 * The game HTML is inlined as a plain JS string in gameHtml.js and bundled
 * by Metro — no async filesystem I/O, no blank screen on any Android version.
 */

import React from 'react';
import { View, StyleSheet, StatusBar, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

// Full game HTML inlined as a JS string by Metro bundler.
// Generated from the React build output — do not edit manually.
import GAME_HTML_STRING from './gameHtml';

// Android WebView base URL for correct relative-path resolution
const WEBVIEW_BASE_URL = Platform.OS === 'android'
  ? 'file:///android_asset/'
  : '';

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a1a" hidden />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
});
