import React from 'react';
import { StyleSheet, SafeAreaView, StatusBar, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

export default function App() {
  // Production Web App URL deployed on Vercel
  const PRODUCTION_URL = 'https://rvseco.vercel.app';
  const LOCAL_URL = 'http://192.168.1.28:5177/';

  // Uses production Vercel web application
  const targetUrl = PRODUCTION_URL; 

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0c5c37" />
      <WebView 
        source={{ uri: targetUrl }} 
        style={{ flex: 1 }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        allowFileAccess={true}
        originWhitelist={['*']}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c5c37',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
});
