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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { useAuth } from '@/context/AuthContext';

// Suprimăm eroarea depreciată specifică pentru a nu bloca rularea
import { LogBox } from 'react-native';
LogBox.ignoreLogs(['Method downloadAsync imported from "expo-file-system" is deprecated']);

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const { width } = Dimensions.get('window');

const RecentAnalysisItem = ({ item, isDark, onPress }: any) => {
  const itemBg = isDark ? '#1C1C1E' : '#FFFFFF';

  return (
    <TouchableOpacity
      style={[styles.recentItem, { backgroundColor: itemBg }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.recentItemContent}>
        <View style={[styles.recentItemIcon, { backgroundColor: '#007AFF20' }]}>
          <MaterialIcons name="assignment" size={20} color="#007AFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.recentItemTitle,
              { color: isDark ? '#FFFFFF' : '#000000' },
            ]}
          >
            {item.analysisType.name}
          </Text>
          <Text style={styles.recentItemDate}>
            {new Date(item.date).toLocaleDateString('ro-RO')}
          </Text>
        </View>
        <View style={styles.recentItemValue}>
          <Text
            style={[
              styles.recentItemValueText,
              { color: isDark ? '#FFFFFF' : '#000000' },
            ]}
          >
            {item.value || item.stringValue}
          </Text>
          {item.analysisType.unit && (
            <Text style={styles.recentItemUnit}>{item.analysisType.unit}</Text>
          )}
        </View>
      </View>
      <MaterialIcons name="chevron-right" size={20} color="#8E8E93" />
    </TouchableOpacity>
  );
};

const HealthCard = ({
  title,
  value,
  unit,
  icon,
  color,
  trend,
  isDark,
}: any) => {
  const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';

  return (
    <View style={[styles.healthCard, { backgroundColor: cardBg }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
          <MaterialIcons name={icon} size={24} color={color} />
        </View>
        {trend !== undefined && trend !== 0 && (
          <View style={styles.trendBadge}>
            <MaterialIcons
              name={trend > 0 ? 'trending-up' : 'trending-down'}
              size={14}
              color={trend > 0 ? '#34C759' : '#FF3B30'}
            />
          </View>
        )}
      </View>
      <Text
        style={[styles.cardTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}
      >
        {title}
      </Text>
      <View style={styles.cardValueContainer}>
        <Text
          style={[styles.cardValue, { color: isDark ? '#FFFFFF' : '#000000' }]}
        >
          {value}
        </Text>
        {unit && (
          <Text
            style={[styles.cardUnit, { color: isDark ? '#8E8E93' : '#8E8E93' }]}
          >
            {unit}
          </Text>
        )}
      </View>
    </View>
  );
};

// ============================================
// COMPONENT BUTON ACȚIUNE RAPIDĂ
// ============================================
const QuickActionButton = ({ icon, label, onPress, color, isDark }: any) => {
  const buttonBg = isDark ? '#2C2C2E' : '#F2F2F7';

  return (
    <TouchableOpacity
      style={[styles.quickActionButton, { backgroundColor: buttonBg }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: `${color}20` }]}>
        <MaterialIcons name={icon} size={28} color={color} />
      </View>
      <Text
        style={[
          styles.quickActionLabel,
          { color: isDark ? '#FFFFFF' : '#000000' },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

export default function HomeScreen() {
  const { token } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [recentAnalyses, setRecentAnalyses] = useState<any[]>([]);
  const [healthSummary, setHealthSummary] = useState<any>(null);
  const [stats, setStats] = useState({
    totalAnalyses: 0,
    thisMonth: 0,
    lastUpdate: null as Date | null,
  });
  
  const fetchDashboardData = useCallback(async () => {
    try {
      const profileRes = await axios.get(`${API_URL}/api/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserData(profileRes.data);

      const analysesRes = await axios.get(`${API_URL}/api/analyses`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const analyses = analysesRes.data;
      // Sortare descrescătoare
      const sorted = analyses.sort(
        (a: any, b: any) =>
          new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      setRecentAnalyses(sorted.slice(0, 5));

      try {
        const summaryRes = await axios.get(`${API_URL}/api/analyses/health-summary`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setHealthSummary(summaryRes.data);
      } catch (err) {
        console.error("Nu am putut incarca scorul de sanatate");
      }

      const now = new Date();
      const thisMonth = analyses.filter((a: any) => {
        const date = new Date(a.date);
        return (
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear()
        );
      }).length;

      setStats({
        totalAnalyses: analyses.length,
        thisMonth,
        lastUpdate: analyses.length > 0 ? new Date(analyses[0].date) : null,
      });
    } catch (error) {
      // Eroare silențioasă - nu afișăm toast la încărcarea dashboard-ului
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [fetchDashboardData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bună dimineața';
    if (hour < 18) return 'Bună ziua';
    return 'Bună seara';
  };

  const calculateBMI = () => {
    if (!userData?.weight || !userData?.height) return null;
    const heightInMeters = userData.height / 100;
    const bmi = userData.weight / (heightInMeters * heightInMeters);
    return bmi.toFixed(1);
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return 'Subponderal';
    if (bmi < 25) return 'Normal';
    if (bmi < 30) return 'Supraponderal';
    return 'Obezitate';
  };

  const handleDownloadPDF = async () => {
    try {
      setIsLoading(true);
      const downloadRes = await FileSystem.downloadAsync(
        `${API_URL}/api/report/generate`,
        FileSystem.documentDirectory + `FisaMedicala.pdf`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      const { uri, status } = downloadRes;

      if (status === 200) {
        if (await Sharing.isAvailableAsync()) {
           await Sharing.shareAsync(uri);
        } else {
           Toast.show({ type: 'success', text1: 'Raport descărcat!', text2: uri, position: 'bottom' });
        }
      } else {
        throw new Error(`Eroare status ${status}`);
      }
    } catch(e: any) {
      console.error('Download err:', e);
      Toast.show({ type: 'error', text1: 'Eroare', text2: e.message || 'Eroare necunoscută', position: 'bottom' });
    } finally {
      setIsLoading(false);
    }
  };

  const containerBg = isDark ? '#000000' : '#F8F9FA';
  const headerGradient = isDark
    ? (['#1C1C1E', '#2C2C2E'] as const)
    : (['#007AFF', '#0051D5'] as const);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: containerBg }]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#007AFF"
          />
        }
      >
        <LinearGradient
          colors={headerGradient}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greetingText}>{getGreeting()}</Text>
              <Text style={styles.userName}>
                {userData?.firstName} {userData?.lastName}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => router.push('/profil')}
            >
              {userData?.profilePicture ? (
                <Image
                  source={{
                    uri: userData.profilePicture.startsWith('http')
                      ? userData.profilePicture
                      : `${API_URL}${userData.profilePicture}`,
                  }}
                  style={styles.profileAvatarImage}
                />
              ) : (
                <View style={styles.profileAvatar}>
                  <Text style={styles.profileInitials}>
                    {userData?.firstName?.[0]}
                    {userData?.lastName?.[0]}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* ... HealthCards & QuickActions... */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { color: isDark ? '#FFFFFF' : '#000000' },
            ]}
          >
            Statistici
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.healthCardsContainer}
          >
            {calculateBMI() && (
              <HealthCard
                title="BMI"
                value={calculateBMI()}
                unit={getBMICategory(parseFloat(calculateBMI()!))}
                icon="monitor-weight"
                color="#FF9500"
                isDark={isDark}
              />
            )}
            <HealthCard
              title="Analize Totale"
              value={stats.totalAnalyses}
              icon="assignment"
              color="#007AFF"
              isDark={isDark}
            />
            <HealthCard
              title="Luna Aceasta"
              value={stats.thisMonth}
              icon="calendar-today"
              color="#34C759"
              trend={stats.thisMonth > 0 ? 1 : 0}
              isDark={isDark}
            />
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { color: isDark ? '#FFFFFF' : '#000000' },
            ]}
          >
            Acțiuni Rapide
          </Text>
          <View style={styles.quickActionsContainer}>
            <QuickActionButton
              icon="add-circle-outline"
              label="Adaugă"
              onPress={() => router.push('/add-analysis')}
              color="#007AFF"
              isDark={isDark}
            />
            <QuickActionButton
              icon="bar-chart"
              label="Grafice"
              onPress={() => router.push('/istoric')}
              color="#5856D6"
              isDark={isDark}
            />
            <QuickActionButton
              icon="history"
              label="Istoric"
              onPress={() => router.push('/istoric')}
              color="#FF9500"
              isDark={isDark}
            />
            <QuickActionButton
              icon="file-upload"
              label="Upload PDF"
              onPress={() => router.push('/adauga')}
              color="#34C759"
              isDark={isDark}
            />
            <QuickActionButton
              icon="savings"
              label="Prețuri"
              onPress={() => router.push('/comparator')}
              color="#FF2D55"
              isDark={isDark}
            />
            <QuickActionButton
              icon="picture-as-pdf"
              label="PDF"
              onPress={handleDownloadPDF}
              color="#000000"
              isDark={isDark}
            />
          </View>
        </View>

        {/* Sumar Sănătate (Mutat între acțiuni rapide și analize recente) */}
        {healthSummary && (
          <View style={styles.section}>
            <Text
              style={[
                styles.sectionTitle,
                { color: isDark ? '#FFFFFF' : '#000000' },
              ]}
            >
              Sumar Sănătate Global
            </Text>
            <View style={[styles.healthSummaryBox, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
              <View style={styles.healthScoreRow}>
                <View style={styles.healthScoreCircle}>
                  <Text style={[styles.healthScoreText, { color: healthSummary.score >= 80 ? '#34C759' : healthSummary.score >= 50 ? '#FF9500' : '#FF3B30' }]}>
                    {healthSummary.score}
                  </Text>
                  <Text style={styles.healthScoreSub}>/100</Text>
                </View>
                <View style={{flex: 1, marginLeft: 15}}>
                  <Text style={[styles.healthScoreLabel, { color: isDark ? '#FFFFFF' : '#000000' }]}>Scorul Tău Global</Text>
                  <Text style={styles.healthScoreDesc}>Bazat pe ultimele tale {healthSummary.metrics?.total || 0} analize unice.</Text>
                </View>
              </View>
              <View style={[styles.healthSummarySeparator, { backgroundColor: isDark ? '#3A3A3C' : '#E5E5EA' }]} />
              <Text style={[styles.healthSummaryText, { color: isDark ? '#EBEBF5' : '#3A3A3C' }]}>
                {healthSummary.summary}
              </Text>
            </View>
          </View>
        )}

        {recentAnalyses.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: isDark ? '#FFFFFF' : '#000000' },
                ]}
              >
                Analize Recente
              </Text>
              <TouchableOpacity onPress={() => router.push('/istoric')}>
                <Text style={styles.seeAllText}>Vezi tot</Text>
              </TouchableOpacity>
            </View>
            {recentAnalyses.map((item) => (
              <RecentAnalysisItem
                key={item.id}
                item={item}
                isDark={isDark}
                onPress={() =>
                  router.push({
                    pathname: '/analiza-detaliu',
                    params: { id: item.id },
                  })
                }
              />
            ))}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  scrollContent: { paddingBottom: 30 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingText: { fontSize: 16, color: '#FFFFFF', opacity: 0.9 },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  profileButton: { padding: 4 },
  profileAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileAvatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileInitials: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  section: { marginBottom: 25 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  seeAllText: { fontSize: 15, color: '#007AFF', fontWeight: '600' },
  healthCardsContainer: { paddingHorizontal: 15 },
  healthCard: {
    width: width * 0.4,
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendBadge: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    padding: 4,
    borderRadius: 8,
  },
  cardTitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 8,
    fontWeight: '600',
  },
  cardValueContainer: { flexDirection: 'row', alignItems: 'baseline' },
  cardValue: { fontSize: 28, fontWeight: 'bold' },
  cardUnit: { fontSize: 12, color: '#8E8E93', marginLeft: 4 },
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 15,
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: (width - 50) / 2,
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickActionLabel: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  recentItemContent: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  recentItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recentItemTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  recentItemDate: { fontSize: 13, color: '#8E8E93' },
  recentItemValue: { alignItems: 'flex-end', marginRight: 10 },
  recentItemValueText: { fontSize: 16, fontWeight: 'bold' },
  recentItemUnit: { fontSize: 12, color: '#8E8E93' },
  tipCard: {
    flexDirection: 'row',
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 16,
    alignItems: 'flex-start',
  },
  tipIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(52, 199, 89, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tipTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  tipText: { fontSize: 14, lineHeight: 20, opacity: 0.8 },
  healthSummaryBox: {
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 0,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  healthScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  healthScoreCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#007AFF15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  healthScoreText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  healthScoreSub: {
    fontSize: 12,
    color: '#8E8E93',
  },
  healthScoreLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  healthScoreDesc: {
    fontSize: 13,
    color: '#8E8E93',
  },
  healthSummarySeparator: {
    height: 1,
    width: '100%',
    marginVertical: 15,
  },
  healthSummaryText: {
    fontSize: 14,
    lineHeight: 20,
  }
});
