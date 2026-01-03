import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import Toast from 'react-native-toast-message';

import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function AdaugaScreen() {
  const { token } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [fileType, setFileType] = useState<'pdf' | 'image' | null>(null);

  const containerBg = isDark ? '#000000' : '#F8F9FA';
  const textColor = isDark ? '#FFFFFF' : '#000000';

  const pickPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setSelectedFile(file);
        setFileType('pdf');
        Toast.show({
          type: 'success',
          text1: 'PDF selectat',
          text2: file.name,
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Eroare',
        text2: 'Nu s-a putut selecta fișierul.',
      });
    }
  };

  const pickImage = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Toast.show({
          type: 'error',
          text1: 'Permisiune necesară',
          text2: 'Acordă permisiunea pentru cameră.',
        });
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const image = result.assets[0];
        setSelectedFile(image);
        setFileType('image');
        Toast.show({
          type: 'success',
          text1: 'Imagine capturată',
          text2: 'Gata de încărcare',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Eroare',
        text2: 'Nu s-a putut captura imaginea.',
      });
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) {
      Toast.show({
        type: 'error',
        text1: 'Eroare',
        text2: 'Selectează un fișier mai întâi.',
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();

      const fileToUpload: any = {
        uri: selectedFile.uri,
        type: fileType === 'pdf' ? 'application/pdf' : 'image/jpeg',
        name:
          selectedFile.name ||
          `analysis_${Date.now()}.${fileType === 'pdf' ? 'pdf' : 'jpg'}`,
      };

      formData.append('analysisFile', fileToUpload);

      const response = await axios.post(
        `${API_URL}/api/analyses/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
          timeout: 60000,
        }
      );

      Toast.show({
        type: 'success',
        text1: 'Succes!',
        text2: `${response.data.count} analize adăugate`,
      });

      setSelectedFile(null);
      setFileType(null);

      setTimeout(() => {
        router.push('/istoric');
      }, 1500);
    } catch (error: any) {
      console.error('Upload error:', error);
      Toast.show({
        type: 'error',
        text1: 'Eroare',
        text2:
          error.response?.data?.message || 'Nu s-a putut încărca fișierul.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: containerBg }]}
      edges={['top']}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: containerBg }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: textColor }]}>
            Adaugă Analize
          </Text>
          <Text style={[styles.headerSubtitle, { color: textColor }]}>
            Extrage automat datele din PDF sau poze
          </Text>
        </View>

        {/* UPLOAD CARD */}
        <View
          style={[
            styles.uploadCard,
            { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
          ]}
        >
          <View
            style={[
              styles.uploadIcon,
              { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' },
            ]}
          >
            <MaterialIcons name="cloud-upload" size={64} color="#007AFF" />
          </View>

          {selectedFile ? (
            <View style={styles.fileInfo}>
              {fileType === 'image' ? (
                <View style={styles.imagePreview}>
                  <Image
                    source={{ uri: selectedFile.uri }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                </View>
              ) : (
                <View style={styles.fileIconContainer}>
                  <MaterialIcons
                    name="picture-as-pdf"
                    size={40}
                    color="#FF3B30"
                  />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.fileName, { color: textColor }]}>
                  {selectedFile.name ||
                    `Imagine ${new Date().toLocaleDateString()}`}
                </Text>
                {selectedFile.size && (
                  <Text style={styles.fileSize}>
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => {
                  setSelectedFile(null);
                  setFileType(null);
                }}
                style={styles.removeButton}
              >
                <MaterialIcons name="close" size={24} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={[styles.uploadTitle, { color: textColor }]}>
                Selectează modul de încărcare
              </Text>
              <Text style={[styles.uploadText, { color: textColor }]}>
                Încarcă rezultatele analizelor tale în format PDF sau
                scanează-le cu camera
              </Text>
            </>
          )}

          {!selectedFile ? (
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[styles.selectButton, { backgroundColor: '#007AFF' }]}
                onPress={pickPDF}
                activeOpacity={0.8}
              >
                <MaterialIcons name="folder-open" size={24} color="#FFFFFF" />
                <Text style={styles.selectButtonText}>Selectează PDF</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.selectButton, { backgroundColor: '#34C759' }]}
                onPress={pickImage}
                activeOpacity={0.8}
              >
                <MaterialIcons name="camera-alt" size={24} color="#FFFFFF" />
                <Text style={styles.selectButtonText}>Scanează Imagine</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.uploadButton, { backgroundColor: '#FF9500' }]}
              onPress={uploadFile}
              disabled={isUploading}
              activeOpacity={0.8}
            >
              {isUploading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons name="upload" size={24} color="#FFFFFF" />
                  <Text style={styles.uploadButtonText}>
                    Încarcă și Procesează
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* INSTRUCTIONS */}
        <View style={styles.instructionsSection}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            Cum funcționează?
          </Text>

          <View
            style={[
              styles.instructionCard,
              { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
            ]}
          >
            <View style={[styles.stepBadge, { backgroundColor: '#007AFF20' }]}>
              <Text style={styles.stepNumber}>1</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.instructionTitle, { color: textColor }]}>
                Selectează metoda
              </Text>
              <Text style={[styles.instructionText, { color: textColor }]}>
                Alege între PDF sau scanare cu camera
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.instructionCard,
              { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
            ]}
          >
            <View style={[styles.stepBadge, { backgroundColor: '#34C75920' }]}>
              <Text style={styles.stepNumber}>2</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.instructionTitle, { color: textColor }]}>
                Verifică fișierul
              </Text>
              <Text style={[styles.instructionText, { color: textColor }]}>
                Asigură-te că datele sunt vizibile și clare
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.instructionCard,
              { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
            ]}
          >
            <View style={[styles.stepBadge, { backgroundColor: '#FF950020' }]}>
              <Text style={styles.stepNumber}>3</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.instructionTitle, { color: textColor }]}>
                Încarcă și procesează
              </Text>
              <Text style={[styles.instructionText, { color: textColor }]}>
                Sistemul va extrage automat datele din fișier
              </Text>
            </View>
          </View>
        </View>

        {/* INFO CARDS */}
        <View style={styles.infoSection}>
          <View
            style={[
              styles.infoCard,
              { backgroundColor: isDark ? '#1C1C1E' : '#E3F2FD' },
            ]}
          >
            <View style={styles.infoCardIcon}>
              <MaterialIcons name="check-circle" size={24} color="#34C759" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoCardTitle, { color: textColor }]}>
                Formate acceptate
              </Text>
              <Text style={[styles.infoCardText, { color: textColor }]}>
                PDF cu rezultate structurate sau imagini clare ale buletinelor
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.infoCard,
              { backgroundColor: isDark ? '#1C1C1E' : '#FFF3E0' },
            ]}
          >
            <View style={styles.infoCardIcon}>
              <MaterialIcons
                name="tips-and-updates"
                size={24}
                color="#FF9500"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoCardTitle, { color: textColor }]}>
                Sfat pentru poze
              </Text>
              <Text style={[styles.infoCardText, { color: textColor }]}>
                Asigură-te că imaginea este clară, bine luminată și textul este
                lizibil
              </Text>
            </View>
          </View>
        </View>

        {/* ALTERNATIVE */}
        <View style={styles.alternativeSection}>
          <View style={styles.divider}>
            <View
              style={[
                styles.dividerLine,
                { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' },
              ]}
            />
            <Text style={[styles.dividerText, { color: textColor }]}>sau</Text>
            <View
              style={[
                styles.dividerLine,
                { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' },
              ]}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.manualButton,
              {
                backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                borderColor: '#007AFF',
              },
            ]}
            onPress={() => router.push('/add-analysis')}
            activeOpacity={0.7}
          >
            <MaterialIcons name="edit" size={24} color="#007AFF" />
            <Text style={[styles.manualButtonText, { color: textColor }]}>
              Adaugă Manual
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  scrollContent: { paddingBottom: 30 },

  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    opacity: 0.7,
  },

  uploadCard: {
    marginHorizontal: 20,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  uploadIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  uploadText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 20,
    opacity: 0.8,
  },

  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    padding: 16,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 12,
    marginBottom: 20,
  },
  fileIconContainer: {
    marginRight: 12,
  },
  imagePreview: {
    marginRight: 12,
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 14,
    color: '#8E8E93',
  },
  removeButton: {
    padding: 8,
  },

  buttonGroup: {
    width: '100%',
    gap: 12,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  selectButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 8,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    shadowColor: '#FF9500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 8,
  },

  instructionsSection: {
    paddingHorizontal: 20,
    marginTop: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  instructionCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  stepBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  instructionText: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.7,
  },

  infoSection: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  infoCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoCardText: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.8,
  },

  alternativeSection: {
    paddingHorizontal: 20,
    marginTop: 30,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 14,
    opacity: 0.6,
  },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  manualButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
