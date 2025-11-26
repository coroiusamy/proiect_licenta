import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  View,
  Platform,
  useColorScheme,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

// --- Componentă: Rând de informații (View Mode) ---
const InfoRow = ({ label, value, icon, isDark }: any) => (
  <View style={styles.infoRow}>
    <View style={styles.iconContainer}>
      <MaterialIcons name={icon} size={22} color="#007AFF" />
    </View>
    <View style={{ flex: 1 }}>
      <ThemedText
        style={[styles.label, { color: isDark ? '#A1A1A6' : '#666' }]}
      >
        {label}
      </ThemedText>
      <ThemedText style={styles.valueText}>{value || '-'}</ThemedText>
    </View>
  </View>
);

// --- Componentă Nouă: Selector Sex (Modern Toggle) ---
const GenderSelector = ({ value, onChange, isDark }: any) => {
  const activeColor = '#007AFF';
  const inactiveBg = isDark ? '#2C2C2E' : '#E5E5EA';
  const inactiveText = isDark ? '#A1A1A6' : '#8E8E93';

  return (
    <View style={styles.genderContainer}>
      <TouchableOpacity
        style={[
          styles.genderButton,
          { backgroundColor: value === 'MALE' ? activeColor : inactiveBg },
          {
            borderTopRightRadius: 0,
            borderBottomRightRadius: 0,
            marginRight: 1,
          },
        ]}
        onPress={() => onChange('MALE')}
        activeOpacity={0.8}
      >
        <MaterialIcons
          name="male"
          size={20}
          color={value === 'MALE' ? '#fff' : inactiveText}
          style={{ marginRight: 5 }}
        />
        <ThemedText
          style={{
            color: value === 'MALE' ? '#fff' : inactiveText,
            fontWeight: '600',
          }}
        >
          Masculin
        </ThemedText>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.genderButton,
          { backgroundColor: value === 'FEMALE' ? activeColor : inactiveBg },
          { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 },
        ]}
        onPress={() => onChange('FEMALE')}
        activeOpacity={0.8}
      >
        <MaterialIcons
          name="female"
          size={20}
          color={value === 'FEMALE' ? '#fff' : inactiveText}
          style={{ marginRight: 5 }}
        />
        <ThemedText
          style={{
            color: value === 'FEMALE' ? '#fff' : inactiveText,
            fontWeight: '600',
          }}
        >
          Feminin
        </ThemedText>
      </TouchableOpacity>
    </View>
  );
};

// --- Componenta Principală: Profil ---
export default function ProfilScreen() {
  const { token, logout } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Culori UI
  const cardBackground = isDark ? '#1C1C1E' : '#FFFFFF';
  const inputBackground = isDark ? '#2C2C2E' : '#F2F2F7';
  const textColor = isDark ? '#FFFFFF' : '#000000';

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [userData, setUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    gender: 'MALE',
    weight: '',
    height: '',
    dateOfBirth: new Date(),
  });

  const fetchProfile = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const u = response.data;
      setUserData({
        firstName: u.firstName || '',
        lastName: u.lastName || '',
        email: u.email || '',
        gender: u.gender || 'MALE',
        weight: u.weight ? u.weight.toString() : '',
        height: u.height ? u.height.toString() : '',
        dateOfBirth: u.dateOfBirth ? new Date(u.dateOfBirth) : new Date(),
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Eroare',
        text2: 'Nu s-a putut încărca profilul.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await axios.put(
        `${API_URL}/api/user/profile`,
        {
          firstName: userData.firstName,
          lastName: userData.lastName,
          gender: userData.gender,
          weight: userData.weight ? parseFloat(userData.weight) : null,
          height: userData.height ? parseFloat(userData.height) : null,
          dateOfBirth: userData.dateOfBirth.toISOString(),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Toast.show({
        type: 'success',
        text1: 'Succes',
        text2: 'Profil actualizat!',
      });
      setIsEditing(false);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Eroare',
        text2: 'Nu s-a putut salva.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setUserData((prev) => ({ ...prev, [field]: value }));
  };

  const getInitials = () => {
    const f = userData.firstName?.[0] || 'U';
    const l = userData.lastName?.[0] || '';
    return (f + l).toUpperCase();
  };

  // --- Funcții de Randare ---

  const renderViewMode = () => (
    <>
      <InfoRow
        label="Email"
        value={userData.email}
        icon="email"
        isDark={isDark}
      />
      <View style={styles.divider} />
      <InfoRow
        label="Data Nașterii"
        value={userData.dateOfBirth.toLocaleDateString('ro-RO')}
        icon="cake"
        isDark={isDark}
      />
      <View style={styles.divider} />
      <InfoRow
        label="Sex"
        value={userData.gender === 'MALE' ? 'Masculin' : 'Feminin'}
        icon="person"
        isDark={isDark}
      />
      <View style={styles.divider} />
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <InfoRow
            label="Greutate"
            value={userData.weight ? `${userData.weight} kg` : 'Nespecificat'}
            icon="fitness-center"
            isDark={isDark}
          />
        </View>
        <View style={{ flex: 1 }}>
          <InfoRow
            label="Înălțime"
            value={userData.height ? `${userData.height} cm` : 'Nespecificat'}
            icon="height"
            isDark={isDark}
          />
        </View>
      </View>
    </>
  );

  const renderEditMode = () => (
    <>
      <ThemedText style={styles.editLabel}>Prenume</ThemedText>
      <TextInput
        style={[
          styles.input,
          { backgroundColor: inputBackground, color: textColor },
        ]}
        value={userData.firstName}
        onChangeText={(v) => updateField('firstName', v)}
      />

      <ThemedText style={styles.editLabel}>Nume</ThemedText>
      <TextInput
        style={[
          styles.input,
          { backgroundColor: inputBackground, color: textColor },
        ]}
        value={userData.lastName}
        onChangeText={(v) => updateField('lastName', v)}
      />

      <ThemedText style={styles.editLabel}>Data Nașterii</ThemedText>
      <TouchableOpacity
        style={[
          styles.input,
          { backgroundColor: inputBackground, justifyContent: 'center' },
        ]}
        onPress={() => setShowDatePicker(true)}
      >
        <ThemedText>
          {userData.dateOfBirth.toLocaleDateString('ro-RO')}
        </ThemedText>
      </TouchableOpacity>

      {(showDatePicker || Platform.OS === 'ios') && (
        <DateTimePicker
          value={userData.dateOfBirth}
          mode="date"
          display="default"
          onChange={(e, d) => {
            if (Platform.OS === 'android') setShowDatePicker(false);
            if (d) updateField('dateOfBirth', d);
          }}
          maximumDate={new Date()}
          themeVariant={isDark ? 'dark' : 'light'}
        />
      )}

      <ThemedText style={styles.editLabel}>Sex</ThemedText>
      <GenderSelector
        value={userData.gender}
        onChange={(v: string) => updateField('gender', v)}
        isDark={isDark}
      />

      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <ThemedText style={styles.editLabel}>Greutate (kg)</ThemedText>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: inputBackground, color: textColor },
            ]}
            value={userData.weight}
            onChangeText={(v) => updateField('weight', v)}
            keyboardType="numeric"
          />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.editLabel}>Înălțime (cm)</ThemedText>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: inputBackground, color: textColor },
            ]}
            value={userData.height}
            onChangeText={(v) => updateField('height', v)}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.editButtonsRow}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => {
            setIsEditing(false);
            fetchProfile();
          }}
        >
          <ThemedText style={{ color: '#FF3B30', fontWeight: '600' }}>
            Anulează
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={{ color: '#fff', fontWeight: '600' }}>
              Salvează
            </ThemedText>
          )}
        </TouchableOpacity>
      </View>
    </>
  );

  if (isLoading) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </ThemedView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header Avatar */}
          <ThemedView style={styles.headerContainer}>
            <View style={styles.avatarCircle}>
              <ThemedText style={styles.avatarInitials}>
                {getInitials()}
              </ThemedText>
            </View>

            {!isEditing ? (
              <>
                <ThemedText type="title" style={styles.nameTitle}>
                  {userData.firstName} {userData.lastName}
                </ThemedText>
                <TouchableOpacity
                  style={styles.editButtonBadge}
                  onPress={() => setIsEditing(true)}
                >
                  <MaterialIcons name="edit" size={14} color="#fff" />
                  <ThemedText style={styles.editButtonText}>
                    Editează Profil
                  </ThemedText>
                </TouchableOpacity>
              </>
            ) : (
              <ThemedText style={{ color: 'gray', marginTop: 10 }}>
                Mod Editare
              </ThemedText>
            )}
          </ThemedView>

          {/* Card Principal */}
          <View style={[styles.card, { backgroundColor: cardBackground }]}>
            {isEditing ? renderEditMode() : renderViewMode()}
          </View>

          {/* Buton Deconectare */}
          {!isEditing && (
            <TouchableOpacity style={styles.logoutButton} onPress={logout}>
              <ThemedText style={styles.logoutText}>Deconectare</ThemedText>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 20 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 25,
    backgroundColor: 'transparent',
  },

  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  avatarInitials: {
    fontSize: 36,
    lineHeight: 36,
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',

    // --- FIX PENTRU ANDROID ---
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  nameTitle: { fontSize: 24, fontWeight: 'bold' },

  editButtonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34C759',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 10,
  },
  editButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 6,
    fontSize: 14,
  },

  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  // Info Row Styles
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  iconContainer: { width: 40, alignItems: 'center', marginRight: 10 },
  label: {
    fontSize: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  valueText: { fontSize: 17, fontWeight: '400' },
  divider: { height: 1, backgroundColor: '#eee', marginLeft: 50, opacity: 0.5 },

  // Edit Styles
  editLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
  },
  input: { height: 44, borderRadius: 8, paddingHorizontal: 10, fontSize: 16 },
  row: { flexDirection: 'row' },

  // Gender Selector Styles
  genderContainer: {
    flexDirection: 'row',
    marginBottom: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },

  editButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    marginRight: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  saveButton: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    marginLeft: 10,
    borderRadius: 8,
    backgroundColor: '#007AFF',
  },

  logoutButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  logoutText: { color: '#FF3B30', fontSize: 16, fontWeight: 'bold' },
});
