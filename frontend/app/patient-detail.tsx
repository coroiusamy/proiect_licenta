import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  SectionList,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import Toast from 'react-native-toast-message';

import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function PatientDetailScreen() {
  const { token } = useAuth();
  const { patientId, patientName } = useLocalSearchParams<{
    patientId: string;
    patientName: string;
  }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [patient, setPatient] = useState<any>(null);
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'analyses' | 'profile'>(
    'analyses',
  );

  const containerBg = isDark ? '#000000' : '#F8F9FA';
  const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const subtextColor = isDark ? '#8E8E93' : '#6B7280';

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [profileRes, analysesRes] = await Promise.all([
        axios.get(`${API_URL}/api/doctor/patient/${patientId}`, { headers }),
        axios.get(`${API_URL}/api/doctor/patient/${patientId}/analyses`, {
          headers,
        }),
      ]);
      setPatient(profileRes.data);
      setAnalyses(analysesRes.data);
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Eroare',
        text2: 'Nu s-au putut încărca datele pacientului.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Grupează analizele pe dată
  const groupedByDate = analyses.reduce(
    (acc: Record<string, any[]>, item: any) => {
      const dateKey = new Date(item.date).toLocaleDateString('ro-RO');
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(item);
      return acc;
    },
    {},
  );

  const sections = Object.entries(groupedByDate)
    .sort(([a], [b]) => {
      const da = a.split('.').reverse().join('-');
      const db = b.split('.').reverse().join('-');
      return db.localeCompare(da);
    })
    .map(([date, data]) => ({
      title: date,
      data: data as any[],
    }));

  const getAge = (dob: string | null) => {
    if (!dob) return null;
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
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

  const avatarUri = patient?.profilePicture
    ? patient.profilePicture.startsWith('http')
      ? patient.profilePicture
      : `${API_URL}${patient.profilePicture}`
    : null;

  const age = getAge(patient?.dateOfBirth);

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
        <Text
          style={[styles.headerTitle, { color: textColor }]}
          numberOfLines={1}
        >
          {patientName || 'Pacient'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* BANNER PACIENT */}
      <View style={[styles.banner, { backgroundColor: cardBg }]}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.bannerAvatar} />
        ) : (
          <View style={[styles.bannerAvatar, styles.avatarPlaceholder]}>
            <MaterialIcons name="person" size={36} color="#8E8E93" />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.bannerName, { color: textColor }]}>
            {patient?.firstName} {patient?.lastName}
          </Text>
          <View style={styles.bannerDetails}>
            {age && (
              <Text style={[styles.bannerDetail, { color: subtextColor }]}>
                {age} ani
              </Text>
            )}
            {patient?.gender && (
              <Text style={[styles.bannerDetail, { color: subtextColor }]}>
                {patient.gender === 'M' ? '♂ Masculin' : '♀ Feminin'}
              </Text>
            )}
            {patient?.weight && (
              <Text style={[styles.bannerDetail, { color: subtextColor }]}>
                {patient.weight} kg
              </Text>
            )}
            {patient?.height && (
              <Text style={[styles.bannerDetail, { color: subtextColor }]}>
                {patient.height} cm
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* TAB-URI */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'analyses' && styles.tabActive]}
          onPress={() => setActiveTab('analyses')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'analyses' && styles.tabTextActive,
            ]}
          >
            Analize ({analyses.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'profile' && styles.tabActive]}
          onPress={() => setActiveTab('profile')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'profile' && styles.tabTextActive,
            ]}
          >
            Profil
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'analyses' ? (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <MaterialIcons name="event" size={16} color={subtextColor} />
              <Text style={[styles.sectionHeaderText, { color: subtextColor }]}>
                {section.title}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.analysisCard, { backgroundColor: cardBg }]}
              activeOpacity={0.7}
              onPress={() =>
                router.push({
                  pathname: '/chart-detaliu',
                  params: {
                    typeId: item.analysisTypeId,
                    typeName: item.analysisType?.name || '',
                    unit: item.analysisType?.unit || '',
                    patientId: patientId,
                  },
                })
              }
            >
              <View style={styles.analysisRow}>
                <View
                  style={[
                    styles.analysisIcon,
                    { backgroundColor: '#007AFF20' },
                  ]}
                >
                  <MaterialIcons name="biotech" size={20} color="#007AFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.analysisName, { color: textColor }]}
                    numberOfLines={1}
                  >
                    {item.analysisType?.name || 'Analiză'}
                  </Text>
                  {item.analysisType?.displayName && (
                    <Text
                      style={[styles.analysisSubname, { color: subtextColor }]}
                      numberOfLines={1}
                    >
                      {item.analysisType.displayName}
                    </Text>
                  )}
                </View>
                <View style={styles.valueContainer}>
                  <Text style={[styles.valueText, { color: textColor }]}>
                    {item.value ?? item.stringValue ?? '-'}
                  </Text>
                  {item.analysisType?.unit && (
                    <Text style={[styles.unitText, { color: subtextColor }]}>
                      {item.analysisType.unit}
                    </Text>
                  )}
                </View>
                <MaterialIcons name="show-chart" size={20} color="#8E8E93" />
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={[styles.emptyCard, { backgroundColor: cardBg }]}>
              <MaterialIcons name="science" size={48} color={subtextColor} />
              <Text style={[styles.emptyText, { color: subtextColor }]}>
                Pacientul nu are analize încărcate.
              </Text>
            </View>
          }
        />
      ) : (
        /* TAB PROFIL */
        <View style={styles.profileContent}>
          <ProfileRow
            icon="email"
            label="Email"
            value={patient?.email}
            isDark={isDark}
          />
          <ProfileRow
            icon="cake"
            label="Data nașterii"
            value={
              patient?.dateOfBirth
                ? new Date(patient.dateOfBirth).toLocaleDateString('ro-RO')
                : '-'
            }
            isDark={isDark}
          />
          <ProfileRow
            icon="wc"
            label="Gen"
            value={
              patient?.gender === 'M'
                ? 'Masculin'
                : patient?.gender === 'F'
                  ? 'Feminin'
                  : '-'
            }
            isDark={isDark}
          />
          <ProfileRow
            icon="monitor-weight"
            label="Greutate"
            value={patient?.weight ? `${patient.weight} kg` : '-'}
            isDark={isDark}
          />
          <ProfileRow
            icon="height"
            label="Înălțime"
            value={patient?.height ? `${patient.height} cm` : '-'}
            isDark={isDark}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

function ProfileRow({
  icon,
  label,
  value,
  isDark,
}: {
  icon: any;
  label: string;
  value: string;
  isDark: boolean;
}) {
  const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const subtextColor = isDark ? '#8E8E93' : '#6B7280';

  return (
    <View style={[styles.profileRow, { backgroundColor: cardBg }]}>
      <MaterialIcons name={icon} size={22} color="#007AFF" />
      <View style={{ flex: 1 }}>
        <Text style={[styles.profileLabel, { color: subtextColor }]}>
          {label}
        </Text>
        <Text style={[styles.profileValue, { color: textColor }]}>{value}</Text>
      </View>
    </View>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  bannerAvatar: { width: 60, height: 60, borderRadius: 30 },
  avatarPlaceholder: {
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerName: { fontSize: 18, fontWeight: '700' },
  bannerDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  bannerDetail: { fontSize: 13 },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 10,
    backgroundColor: '#E5E5EA',
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: '#FFFFFF' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#8E8E93' },
  tabTextActive: { color: '#007AFF' },
  listContent: { paddingHorizontal: 16, paddingBottom: 30 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  sectionHeaderText: { fontSize: 14, fontWeight: '600' },
  analysisCard: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  analysisRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  analysisIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  analysisName: { fontSize: 14, fontWeight: '600' },
  analysisSubname: { fontSize: 12, marginTop: 1 },
  valueContainer: { alignItems: 'flex-end', marginRight: 4 },
  valueText: { fontSize: 15, fontWeight: '700' },
  unitText: { fontSize: 11 },
  emptyCard: {
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 40,
    gap: 8,
  },
  emptyText: { fontSize: 15, textAlign: 'center' },
  profileContent: { paddingHorizontal: 16, paddingTop: 8, gap: 8 },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 12,
  },
  profileLabel: { fontSize: 12 },
  profileValue: { fontSize: 15, fontWeight: '600', marginTop: 2 },
});
