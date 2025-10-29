import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import axios, { isAxiosError } from 'axios';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function AdaugaScreen() {
  const { token } = useAuth();
  const [isUploading, setIsUploading] = useState(false);

  // --- Funcția pentru Upload PDF (mutată din Home) ---
  const handlePdfUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      const file = result.assets[0];
      if (!file) {
        Toast.show({
          type: 'error',
          text1: 'Eroare',
          text2: 'Nu s-a putut selecta fișierul.',
        });
        return;
      }

      setIsUploading(true);
      const formData = new FormData();
      // @ts-ignore: React Native FormData expects specific shape
      formData.append('analysisFile', {
        uri: file.uri,
        name: file.name || 'analize.pdf',
        type: file.mimeType || 'application/pdf',
      });

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

      // Succes! Afișăm un sumar.
      const resultCount = Array.isArray(response.data)
        ? response.data.length
        : 0;
      Toast.show({
        type: 'success',
        text1: 'Succes!',
        // Dacă backend-ul returnează array-ul direct, arătăm câte a găsit
        text2: `Au fost importate ${resultCount} rezultate.`,
        visibilityTime: 4000, // Ținem mesajul mai mult
      });

      // Opțional: Navigăm automat la ecranul Istoric pentru a vedea rezultatele
      router.replace('/(tabs)/istoric');
    } catch (error) {
      let message = 'Încărcarea a eșuat.';
      if (isAxiosError(error)) {
        message =
          error.response?.data?.message || 'Eroare la procesarea PDF-ului.';
      }
      Toast.show({ type: 'error', text1: 'Eroare Upload', text2: message });
    } finally {
      setIsUploading(false);
    }
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
              Se procesează PDF-ul...
            </ThemedText>
            <ThemedText style={styles.loadingSubText}>
              Acest proces poate dura câteva secunde.
            </ThemedText>
          </ThemedView>
        ) : (
          <>
            {/* Buton 1: Upload PDF */}
            <TouchableOpacity
              style={[styles.actionButton, styles.uploadButton]}
              onPress={handlePdfUpload}
            >
              {/* Aici am putea pune o iconiță mare */}
              <ThemedText style={styles.buttonTitle}>📄 Încarcă PDF</ThemedText>
              <ThemedText style={styles.buttonDescription}>
                Importă automat rezultatele dintr-un buletin de analize digital.
              </ThemedText>
            </TouchableOpacity>

            {/* Buton 2: Scanare Poză (Placeholder pentru viitor) */}
            <TouchableOpacity
              style={[styles.actionButton, styles.scanButton]}
              onPress={() =>
                Toast.show({
                  type: 'info',
                  text1: 'În curând',
                  text2: 'Funcția de scanare OCR va fi disponibilă curând.',
                })
              }
            >
              <ThemedText style={styles.buttonTitle}>
                📷 Scanează Poză
              </ThemedText>
              <ThemedText style={styles.buttonDescription}>
                Fă o poză buletinului tău de analize tipărit.
              </ThemedText>
            </TouchableOpacity>

            {/* Buton 3: Adăugare Manuală */}
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
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingSubText: {
    marginTop: 10,
    color: 'gray',
  },
  // Stiluri comune pentru butoanele mari de acțiune
  actionButton: {
    width: '100%',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    // Umbră subtilă
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  uploadButton: { backgroundColor: '#34C759' }, // Verde
  scanButton: { backgroundColor: '#5856D6' }, // Mov/Albastru închis
  manualButton: { backgroundColor: '#007AFF' }, // Albastru

  buttonTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  buttonDescription: {
    color: 'rgba(255, 255, 255, 0.8)', // Alb ușor transparent
    fontSize: 14,
  },
});
