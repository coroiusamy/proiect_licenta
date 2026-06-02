import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const { width } = Dimensions.get('window');

const StatsCard = ({ icon, label, value, color, isDark }: any) => {
  const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  return (
    <View style={[styles.statsCard, { backgroundColor: cardBg }]}>
      <View style={[styles.statsIcon, { backgroundColor: `${color}20` }]}>
        <MaterialIcons name={icon} size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.statsLabel, { color: textColor }]}>{label}</Text>
        <Text style={[styles.statsValue, { color: textColor }]}>{value}</Text>
      </View>
    </View>
  );
};

const BulletinCard = ({ bulletin, isDark, onPress, onDelete }: any) => {
  const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#000000';

  const handleDelete = () => {
    Alert.alert(
      'Șterge Buletin',
      `Sigur vrei să ștergi buletinul din ${bulletin.dateLabel}?`,
      [
        { text: 'Anulează', style: 'cancel' },
        {
          text: 'Șterge',
          style: 'destructive',
          onPress: () => onDelete(bulletin.isoDate),
        },
      ],
    );
  };

  return (
    <TouchableOpacity
      style={[styles.bulletinCard, { backgroundColor: cardBg }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.bulletinHeader}>
        <View style={[styles.bulletinIcon, { backgroundColor: '#007AFF20' }]}>
          <MaterialIcons name="assignment" size={28} color="#007AFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.bulletinDate, { color: textColor }]}>
            Buletin {bulletin.dateLabel}
          </Text>
          <Text style={[styles.bulletinCount, { color: textColor }]}>
            {bulletin.analyses.length} analize
          </Text>
        </View>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
          <MaterialIcons name="delete" size={24} color="#FF3B30" />
        </TouchableOpacity>
      </View>
      <View style={styles.bulletinPreview}>
        {bulletin.analyses.slice(0, 3).map((analysis: any, index: number) => (
          <View key={index} style={styles.previewItem}>
            <View style={[styles.previewDot, { backgroundColor: '#007AFF' }]} />
            <Text
              style={[styles.previewText, { color: textColor }]}
              numberOfLines={1}
            >
              {analysis.analysisType.name}
            </Text>
            <Text style={[styles.previewValue, { color: textColor }]}>
              {analysis.value || analysis.stringValue}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.bulletinFooter}>
        <MaterialIcons name="chevron-right" size={24} color="#007AFF" />
      </View>
    </TouchableOpacity>
  );
};

const EmptyState = ({ isDark }: any) => {
  const textColor = isDark ? '#FFFFFF' : '#000000';
  return (
    <View style={styles.emptyStateContainer}>
      <View
        style={[
          styles.emptyStateIcon,
          { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' },
        ]}
      >
        <MaterialIcons name="assignment" size={64} color="#8E8E93" />
      </View>
      <Text style={[styles.emptyStateTitle, { color: textColor }]}>
        Niciun buletin înregistrat
      </Text>
      <Text style={[styles.emptyStateText, { color: textColor }]}>
        Începe să îți urmărești sănătatea adăugând primul tău buletin de
        analize.
      </Text>
      <TouchableOpacity
        style={styles.emptyStateButton}
        onPress={() => router.push('/adauga')}
        activeOpacity={0.8}
      >
        <MaterialIcons name="add" size={20} color="#FFFFFF" />
        <Text style={styles.emptyStateButtonText}>Adaugă Primul Buletin</Text>
      </TouchableOpacity>
    </View>
  );
};

export default function IstoricScreen() {
  const { token } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bulletins, setBulletins] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    thisWeek: 0,
    thisMonth: 0,
    bulletinsCount: 0,
  });

  const containerBg = isDark ? '#000000' : '#F8F9FA';
  const textColor = isDark ? '#FFFFFF' : '#000000';

  const fetchAnalyses = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/analyses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data;

      // Calcul Statistici
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);

      const thisWeek = data.filter(
        (a: any) => new Date(a.date) >= weekAgo,
      ).length;
      const thisMonth = data.filter(
        (a: any) => new Date(a.date) >= monthAgo,
      ).length;

      const groupedByDate: { [key: string]: any[] } = {};
      data.forEach((analysis: any) => {
        const date = new Date(analysis.date).toDateString();
        if (!groupedByDate[date]) groupedByDate[date] = [];
        groupedByDate[date].push(analysis);
      });

      const bulletinsArray = Object.entries(groupedByDate)
        .map(([dateStr, analyses]) => ({
          date: dateStr,
          isoDate: new Date(analyses[0].date).toISOString(),
          dateLabel: new Date(dateStr).toLocaleDateString('ro-RO', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }),
          analyses: analyses.sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          ),
        }))
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );

      setBulletins(bulletinsArray);
      setStats({
        total: data.length,
        thisWeek,
        thisMonth,
        bulletinsCount: bulletinsArray.length,
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Eroare',
        text2: 'Nu s-au putut încărca analizele.',
      });
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchAnalyses();
    }, [fetchAnalyses]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAnalyses();
  }, [fetchAnalyses]);

  const handleBulletinPress = (bulletin: any) => {
    router.push({
      pathname: '/buletin-detaliu',
      params: { date: bulletin.date }, // Trimitem data buletinului
    });
  };

  const handleDeleteBulletin = async (isoDate: string) => {
    try {
      await axios.delete(
        `${API_URL}/api/analyses?date=${encodeURIComponent(isoDate)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      Toast.show({
        type: 'success',
        text1: 'Șters!',
        text2: 'Buletinul a fost șters.',
      });
      fetchAnalyses();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Eroare',
        text2: 'Nu s-a putut șterge buletinul.',
      });
    }
  };

  if (isLoading)
    return (
      <View style={[styles.loadingContainer, { backgroundColor: containerBg }]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: containerBg }]}
      edges={['top']}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: containerBg }]}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#007AFF"
          />
        }
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: textColor }]}>
            Istoric Analize
          </Text>
          <Text style={[styles.headerSubtitle, { color: textColor }]}>
            Buletinele tale medicale
          </Text>
        </View>

        {bulletins.length === 0 ? (
          <EmptyState isDark={isDark} />
        ) : (
          <>
            {/* STATS */}
            <View style={styles.statsSection}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                Statistici
              </Text>
              <View style={styles.statsGrid}>
                <StatsCard
                  icon="assignment"
                  label="Total analize"
                  value={stats.total}
                  color="#007AFF"
                  isDark={isDark}
                />
                <StatsCard
                  icon="description"
                  label="Buletine"
                  value={stats.bulletinsCount}
                  color="#5856D6"
                  isDark={isDark}
                />
                <StatsCard
                  icon="calendar-today"
                  label="Luna aceasta"
                  value={stats.thisMonth}
                  color="#34C759"
                  isDark={isDark}
                />
                <StatsCard
                  icon="trending-up"
                  label="Săptămâna aceasta"
                  value={stats.thisWeek}
                  color="#FF9500"
                  isDark={isDark}
                />
              </View>
            </View>

            {/* BULLETINS */}
            <View style={styles.bulletinsSection}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: textColor }]}>
                  Buletine de Analize
                </Text>
                <TouchableOpacity onPress={() => router.push('/adauga')}>
                  <View style={styles.addButton}>
                    <MaterialIcons name="add" size={20} color="#007AFF" />
                    <Text style={styles.addButtonText}>Adaugă</Text>
                  </View>
                </TouchableOpacity>
              </View>
              {bulletins.map((bulletin, index) => (
                <BulletinCard
                  key={index}
                  bulletin={bulletin}
                  isDark={isDark}
                  onPress={() => handleBulletinPress(bulletin)}
                  onDelete={handleDeleteBulletin}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/add-analysis')}
        activeOpacity={0.8}
      >
        <MaterialIcons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16 },
  header: { padding: 20 },
  headerTitle: { fontSize: 32, fontWeight: 'bold', marginBottom: 4 },
  headerSubtitle: { fontSize: 16, opacity: 0.7 },
  statsSection: { paddingHorizontal: 20, marginBottom: 25 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  statsCard: {
    width: (width - 50) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    margin: 5,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statsIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  statsLabel: { fontSize: 12, opacity: 0.6, marginBottom: 2 },
  statsValue: { fontSize: 20, fontWeight: 'bold' },
  bulletinsSection: { paddingHorizontal: 20, marginBottom: 25 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#007AFF20',
  },
  addButtonText: {
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 4,
    fontSize: 14,
  },
  bulletinCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  bulletinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bulletinIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bulletinDate: { fontSize: 17, fontWeight: 'bold', marginBottom: 2 },
  bulletinCount: { fontSize: 14, opacity: 0.6 },
  deleteButton: { padding: 8 },
  bulletinPreview: { marginBottom: 8 },
  previewItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  previewDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
  previewText: { flex: 1, fontSize: 14, opacity: 0.8 },
  previewValue: { fontSize: 14, fontWeight: '600', marginLeft: 8 },
  moreText: { fontSize: 13, opacity: 0.5, marginTop: 4, marginLeft: 14 },
  bulletinFooter: { alignItems: 'flex-end', marginTop: 4 },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyStateIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    opacity: 0.7,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 16,
    alignItems: 'flex-start',
  },
  infoCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoCardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  infoCardText: { fontSize: 14, lineHeight: 20, opacity: 0.8 },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
