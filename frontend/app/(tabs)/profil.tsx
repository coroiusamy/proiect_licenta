import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  useColorScheme,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActionSheetIOS,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function ProfilScreen() {
  const { token, logout } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [userData, setUserData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    height: '',
    weight: '',
    profilePicture: '',
    authProvider: '',
  });

  const [editData, setEditData] = useState({ ...userData });

  const containerBg = isDark ? '#000000' : '#F8F9FA';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const inputBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const placeholderColor = '#8E8E93';

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = {
        email: response.data.email || '',
        firstName: response.data.firstName || '',
        lastName: response.data.lastName || '',
        dateOfBirth: response.data.dateOfBirth
          ? new Date(response.data.dateOfBirth).toLocaleDateString('ro-RO')
          : '',
        gender: response.data.gender || '',
        height: response.data.height?.toString() || '',
        weight: response.data.weight?.toString() || '',
        profilePicture: response.data.profilePicture || '',
        authProvider: response.data.authProvider || '',
      };

      setUserData(data);
      setEditData(data);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Eroare',
        text2: 'Nu s-au putut încărca datele profilului.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const payload = {
        firstName: editData.firstName,
        lastName: editData.lastName,
        gender: editData.gender,
        height: editData.height ? parseFloat(editData.height) : null,
        weight: editData.weight ? parseFloat(editData.weight) : null,
      };

      await axios.put(`${API_URL}/api/user/profile`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUserData(editData);
      setIsEditing(false);

      Toast.show({
        type: 'success',
        text1: 'Succes!',
        text2: 'Profilul a fost actualizat.',
      });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Eroare',
        text2:
          error.response?.data?.message || 'Nu s-a putut actualiza profilul.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditData(userData);
    setIsEditing(false);
  };

  // Helper function to get full image URL
  const getProfileImageUrl = (profilePicture: string) => {
    if (!profilePicture) return null;
    // If it's already a full URL (Google), return as-is
    if (profilePicture.startsWith('http')) return profilePicture;
    // Otherwise, it's a local path, prepend the API URL
    return `${API_URL}${profilePicture}`;
  };

  const pickImage = async (useCamera: boolean) => {
    try {
      // Request permissions
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permisiune necesară',
            'Trebuie să permiți accesul la cameră.',
          );
          return;
        }
      } else {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permisiune necesară',
            'Trebuie să permiți accesul la galerie.',
          );
          return;
        }
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });

      if (!result.canceled && result.assets[0]) {
        uploadAvatar(result.assets[0].uri);
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Eroare',
        text2: 'Nu s-a putut selecta imaginea.',
      });
    }
  };

  const uploadAvatar = async (uri: string) => {
    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'avatar.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('avatar', {
        uri,
        name: filename,
        type,
      } as any);

      const response = await axios.post(
        `${API_URL}/api/user/profile/avatar`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      setUserData((prev) => ({
        ...prev,
        profilePicture: response.data.profilePicture,
      }));
      setEditData((prev) => ({
        ...prev,
        profilePicture: response.data.profilePicture,
      }));

      Toast.show({
        type: 'success',
        text1: 'Succes!',
        text2: 'Poza de profil a fost actualizată.',
      });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Eroare',
        text2:
          error.response?.data?.message || 'Nu s-a putut încărca imaginea.',
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const deleteAvatar = async () => {
    try {
      await axios.delete(`${API_URL}/api/user/profile/avatar`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUserData((prev) => ({ ...prev, profilePicture: '' }));
      setEditData((prev) => ({ ...prev, profilePicture: '' }));

      Toast.show({
        type: 'success',
        text1: 'Succes!',
        text2: 'Poza de profil a fost ștearsă.',
      });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Eroare',
        text2: error.response?.data?.message || 'Nu s-a putut șterge imaginea.',
      });
    }
  };

  const handleAvatarPress = () => {
    if (Platform.OS === 'ios') {
      const options = userData.profilePicture
        ? ['Anulează', 'Fă o poză', 'Alege din galerie', 'Șterge poza']
        : ['Anulează', 'Fă o poză', 'Alege din galerie'];

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 0,
          destructiveButtonIndex: userData.profilePicture ? 3 : undefined,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) pickImage(true);
          else if (buttonIndex === 2) pickImage(false);
          else if (buttonIndex === 3 && userData.profilePicture) deleteAvatar();
        },
      );
    } else {
      // Android Alert
      const buttons: any[] = [
        { text: 'Anulează', style: 'cancel' },
        { text: 'Fă o poză', onPress: () => pickImage(true) },
        { text: 'Alege din galerie', onPress: () => pickImage(false) },
      ];

      if (userData.profilePicture) {
        buttons.push({
          text: 'Șterge poza',
          style: 'destructive',
          onPress: deleteAvatar,
        });
      }

      Alert.alert('Schimbă poza de profil', 'Alege o opțiune:', buttons);
    }
  };

  const handleLogout = () => {
    Alert.alert('Deconectare', 'Sigur vrei să te deconectezi?', [
      { text: 'Anulează', style: 'cancel' },
      {
        text: 'Deconectare',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/login');
        },
      },
    ]);
  };

  const calculateBMI = () => {
    const sourceData = isEditing ? editData : userData;

    const height = parseFloat(sourceData.height);
    const weight = parseFloat(sourceData.weight);

    if (height && weight) {
      const heightInMeters = height / 100;
      const bmi = weight / (heightInMeters * heightInMeters);
      return bmi.toFixed(1);
    }
    return null;
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { label: 'Subponderal', color: '#FF9500' };
    if (bmi < 25) return { label: 'Normal', color: '#34C759' };
    if (bmi < 30) return { label: 'Supraponderal', color: '#FF9500' };
    return { label: 'Obezitate', color: '#FF3B30' };
  };

  const getGenderDisplay = (gender: string) => {
    if (gender === 'M' || gender === 'Masculin') return 'Masculin';
    if (gender === 'F' || gender === 'Feminin') return 'Feminin';
    return 'Nespecificat';
  };

  const getGenderIcon = (gender: string) => {
    if (gender === 'M' || gender === 'Masculin') return 'male';
    if (gender === 'F' || gender === 'Feminin') return 'female';
    return 'person';
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: containerBg }]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={[styles.loadingText, { color: textColor }]}>
          Se încarcă profilul...
        </Text>
      </View>
    );
  }

  const bmi = calculateBMI();
  const bmiInfo = bmi ? getBMICategory(parseFloat(bmi)) : null;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: containerBg }]}
      edges={['top']}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={[styles.container, { backgroundColor: containerBg }]}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* HEADER */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.headerTitle, { color: textColor }]}>
                Profil
              </Text>
              <Text
                style={[
                  styles.headerSubtitle,
                  { color: textColor, opacity: 0.6 },
                ]}
              >
                Gestionează informațiile tale personale
              </Text>
            </View>
            {!isEditing && (
              <TouchableOpacity
                style={styles.editHeaderButton}
                onPress={() => setIsEditing(true)}
              >
                <MaterialIcons name="edit" size={24} color="#007AFF" />
              </TouchableOpacity>
            )}
          </View>

          {/* PROFILE AVATAR */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              onPress={handleAvatarPress}
              disabled={isUploadingAvatar}
              activeOpacity={0.7}
            >
              <View style={styles.avatarContainer}>
                {userData.profilePicture ? (
                  <Image
                    source={{
                      uri: getProfileImageUrl(userData.profilePicture)!,
                    }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <View
                    style={[styles.avatar, { backgroundColor: '#007AFF20' }]}
                  >
                    <Text style={styles.avatarText}>
                      {userData.firstName?.[0]}
                      {userData.lastName?.[0]}
                    </Text>
                  </View>
                )}
                {isUploadingAvatar ? (
                  <View style={styles.avatarOverlay}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  </View>
                ) : (
                  <View style={styles.avatarEditBadge}>
                    <MaterialIcons
                      name="camera-alt"
                      size={16}
                      color="#FFFFFF"
                    />
                  </View>
                )}
              </View>
            </TouchableOpacity>
            <Text style={[styles.userName, { color: textColor }]}>
              {userData.firstName} {userData.lastName}
            </Text>
            <Text style={styles.userEmail}>{userData.email}</Text>
            {userData.authProvider === 'google' && (
              <View style={styles.googleBadge}>
                <MaterialIcons name="verified" size={14} color="#4285F4" />
                <Text style={styles.googleBadgeText}>Google</Text>
              </View>
            )}
          </View>

          {/* BMI CARD */}
          {bmi && bmiInfo && (
            <View
              style={[
                styles.bmiCard,
                { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
              ]}
            >
              <View style={styles.bmiHeader}>
                <View
                  style={[
                    styles.bmiIcon,
                    { backgroundColor: `${bmiInfo.color}20` },
                  ]}
                >
                  <MaterialIcons
                    name="monitor-weight"
                    size={32}
                    color={bmiInfo.color}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bmiLabel, { color: textColor }]}>
                    Indicele de Masă Corporală
                  </Text>
                  <Text style={[styles.bmiValue, { color: textColor }]}>
                    {bmi} <Text style={styles.bmiUnit}>kg/m²</Text>
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.bmiCategory,
                  { backgroundColor: `${bmiInfo.color}20` },
                ]}
              >
                <Text
                  style={[styles.bmiCategoryText, { color: bmiInfo.color }]}
                >
                  {bmiInfo.label}
                </Text>
              </View>
            </View>
          )}

          {/* PERSONAL INFO */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="person" size={20} color="#007AFF" />
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                Informații Personale
              </Text>
            </View>

            <View
              style={[
                styles.infoCard,
                { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
              ]}
            >
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Prenume</Text>
                {isEditing ? (
                  <TextInput
                    style={[
                      styles.infoInput,
                      { backgroundColor: inputBg, color: textColor },
                    ]}
                    value={editData.firstName}
                    onChangeText={(text) =>
                      setEditData({ ...editData, firstName: text })
                    }
                    placeholder="Prenume"
                    placeholderTextColor={placeholderColor}
                  />
                ) : (
                  <Text style={[styles.infoValue, { color: textColor }]}>
                    {userData.firstName}
                  </Text>
                )}
              </View>

              <View
                style={[
                  styles.infoDivider,
                  { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' },
                ]}
              />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Nume</Text>
                {isEditing ? (
                  <TextInput
                    style={[
                      styles.infoInput,
                      { backgroundColor: inputBg, color: textColor },
                    ]}
                    value={editData.lastName}
                    onChangeText={(text) =>
                      setEditData({ ...editData, lastName: text })
                    }
                    placeholder="Nume"
                    placeholderTextColor={placeholderColor}
                  />
                ) : (
                  <Text style={[styles.infoValue, { color: textColor }]}>
                    {userData.lastName}
                  </Text>
                )}
              </View>

              <View
                style={[
                  styles.infoDivider,
                  { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' },
                ]}
              />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={[styles.infoValue, { color: textColor }]}>
                  {userData.email}
                </Text>
              </View>

              {userData.dateOfBirth && (
                <>
                  <View
                    style={[
                      styles.infoDivider,
                      { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' },
                    ]}
                  />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Data nașterii</Text>
                    <Text style={[styles.infoValue, { color: textColor }]}>
                      {userData.dateOfBirth}
                    </Text>
                  </View>
                </>
              )}

              <View
                style={[
                  styles.infoDivider,
                  { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' },
                ]}
              />

              {/* Gender Selector */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Gen</Text>
                {isEditing ? (
                  <View style={styles.genderSelector}>
                    <TouchableOpacity
                      style={[
                        styles.genderButton,
                        {
                          backgroundColor:
                            editData.gender === 'M' ||
                            editData.gender === 'Masculin'
                              ? '#007AFF'
                              : isDark
                                ? '#2C2C2E'
                                : '#F2F2F7',
                        },
                      ]}
                      onPress={() => setEditData({ ...editData, gender: 'M' })}
                    >
                      <MaterialIcons
                        name="male"
                        size={20}
                        color={
                          editData.gender === 'M' ||
                          editData.gender === 'Masculin'
                            ? '#FFFFFF'
                            : '#8E8E93'
                        }
                      />
                      <Text
                        style={[
                          styles.genderButtonText,
                          {
                            color:
                              editData.gender === 'M' ||
                              editData.gender === 'Masculin'
                                ? '#FFFFFF'
                                : '#8E8E93',
                          },
                        ]}
                      >
                        M
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.genderButton,
                        {
                          backgroundColor:
                            editData.gender === 'F' ||
                            editData.gender === 'Feminin'
                              ? '#FF2D55'
                              : isDark
                                ? '#2C2C2E'
                                : '#F2F2F7',
                        },
                      ]}
                      onPress={() => setEditData({ ...editData, gender: 'F' })}
                    >
                      <MaterialIcons
                        name="female"
                        size={20}
                        color={
                          editData.gender === 'F' ||
                          editData.gender === 'Feminin'
                            ? '#FFFFFF'
                            : '#8E8E93'
                        }
                      />
                      <Text
                        style={[
                          styles.genderButtonText,
                          {
                            color:
                              editData.gender === 'F' ||
                              editData.gender === 'Feminin'
                                ? '#FFFFFF'
                                : '#8E8E93',
                          },
                        ]}
                      >
                        F
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.genderDisplay}>
                    <MaterialIcons
                      name={getGenderIcon(userData.gender) as any}
                      size={18}
                      color={
                        userData.gender === 'M' ||
                        userData.gender === 'Masculin'
                          ? '#007AFF'
                          : userData.gender === 'F' ||
                              userData.gender === 'Feminin'
                            ? '#FF2D55'
                            : '#8E8E93'
                      }
                    />
                    <Text
                      style={[
                        styles.infoValue,
                        { color: textColor, marginLeft: 6 },
                      ]}
                    >
                      {getGenderDisplay(userData.gender)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* HEALTH INFO */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="favorite" size={20} color="#007AFF" />
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                Informații Sănătate
              </Text>
            </View>

            <View
              style={[
                styles.infoCard,
                { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
              ]}
            >
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Înălțime (cm)</Text>
                {isEditing ? (
                  <TextInput
                    style={[
                      styles.infoInput,
                      { backgroundColor: inputBg, color: textColor },
                    ]}
                    value={editData.height}
                    onChangeText={(text) =>
                      setEditData({ ...editData, height: text })
                    }
                    placeholder="180"
                    placeholderTextColor={placeholderColor}
                    keyboardType="decimal-pad"
                  />
                ) : (
                  <Text style={[styles.infoValue, { color: textColor }]}>
                    {userData.height ? `${userData.height} cm` : 'Nespecificat'}
                  </Text>
                )}
              </View>

              <View
                style={[
                  styles.infoDivider,
                  { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' },
                ]}
              />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Greutate (kg)</Text>
                {isEditing ? (
                  <TextInput
                    style={[
                      styles.infoInput,
                      { backgroundColor: inputBg, color: textColor },
                    ]}
                    value={editData.weight}
                    onChangeText={(text) =>
                      setEditData({ ...editData, weight: text })
                    }
                    placeholder="75"
                    placeholderTextColor={placeholderColor}
                    keyboardType="decimal-pad"
                  />
                ) : (
                  <Text style={[styles.infoValue, { color: textColor }]}>
                    {userData.weight ? `${userData.weight} kg` : 'Nespecificat'}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* ACTION BUTTONS */}
          {isEditing ? (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.cancelButton,
                  { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' },
                ]}
                onPress={handleCancel}
                disabled={isSaving}
              >
                <Text style={[styles.cancelButtonText, { color: textColor }]}>
                  Anulează
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Salvează</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.logoutButton,
                { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
              ]}
              onPress={handleLogout}
            >
              <MaterialIcons name="logout" size={24} color="#FF3B30" />
              <Text style={styles.logoutButtonText}>Deconectare</Text>
            </TouchableOpacity>
          )}

          {/* APP INFO */}
          <View style={styles.appInfo}>
            <Text
              style={[styles.appInfoText, { color: textColor, opacity: 0.5 }]}
            >
              Aplicație Monitorizare Analize Medicale
            </Text>
            <Text
              style={[styles.appInfoText, { color: textColor, opacity: 0.5 }]}
            >
              Versiunea 1.0.0
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  scrollContent: { paddingBottom: 30 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { marginTop: 10, fontSize: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerTitle: { fontSize: 32, fontWeight: 'bold', marginBottom: 4 },
  headerSubtitle: { fontSize: 16 },
  editHeaderButton: { padding: 8 },
  avatarSection: { alignItems: 'center', paddingVertical: 20 },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  userName: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  userEmail: { fontSize: 16, color: '#8E8E93' },
  googleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#4285F410',
    borderRadius: 12,
  },
  googleBadgeText: {
    fontSize: 12,
    color: '#4285F4',
    fontWeight: '600',
    marginLeft: 4,
  },
  bmiCard: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  bmiHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  bmiIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  bmiLabel: { fontSize: 14, marginBottom: 4, opacity: 0.7 },
  bmiValue: { fontSize: 32, fontWeight: 'bold' },
  bmiUnit: { fontSize: 18 },
  bmiCategory: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  bmiCategoryText: { fontSize: 14, fontWeight: '600' },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  infoCard: {
    borderRadius: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoLabel: { fontSize: 15, color: '#8E8E93' },
  infoValue: { fontSize: 15, fontWeight: '500' },
  infoInput: {
    fontSize: 15,
    fontWeight: '500',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 120,
    textAlign: 'right',
  },
  infoDivider: { height: 1, marginHorizontal: 16 },
  genderSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  genderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  genderButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  genderDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: { marginRight: 10 },
  saveButton: { backgroundColor: '#007AFF', marginLeft: 10 },
  cancelButtonText: { fontSize: 16, fontWeight: '600' },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  logoutButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  appInfo: {
    alignItems: 'center',
    paddingTop: 30,
  },
  appInfoText: {
    fontSize: 13,
    marginBottom: 4,
  },
});
