import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import axios from 'axios';
import Toast from 'react-native-toast-message';

import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function PacientiScreen() {
  const { token } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [patients, setPatients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [linkCode, setLinkCode] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);

  const containerBg = isDark ? '#000000' : '#F8F9FA';
  const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const subtextColor = isDark ? '#8E8E93' : '#6B7280';
  const inputBg = isDark ? '#2C2C2E' : '#F2F2F7';

  const fetchPatients = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/doctor/my-patients`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPatients(res.data);
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Eroare',
        text2: 'Nu s-au putut încărca pacienții.',
      });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchPatients();
    }, [fetchPatients]),
  );

  const handleLinkPatient = async () => {
    if (!linkCode.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Atenție',
        text2: 'Introdu codul primit de la pacient.',
      });
      return;
    }

    setIsLinking(true);
    try {
      const res = await axios.post(
        `${API_URL}/api/doctor/link-patient`,
        { code: linkCode.trim() },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      Toast.show({ type: 'success', text1: 'Succes', text2: res.data.message });
      setLinkCode('');
      setShowCodeInput(false);
      fetchPatients();
    } catch (error: any) {
      const msg =
        error?.response?.data?.message || 'Nu s-a putut asocia pacientul.';
      Toast.show({ type: 'error', text1: 'Eroare', text2: msg });
    } finally {
      setIsLinking(false);
    }
  };

  const getAge = (dob: string | null) => {
    if (!dob) return null;
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const renderPatient = ({ item }: { item: any }) => {
    const age = getAge(item.dateOfBirth);
    const avatarUri = item.profilePicture
      ? item.profilePicture.startsWith('http')
        ? item.profilePicture
        : `${API_URL}${item.profilePicture}`
      : null;

    return (
      <TouchableOpacity
        style={[styles.patientCard, { backgroundColor: cardBg }]}
        activeOpacity={0.7}
        onPress={() =>
          router.push({
            pathname: '/patient-detail' as any,
            params: {
              patientId: item.id,
              patientName: `${item.firstName} ${item.lastName}`,
            },
          })
        }
      >
        <View style={styles.patientRow}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <MaterialIcons name="person" size={28} color="#8E8E93" />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.patientName, { color: textColor }]}>
              {item.firstName} {item.lastName}
            </Text>
            <View style={styles.detailRow}>
              {age && (
                <Text style={[styles.detailText, { color: subtextColor }]}>
                  {age} ani
                </Text>
              )}
              {item.gender && (
                <Text style={[styles.detailText, { color: subtextColor }]}>
                  {item.gender === 'M' ? '♂ Masculin' : '♀ Feminin'}
                </Text>
              )}
            </View>
            <Text style={[styles.linkedDate, { color: subtextColor }]}>
              Conectat din {new Date(item.linkedAt).toLocaleDateString('ro-RO')}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#8E8E93" />
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: containerBg }]}
        edges={['top']}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: containerBg }]}
      edges={['top']}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: textColor }]}>
          Pacienții Mei
        </Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCodeInput(!showCodeInput)}
        >
          <MaterialIcons
            name={showCodeInput ? 'close' : 'person-add'}
            size={24}
            color="#007AFF"
          />
        </TouchableOpacity>
      </View>

      {/* ADĂUGARE PACIENT */}
      {showCodeInput && (
        <View style={[styles.codeInputSection, { backgroundColor: cardBg }]}>
          <Text style={[styles.codeInputLabel, { color: textColor }]}>
            Introdu codul pacientului
          </Text>
          <View style={styles.codeInputRow}>
            <TextInput
              style={[
                styles.codeInput,
                { backgroundColor: inputBg, color: textColor },
              ]}
              placeholder="Ex: A3F2B1"
              placeholderTextColor="#8E8E93"
              value={linkCode}
              onChangeText={setLinkCode}
              autoCapitalize="characters"
              maxLength={6}
            />
            <TouchableOpacity
              style={[styles.linkButton, isLinking && { opacity: 0.7 }]}
              onPress={handleLinkPatient}
              disabled={isLinking}
            >
              {isLinking ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <MaterialIcons name="link" size={24} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={patients}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderPatient}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchPatients();
            }}
          />
        }
        ListEmptyComponent={
          <View style={[styles.emptyCard, { backgroundColor: cardBg }]}>
            <MaterialIcons
              name="people-outline"
              size={56}
              color={subtextColor}
            />
            <Text style={[styles.emptyTitle, { color: textColor }]}>
              Niciun pacient conectat
            </Text>
            <Text style={[styles.emptySubtext, { color: subtextColor }]}>
              Apasă butonul + și introdu codul primit de la pacient pentru a-l
              adăuga.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 28, fontWeight: '800' },
  addButton: { padding: 8 },
  codeInputSection: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  codeInputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  codeInputRow: { flexDirection: 'row', gap: 10 },
  codeInput: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
  },
  linkButton: {
    backgroundColor: '#007AFF',
    width: 48,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 30, paddingTop: 4 },
  patientCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  patientRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  avatarPlaceholder: {
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  patientName: { fontSize: 16, fontWeight: '700' },
  detailRow: { flexDirection: 'row', gap: 12, marginTop: 2 },
  detailText: { fontSize: 13 },
  linkedDate: { fontSize: 12, marginTop: 2 },
  emptyCard: {
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 40,
    gap: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySubtext: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
