import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  FlatList,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import axios from 'axios';
import Toast from 'react-native-toast-message';

import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function ShareScreen() {
  const { token } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [doctors, setDoctors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const containerBg = isDark ? '#000000' : '#F8F9FA';
  const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const subtextColor = isDark ? '#8E8E93' : '#6B7280';

  const fetchDoctors = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/doctor/my-doctors`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDoctors(res.data);
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Eroare',
        text2: 'Nu s-au putut încărca medicii.',
      });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const handleGenerateCode = async () => {
    setIsGenerating(true);
    try {
      const res = await axios.post(
        `${API_URL}/api/doctor/access-code`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setGeneratedCode(res.data.code);
      setExpiresAt(
        new Date(res.data.expiresAt).toLocaleTimeString('ro-RO', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      );
      Toast.show({
        type: 'success',
        text1: 'Cod generat!',
        text2: 'Comunică codul medicului tău.',
      });
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Eroare',
        text2: 'Nu s-a putut genera codul.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevoke = (linkId: number, doctorName: string) => {
    Alert.alert(
      'Revocare acces',
      `Sigur vrei să revoci accesul dr. ${doctorName}?`,
      [
        { text: 'Anulează', style: 'cancel' },
        {
          text: 'Revocă',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API_URL}/api/doctor/my-doctors/${linkId}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              setDoctors((prev) => prev.filter((d) => d.linkId !== linkId));
              Toast.show({
                type: 'success',
                text1: 'Acces revocat',
                text2: `Dr. ${doctorName} nu mai are acces.`,
              });
            } catch {
              Toast.show({
                type: 'error',
                text1: 'Eroare',
                text2: 'Nu s-a putut revoca accesul.',
              });
            }
          },
        },
      ],
    );
  };

  const renderDoctor = ({ item }: { item: any }) => (
    <View style={[styles.doctorCard, { backgroundColor: cardBg }]}>
      <View style={styles.doctorInfo}>
        <View style={[styles.avatarCircle, { backgroundColor: '#34C75920' }]}>
          <MaterialIcons name="medical-services" size={24} color="#34C759" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.doctorName, { color: textColor }]}>
            Dr. {item.firstName} {item.lastName}
          </Text>
          {item.specialty && (
            <Text style={[styles.specialty, { color: subtextColor }]}>
              {item.specialty}
            </Text>
          )}
          <Text style={[styles.linkedDate, { color: subtextColor }]}>
            Acces din {new Date(item.linkedAt).toLocaleDateString('ro-RO')}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.revokeButton}
        onPress={() =>
          handleRevoke(item.linkId, `${item.firstName} ${item.lastName}`)
        }
      >
        <MaterialIcons name="person-remove" size={20} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );

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
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>
          Partajare Date
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={doctors}
        keyExtractor={(item) => item.linkId.toString()}
        renderItem={renderDoctor}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchDoctors();
            }}
          />
        }
        ListHeaderComponent={
          <>
            {/* GENERARE COD */}
            <View style={[styles.codeSection, { backgroundColor: cardBg }]}>
              <MaterialIcons name="qr-code-2" size={40} color="#007AFF" />
              <Text style={[styles.codeSectionTitle, { color: textColor }]}>
                Generează Cod de Acces
              </Text>
              <Text
                style={[styles.codeSectionSubtitle, { color: subtextColor }]}
              >
                Comunică acest cod medicului tău pentru a-i oferi acces la
                analizele tale.
              </Text>

              {generatedCode ? (
                <View style={styles.codeDisplay}>
                  <Text style={styles.codeText}>{generatedCode}</Text>
                  <Text style={[styles.codeExpiry, { color: subtextColor }]}>
                    Expiră la {expiresAt}
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.generateButton,
                  isGenerating && { opacity: 0.7 },
                ]}
                onPress={handleGenerateCode}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.generateButtonText}>
                    {generatedCode ? 'Generează Cod Nou' : 'Generează Cod'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* LISTA MEDICI */}
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              Medicii tăi ({doctors.length})
            </Text>
          </>
        }
        ListEmptyComponent={
          <View style={[styles.emptyCard, { backgroundColor: cardBg }]}>
            <MaterialIcons
              name="people-outline"
              size={48}
              color={subtextColor}
            />
            <Text style={[styles.emptyText, { color: subtextColor }]}>
              Nu ai niciun medic conectat.
            </Text>
            <Text style={[styles.emptySubtext, { color: subtextColor }]}>
              Generează un cod și dă-l medicului tău.
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  listContent: { paddingHorizontal: 16, paddingBottom: 30 },
  codeSection: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  codeSectionTitle: { fontSize: 18, fontWeight: '700', marginTop: 12 },
  codeSectionSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  codeDisplay: {
    marginTop: 16,
    alignItems: 'center',
    backgroundColor: '#007AFF10',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  codeText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#007AFF',
    letterSpacing: 8,
  },
  codeExpiry: { fontSize: 12, marginTop: 6 },
  generateButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 16,
    minWidth: 200,
    alignItems: 'center',
  },
  generateButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  doctorInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doctorName: { fontSize: 16, fontWeight: '600' },
  specialty: { fontSize: 13, marginTop: 2 },
  linkedDate: { fontSize: 12, marginTop: 2 },
  revokeButton: { padding: 8 },
  emptyCard: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: { fontSize: 16, fontWeight: '600' },
  emptySubtext: { fontSize: 13, textAlign: 'center' },
});
