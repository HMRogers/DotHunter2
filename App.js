import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';

const GAME_HTML = require('./assets/web/game.html');

export default function App() {
  const [htmlContent, setHtmlContent] = React.useState(null);

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

  if (!htmlContent) {
    return (
      <View style={[styles.container, styles.loading]}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0a1a" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a1a" translucent={false} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
});
