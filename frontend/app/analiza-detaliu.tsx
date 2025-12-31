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

export default function AnalysisDetailScreen() {
  const { token } = useAuth();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [isLoading, setIsLoading] = useState(true);
  const [analysis, setAnalysis] = useState<any>(null);

  const analysisId = params.id as string;
  const containerBg = isDark ? '#000000' : '#F8F9FA';
  const textColor = isDark ? '#FFFFFF' : '#000000';

  useEffect(() => {
    if (!analysisId) {
      router.back();
      return;
    }
    fetchAnalysisDetail();
  }, [analysisId]);

  const fetchAnalysisDetail = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/analyses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const found = response.data.find(
        (a: any) => a.id.toString() === analysisId
      );
      if (found) setAnalysis(found);
      else {
        Toast.show({
          type: 'error',
          text1: 'Eroare',
          text2: 'Analiza nu a fost găsită.',
        });
        router.back();
      }
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

  const handleViewChart = () => {
    if (analysis) {
      router.push({
        pathname: '/chart-detaliu',
        params: {
          typeId: analysis.analysisTypeId.toString(),
          typeName: analysis.analysisType.name,
        },
      });
    }
  };

  if (isLoading)
    return (
      <View style={[styles.loadingContainer, { backgroundColor: containerBg }]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  if (!analysis) return null;

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
        <Text style={[styles.headerTitle, { color: textColor }]}>Detalii</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View
          style={[
            styles.card,
            { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
          ]}
        >
          <Text style={[styles.label, { color: '#8E8E93' }]}>Tip Analiză</Text>
          <Text style={[styles.valueLarge, { color: textColor }]}>
            {analysis.analysisType.name}
          </Text>
          <View style={styles.divider} />
          <Text style={[styles.label, { color: '#8E8E93' }]}>Rezultat</Text>
          <Text style={[styles.valueHuge, { color: '#007AFF' }]}>
            {analysis.value || analysis.stringValue}{' '}
            <Text style={{ fontSize: 18, color: textColor }}>
              {' '}
              {analysis.analysisType.unit}
            </Text>
          </Text>
          <View style={styles.divider} />
          <Text style={[styles.label, { color: '#8E8E93' }]}>Data</Text>
          <Text style={[styles.valueNormal, { color: textColor }]}>
            {new Date(analysis.date).toLocaleDateString('ro-RO', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </View>

        <TouchableOpacity style={styles.chartButton} onPress={handleViewChart}>
          <MaterialIcons name="show-chart" size={24} color="#FFF" />
          <Text style={styles.chartButtonText}>Vezi Grafic Evoluție</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  backButton: { marginRight: 20 },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  card: {
    padding: 24,
    borderRadius: 20,
    marginBottom: 24,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  valueLarge: { fontSize: 22, fontWeight: '600', marginBottom: 10 },
  valueHuge: { fontSize: 42, fontWeight: 'bold', marginBottom: 10 },
  valueNormal: { fontSize: 18 },
  divider: { height: 1, backgroundColor: '#E5E5EA', marginVertical: 16 },
  chartButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    shadowColor: '#007AFF',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  chartButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
