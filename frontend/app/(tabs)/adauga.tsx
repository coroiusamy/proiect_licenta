import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  Modal,
  Pressable,
  Platform,
  InteractionManager,
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
const CAMERA_SAFE_MODE_ANDROID = Platform.OS === 'android' && __DEV__;
const MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024;
const RAW_IMAGE_ACCEPT_MAX_BYTES = 60 * 1024 * 1024;
const COMPRESS_TRIGGER_BYTES = 18 * 1024 * 1024;

const logUpload = (...args: any[]) => {
  console.log('[UploadFlow]', ...args);
};

export default function AdaugaScreen() {
  const { token } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);
  const [fileType, setFileType] = useState<'pdf' | 'image' | null>(null);
  const [isSourceSheetVisible, setIsSourceSheetVisible] = useState(false);
  const [isPickerBusy, setIsPickerBusy] = useState(false);
  const [isMounting, setIsMounting] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounting(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const pickerBusyRef = useRef(false);
  const acquirePickerLock = () => {
    if (pickerBusyRef.current) return false;
    pickerBusyRef.current = true;
    setIsPickerBusy(true);
    return true;
  };

  const releasePickerLock = () => {
    pickerBusyRef.current = false;
    setIsPickerBusy(false);
  };

  const containerBg = isDark ? '#000000' : '#F8F9FA';
  const textColor = isDark ? '#FFFFFF' : '#000000';

  const getAssetSize = (asset: any) => asset?.size || asset?.fileSize || 0;

  useEffect(() => {
    const recoverPendingPickerResult = async () => {
      if (Platform.OS !== 'android') return;

      try {
        const pendingResult = await ImagePicker.getPendingResultAsync();
        if (
          !pendingResult ||
          pendingResult.canceled ||
          !pendingResult.assets?.length
        ) {
          return;
        }

        logUpload('pickImage:pending_result_recovered', {
          assetsCount: pendingResult.assets.length,
        });

        const validAssets = pendingResult.assets.filter(
          (asset) => (asset.fileSize || 0) <= RAW_IMAGE_ACCEPT_MAX_BYTES,
        );

        if (validAssets.length === 0) return;

        setSelectedFiles((prev) => {
          const merged = [...prev, ...validAssets];
          const uniqueByUri = merged.filter(
            (item, idx, arr) =>
              arr.findIndex((x) => x.uri === item.uri) === idx,
          );
          return uniqueByUri.slice(0, 10);
        });
        setFileType('image');
      } catch (error) {
        logUpload('pickImage:pending_result_error', error);
      }
    };

    void recoverPendingPickerResult();
  }, []);

  const compressImageForUpload = async (asset: any, index: number) => {
    const sourceSize = getAssetSize(asset);

    if (sourceSize <= COMPRESS_TRIGGER_BYTES) {
      return asset;
    }

    logUpload('uploadFile:compress_start', {
      index,
      sizeMB: (sourceSize / 1024 / 1024).toFixed(2),
      width: asset?.width,
      height: asset?.height,
    });

    const manipulatorModule = await import('expo-image-manipulator').catch(
      () => null,
    );

    if (!manipulatorModule) {
      logUpload('uploadFile:compress_skip_no_module', { index });
      return asset;
    }

    const maxDim = Math.max(asset?.width || 0, asset?.height || 0);
    const actions: any[] = [];

    if (maxDim > 3600) {
      const targetWidth =
        (asset?.width || 0) >= (asset?.height || 0) ? 3600 : undefined;
      const targetHeight =
        (asset?.height || 0) > (asset?.width || 0) ? 3600 : undefined;
      actions.push({ resize: { width: targetWidth, height: targetHeight } });
    }

    const manipulated = await manipulatorModule.manipulateAsync(
      asset.uri,
      actions,
      {
        compress: sourceSize > MAX_IMAGE_SIZE_BYTES ? 0.78 : 0.88,
        format: manipulatorModule.SaveFormat.JPEG,
      },
    );

    const compressedAsset = {
      ...asset,
      uri: manipulated.uri,
      width: manipulated.width,
      height: manipulated.height,
      mimeType: 'image/jpeg',
      name: asset?.name || `analysis_${Date.now()}_${index}.jpg`,
      // Size may not be available for manipulated assets on every platform.
      size: asset?.size,
      fileSize: asset?.fileSize,
    };

    logUpload('uploadFile:compress_done', {
      index,
      width: manipulated.width,
      height: manipulated.height,
    });

    return compressedAsset;
  };

  const pickPDF = async () => {
    try {
      logUpload('pickPDF:start');
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        logUpload('pickPDF:selected', {
          name: file?.name,
          size: file?.size,
          uri: file?.uri,
        });
        setSelectedFiles([file]);
        setFileType('pdf');
        Toast.show({
          type: 'success',
          text1: 'Document pregătit 📄',
          text2: `Am selectat ${file.name} pentru analizare.`,
        });
      }
    } catch (error) {
      logUpload('pickPDF:error', error);
      Toast.show({
        type: 'error',
        text1: 'Fișier inaccesibil',
        text2: 'Nu am putut deschide documentul PDF selectat.',
      });
    }
  };

  const pickImage = async () => {
    if (!acquirePickerLock()) return;
    try {
      logUpload('pickImage:start_camera');
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      logUpload('pickImage:camera_permission', permission?.granted);

      if (!permission.granted) {
        Toast.show({
          type: 'error',
          text1: 'Acces blocat la cameră 📷',
          text2: 'Avem nevoie de permisiune pentru a putea scana buletinul de analize.',
        });
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
      });
      logUpload('pickImage:camera_result', {
        canceled: result?.canceled,
        assetsCount: result?.assets?.length || 0,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const image = result.assets[0];
        logUpload('pickImage:selected', {
          uri: image?.uri,
          fileSize: image?.fileSize,
          size: image?.size,
          mimeType: image?.mimeType,
        });

        // Permitem selectarea rapidă; compresia se face în background la upload.
        if ((image.fileSize || 0) > RAW_IMAGE_ACCEPT_MAX_BYTES) {
          Toast.show({
            type: 'info',
            text1: 'Fișier prea mare',
            text2: 'Această imagine depășește limita de mărime permisă.',
          });
          return;
        }

        setSelectedFiles((prev) => [...prev, image]);
        setFileType('image');
        Toast.show({
          type: 'success',
          text1: 'Pagina a fost salvată! 📸',
          text2: 'Am adăugat fotografia în lista de scanare.',
        });
      }
    } catch (error) {
      logUpload('pickImage:error', error);
      Toast.show({
        type: 'error',
        text1: 'Probleme cu camera foto',
        text2: 'Nu am putut deschide camera. Te rugăm să încerci din nou.',
      });
    } finally {
      releasePickerLock();
    }
  };

  const pickImagesFromGallery = async () => {
    if (!acquirePickerLock()) return;
    try {
      logUpload('pickImagesFromGallery:start');
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      logUpload('pickImagesFromGallery:permission', permission?.granted);

      if (!permission.granted) {
        Toast.show({
          type: 'error',
          text1: 'Acces blocat la galerie 🖼️',
          text2: 'Te rugăm să permiți accesul pentru a alege analizele din poze.',
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
        allowsMultipleSelection: true,
        selectionLimit: 10,
      });
      logUpload('pickImagesFromGallery:result', {
        canceled: result?.canceled,
        assetsCount: result?.assets?.length || 0,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const validAssets = result.assets.filter(
          (asset) => (asset.fileSize || 0) <= RAW_IMAGE_ACCEPT_MAX_BYTES,
        );
        const skippedCount = result.assets.length - validAssets.length;

        setSelectedFiles((prev) => {
          const merged = [...prev, ...validAssets];
          const uniqueByUri = merged.filter(
            (item, idx, arr) =>
              arr.findIndex((x) => x.uri === item.uri) === idx,
          );
          return uniqueByUri.slice(0, 10);
        });
        setFileType('image');

        const pageText = validAssets.length === 1 ? 'o pagină' : `${validAssets.length} pagini`;
        const skipText = skippedCount === 1 ? 'un fișier prea mare' : `${skippedCount} fișiere prea mari`;

        Toast.show({
          type: 'success',
          text1: 'Fotografii adăugate! 🖼️',
          text2:
            skippedCount > 0
              ? `Am adăugat ${pageText}. Am ignorat ${skipText}.`
              : `Am adăugat ${pageText} pentru procesare.`,
        });
      }
    } catch (error) {
      logUpload('pickImagesFromGallery:error', error);
      Toast.show({
        type: 'error',
        text1: 'Selecție eșuată',
        text2: 'Nu am putut încărca pozele din galerie.',
      });
    } finally {
      releasePickerLock();
    }
  };

  const pickImages = () => {
    setIsSourceSheetVisible(true);
  };

  const openCameraFromSheet = () => {
    if (pickerBusyRef.current) return;
    setIsSourceSheetVisible(false);
    setTimeout(() => {
      void pickImage();
    }, 400); // Mărit delay-ul pentru a lăsa modal-ul să se închidă complet
  };

  const openGalleryFromSheet = () => {
    if (pickerBusyRef.current) return;
    setIsSourceSheetVisible(false);
    setTimeout(() => {
      void pickImagesFromGallery();
    }, 400); // Mărit delay-ul
  };

  const uploadFile = async () => {
    logUpload('uploadFile:start', {
      fileType,
      filesCount: selectedFiles.length,
    });

    if (selectedFiles.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Eroare',
        text2: 'Selectează un fișier mai întâi.',
      });
      return;
    }

    // Capture states locally for background promise execution
    const filesToUpload = [...selectedFiles];
    const uploadMode = fileType;

    // Reset local screen state immediately so the user sees instant feedback
    setSelectedFiles([]);
    setFileType(null);
    setIsSourceSheetVisible(false);

    // Show initial informative Toast
    Toast.show({
      type: 'info',
      text1: 'Analizele se încarcă... 📤',
      text2: 'Le procesăm acum. Poți naviga prin aplicație liniștit.',
      visibilityTime: 4500,
    });

    // Navigate back to home screen (Acasă tab) immediately
    router.replace('/(tabs)');

    // Run the upload and OCR network call in the background
    (async () => {
      try {
        const formData = new FormData();

        for (let i = 0; i < filesToUpload.length; i++) {
          let currentFile = filesToUpload[i];
          const isPdfFile = uploadMode === 'pdf' || 
            currentFile.name?.toLowerCase().endsWith('.pdf') || 
            currentFile.uri?.toLowerCase().endsWith('.pdf');

          if (!isPdfFile) {
            currentFile = await compressImageForUpload(currentFile, i);
          }

          logUpload('uploadFile:prepare_file (bg)', {
            index: i,
            uri: currentFile?.uri,
            name: currentFile?.name,
            mimeType: currentFile?.mimeType,
            size: getAssetSize(currentFile),
          });

          if (!isPdfFile && getAssetSize(currentFile) > RAW_IMAGE_ACCEPT_MAX_BYTES) {
            Toast.show({
              type: 'error',
              text1: 'Fișier prea mare',
              text2: 'Una dintre imagini depășește limita de mărime admisă.',
            });
            return;
          }

          const fileToUpload: any = {
            uri: currentFile.uri,
            type: currentFile.mimeType || (isPdfFile ? 'application/pdf' : 'image/jpeg'),
            name: currentFile.name || `analysis_${Date.now()}_${i}.${isPdfFile ? 'pdf' : 'jpg'}`,
          };

          formData.append(
            isPdfFile ? 'analysisFile' : 'analysisFiles',
            fileToUpload,
          );
        }

        logUpload('uploadFile:request_send (bg)', {
          endpoint: `${API_URL}/api/analyses/upload`,
          mode: uploadMode,
          filesCount: filesToUpload.length,
        });

        const response = await axios.post(
          `${API_URL}/api/analyses/upload`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data',
            },
            timeout: 90000, // Safe 90 seconds timeout for background processing
          },
        );

        logUpload('uploadFile:response_ok (bg)', response?.data);

        // Global success toast
        const valText = response.data.count === 1
          ? 'o valoare nouă'
          : `${response.data.count} valori noi`;

        Toast.show({
          type: 'success',
          text1: 'Analize salvate cu succes! 🎉',
          text2: `Am adăugat ${valText} în istoricul tău medical (${response.data.clinic}).`,
          visibilityTime: 6000,
        });
      } catch (error: any) {
        logUpload('uploadFile:error (bg)', {
          message: error?.message,
          status: error?.response?.status,
          data: error?.response?.data,
        });
        
        Toast.show({
          type: 'error',
          text1: 'Hopa! Am întâmpinat o problemă ❌',
          text2: error.response?.data?.message || 'Nu am putut citi datele. Te rugăm să încerci din nou cu imagini mai clare.',
          visibilityTime: 6500,
        });
      }
    })();
  };

  if (isMounting) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: containerBg, justifyContent: 'center', alignItems: 'center' }}
        edges={['top']}
      >
        <ActivityIndicator size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

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

        {/* SECȚIUNE ÎNCĂRCARE */}
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

          {selectedFiles.length > 0 ? (
            <View style={styles.fileInfo}>
              {fileType === 'image' ? (
                <View style={styles.fileIconContainer}>
                  <MaterialIcons
                    name="photo-library"
                    size={40}
                    color="#34C759"
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
                  {fileType === 'pdf'
                    ? selectedFiles[0]?.name || 'PDF selectat'
                    : selectedFiles.length === 1
                      ? 'O imagine selectată'
                      : `${selectedFiles.length} imagini selectate`}
                </Text>
                {selectedFiles[0]?.size && (
                  <Text style={styles.fileSize}>
                    {(
                      selectedFiles.reduce(
                        (acc, file) => acc + (file.size || 0),
                        0,
                      ) /
                      1024 /
                      1024
                    ).toFixed(2)}{' '}
                    MB total
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => {
                  setSelectedFiles([]);
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

          {selectedFiles.length === 0 ? (
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
                style={[styles.selectButton, { backgroundColor: '#5856D6' }]}
                onPress={pickImages}
                activeOpacity={0.8}
              >
                <MaterialIcons name="photo-library" size={24} color="#FFFFFF" />
                <Text style={styles.selectButtonText}>Adaugă Poze</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.buttonGroup}>
              {fileType === 'image' && selectedFiles.length < 10 && (
                <TouchableOpacity
                  style={[styles.selectButton, { backgroundColor: '#5856D6' }]}
                  onPress={pickImages}
                  activeOpacity={0.8}
                >
                  <MaterialIcons
                    name="add-photo-alternate"
                    size={24}
                    color="#FFFFFF"
                  />
                  <Text style={styles.selectButtonText}>Adaugă poze</Text>
                </TouchableOpacity>
              )}

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
            </View>
          )}
        </View>

        {/* INSTRUCȚIUNI */}
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

        {/* CARDURI INFORMAȚII */}
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

        {/* ALTERNATIVĂ */}
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

      <Modal
        visible={isSourceSheetVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSourceSheetVisible(false)}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setIsSourceSheetVisible(false)}
        >
          <Pressable
            style={[
              styles.sourceSheet,
              { backgroundColor: isDark ? '#111214' : '#FFFFFF' },
            ]}
            onPress={() => {}}
          >
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: textColor }]}>
              Adaugă Poze
            </Text>
            <Text style={[styles.sheetSubtitle, { color: textColor }]}>
              Alege camera sau poze din galerie
            </Text>

            <TouchableOpacity
              style={[styles.sheetAction, { backgroundColor: '#007AFF' }]}
              onPress={openCameraFromSheet}
              activeOpacity={0.85}
              disabled={isPickerBusy}
            >
              <MaterialIcons name="photo-camera" size={22} color="#FFFFFF" />
              <Text style={styles.sheetActionText}>Deschide Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sheetAction, { backgroundColor: '#5856D6' }]}
              onPress={openGalleryFromSheet}
              activeOpacity={0.85}
              disabled={isPickerBusy}
            >
              <MaterialIcons name="photo-library" size={22} color="#FFFFFF" />
              <Text style={styles.sheetActionText}>Alege din Galerie</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetCancelButton}
              onPress={() => setIsSourceSheetVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.sheetCancelText}>Anulează</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================
// STILURI
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

  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'flex-end',
  },
  sourceSheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    gap: 10,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#C7C7CC',
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  sheetSubtitle: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 6,
  },
  sheetAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  sheetActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  sheetCancelButton: {
    marginTop: 4,
    alignItems: 'center',
    paddingVertical: 10,
  },
  sheetCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
});
