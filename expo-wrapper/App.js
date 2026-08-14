import React from 'react';
import { StyleSheet, SafeAreaView, StatusBar, Platform, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export default function App() {
  // Production Web App URL deployed on Vercel
  const PRODUCTION_URL = 'https://rvseco.vercel.app';
  const LOCAL_URL = 'http://192.168.0.114:5173';
  const targetUrl = PRODUCTION_URL; 

  const handleMessage = async (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === 'DOWNLOAD_FILE') {
        const { filename, content, mimeType } = message;

        // Ensure temporary folder exists
        const fileUri = FileSystem.cacheDirectory + filename;
        
        // Write file contents to local cache
        await FileSystem.writeAsStringAsync(fileUri, content, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        // Open sharing dialog to save file or share via WhatsApp/Email/Drive
        const isSharingAvailable = await Sharing.isAvailableAsync();
        if (isSharingAvailable) {
          await Sharing.shareAsync(fileUri, {
            mimeType: mimeType || 'text/csv',
            dialogTitle: `Save ${filename}`,
          });
        } else {
          Alert.alert('Download Error', 'Sharing and saving files is not supported on this device.');
        }
      }
    } catch (error) {
      console.error('Error handling WebView message:', error);
      Alert.alert('Download Failed', 'Could not export the file.');
    }
  };

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
        onMessage={handleMessage}
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
