import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function BulletinDetailScreen() {
  const { token } = useAuth();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [isLoading, setIsLoading] = useState(true);
  const [analyses, setAnalyses] = useState<any[]>([]);

  const bulletinDate = params.date as string;
  const containerBg = isDark ? '#000000' : '#F8F9FA';
  const textColor = isDark ? '#FFFFFF' : '#000000';

  useEffect(() => {
    if (!bulletinDate) {
      router.back();
      return;
    }
    fetchAnalyses();
  }, [bulletinDate]);

  const fetchAnalyses = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/analyses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Filtram analizele din ziua respectiva
      const filtered = response.data.filter(
        (a: any) =>
          new Date(a.date).toDateString() ===
          new Date(bulletinDate).toDateString(),
      );
      setAnalyses(filtered);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Eroare',
        text2: 'Nu s-au putut încărca datele.',
      });
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalysisPress = (analysis: any) => {
    router.push({
      pathname: '/analiza-detaliu',
      params: { id: analysis.id },
    });
  };

  const dateLabel = bulletinDate
    ? new Date(bulletinDate).toLocaleDateString('ro-RO', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

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
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: textColor }]}>
            Buletin {dateLabel}
          </Text>
          <Text style={[styles.headerSubtitle, { color: textColor }]}>
            {analyses.length} analize
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ padding: 20 }}
      >
        {analyses.map((analysis) => (
          <TouchableOpacity
            key={analysis.id}
            style={[
              styles.card,
              { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
            ]}
            onPress={() => handleAnalysisPress(analysis)}
          >
            <View
              style={[styles.iconContainer, { backgroundColor: '#007AFF20' }]}
            >
              <MaterialIcons name="science" size={24} color="#007AFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.analysisName, { color: textColor }]}>
                {analysis.analysisType.name}
              </Text>
              <Text style={[styles.analysisValue, { color: textColor }]}>
                {analysis.value || analysis.stringValue}{' '}
                <Text style={{ fontSize: 12, color: '#8E8E93' }}>
                  {analysis.analysisType.unit}
                </Text>
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#8E8E93" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 15 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 2 },
  headerSubtitle: { fontSize: 14, opacity: 0.7 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  analysisName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  analysisValue: { fontSize: 15, fontWeight: 'bold' },
});
