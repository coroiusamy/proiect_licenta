import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import axios, { isAxiosError } from 'axios';
import Toast from 'react-native-toast-message';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function AdaugaScreen() {
  const { token } = useAuth();
  const [isUploading, setIsUploading] = useState(false);

  // Funcție comună pentru upload
  const processUpload = async (file: {
    uri: string;
    name: string;
    type: string;
  }) => {
    setIsUploading(true);
    const formData = new FormData();

    formData.append('analysisFile', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);

    try {
      const response = await axios.post(
        `${API_URL}/api/analyses/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const resultCount = response.data?.count || 0;
      Toast.show({
        type: 'success',
        text1: 'Succes!',
        text2: `Au fost importate ${resultCount} rezultate.`,
        visibilityTime: 4000,
      });
      router.replace('/(tabs)/istoric');
    } catch (error) {
      let message = 'Încărcarea a eșuat.';
      if (isAxiosError(error)) {
        message =
          error.response?.data?.message || 'Eroare la procesarea fișierului.';
      }
      Toast.show({ type: 'error', text1: 'Eroare Upload', text2: message });
    } finally {
      setIsUploading(false);
    }
  };

  const handlePdfUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets[0]) return;

      const file = result.assets[0];
      await processUpload({
        uri: file.uri,
        name: file.name || 'analize.pdf',
        type: file.mimeType || 'application/pdf',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Eroare',
        text2: 'Nu s-a putut selecta fișierul.',
      });
    }
  };

  const handleImageUpload = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Toast.show({
        type: 'error',
        text1: 'Permisiune necesară',
        text2: 'Este necesară permisiunea pentru a accesa galeria.',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    const file = result.assets[0];
    await processUpload({
      uri: file.uri,
      name: file.fileName || 'scan.jpg',
      type: file.mimeType || 'image/jpeg',
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>
          Adaugă Analize
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Alege cum dorești să introduci rezultatele analizelor tale.
        </ThemedText>

        {isUploading ? (
          <ThemedView style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <ThemedText style={styles.loadingText}>
              Se procesează fișierul...
            </ThemedText>
            <ThemedText style={styles.loadingSubText}>
              Acest proces poate dura până la un minut.
            </ThemedText>
          </ThemedView>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.uploadButton]}
              onPress={handlePdfUpload}
            >
              <ThemedText style={styles.buttonTitle}>📄 Încarcă PDF</ThemedText>
              <ThemedText style={styles.buttonDescription}>
                Importă automat dintr-un buletin de analize digital.
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.scanButton]}
              onPress={handleImageUpload}
            >
              <ThemedText style={styles.buttonTitle}>
                📷 Alege o Poză
              </ThemedText>
              <ThemedText style={styles.buttonDescription}>
                Alege o poză clară a buletinului tău de analize.
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.manualButton]}
              onPress={() => router.push('/add-analysis')}
            >
              <ThemedText style={styles.buttonTitle}>
                ✍️ Adaugă Manual
              </ThemedText>
              <ThemedText style={styles.buttonDescription}>
                Introdu rezultatele unul câte unul.
              </ThemedText>
            </TouchableOpacity>
          </>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: 'gray',
    textAlign: 'center',
    marginBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loadingSubText: {
    marginTop: 10,
    color: 'gray',
    textAlign: 'center',
  },
  actionButton: {
    width: '100%',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  uploadButton: { backgroundColor: '#34C759' },
  scanButton: { backgroundColor: '#5856D6' },
  manualButton: { backgroundColor: '#007AFF' },
  buttonTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  buttonDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
});
