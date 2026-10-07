import { registerRootComponent } from 'expo';
import React from 'react';
import { StyleSheet, StatusBar, Platform, View, Linking } from 'react-native';
import { WebView } from 'react-native-webview';

// Local Vite preview server URL
// For Android emulator, 10.0.2.2 routes directly to host PC; 172.20.10.3 is LAN IP for physical devices
const PRIMARY_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5173/?app=user' : 'http://172.20.10.3:5173/?app=user';
const FALLBACK_URL = 'http://172.20.10.3:5173/?app=user';

function MobileExpoApp() {
  const [currentUri, setCurrentUri] = React.useState(PRIMARY_URL);

  if (Platform.OS === 'web') {
    // Dynamic import for Web platform
    const App = require('./src/App.jsx').default;
    return <App />;
  }

  const handleOpenUpiUrl = (url) => {
    if (!url) return;
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        // Fallback open via system intent
        Linking.openURL(url).catch(err => {
          console.log('UPI app not installed or cannot open scheme:', err);
        });
      }
    }).catch(err => {
      Linking.openURL(url).catch(() => {});
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />
      <WebView
        source={{ uri: currentUri }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        allowsBackForwardNavigationGestures={true}
        originWhitelist={['*']}
        onShouldStartLoadWithRequest={(request) => {
          const { url } = request;
          const isUpiScheme =
            url.startsWith('upi:') ||
            url.startsWith('phonepe:') ||
            url.startsWith('tez:') ||
            url.startsWith('paytmmp:') ||
            url.startsWith('bhim:') ||
            url.startsWith('credpay:') ||
            url.startsWith('cred:') ||
            url.startsWith('navi:') ||
            url.startsWith('amazonpay:') ||
            url.startsWith('amzn:') ||
            url.startsWith('whatsapp:') ||
            url.startsWith('tataneu:') ||
            url.startsWith('mobikwik:') ||
            url.startsWith('myairtel:') ||
            url.startsWith('freecharge:') ||
            url.startsWith('yono:') ||
            url.startsWith('imobile:') ||
            url.startsWith('intent:');

          if (isUpiScheme) {
            handleOpenUpiUrl(url);
            return false;
          }
          return true;
        }}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data?.type === 'OPEN_UPI_URL' && data.url) {
              handleOpenUpiUrl(data.url);
            }
          } catch (e) {}
        }}
        onError={() => {
          if (currentUri !== FALLBACK_URL) {
            setCurrentUri(FALLBACK_URL);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  webview: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
});

registerRootComponent(MobileExpoApp);

export default MobileExpoApp;
