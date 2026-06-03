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
  const [isAILoading, setIsAILoading] = useState(false);

  const analysisId = params.id as string;
  const containerBg = isDark ? '#000000' : '#F8F9FA';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';

  // Calculăm procentul pentru acul indicator al graficului
  const getGaugePosition = () => {
    if (!analysis || analysis.value === null || analysis.analysisType.refMin === null || analysis.analysisType.refMax === null) {
      return 50;
    }
    const val = analysis.value;
    const min = analysis.analysisType.refMin;
    const max = analysis.analysisType.refMax;

    if (val < min) {
      const ratio = min > 0 ? val / min : 0.5;
      return Math.max(5, Math.min(28, 5 + ratio * 23));
    } else if (val > max) {
      const excessRatio = max > 0 ? (val - max) / max : 0.5;
      return Math.min(95, Math.max(72, 72 + Math.min(excessRatio, 1) * 23));
    } else {
      const range = max - min;
      const ratio = range > 0 ? (val - min) / range : 0.5;
      return Math.max(32, Math.min(68, 32 + ratio * 36));
    }
  };

  const positionPercent = getGaugePosition();
  const hasGauge = analysis && analysis.value !== null && analysis.analysisType.refMin !== null && analysis.analysisType.refMax !== null;

  useEffect(() => {
    if (!analysisId) {
      router.back();
      return;
    }
    fetchAnalysisDetail();
  }, [analysisId]);

  // Polling pentru AI - verifică la fiecare 3 secunde dacă s-a generat
  useEffect(() => {
    if (!analysis || analysis.aiAdvice) return; // Deja are sau nu e încărcat

    setIsAILoading(true);
    const pollInterval = setInterval(async () => {
      try {
        const response = await axios.get(`${API_URL}/api/analyses`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const updated = response.data.find(
          (a: any) => a.id.toString() === analysisId,
        );

        if (updated && updated.aiAdvice) {
          setAnalysis(updated);
          setIsAILoading(false);
          clearInterval(pollInterval);

          Toast.show({
            type: 'success',
            text1: '🤖 Recomandări AI gata!',
            visibilityTime: 2000,
          });
        }
      } catch (error) {
        // Eroare silențioasă la polling - se va reîncerca
      }
    }, 3000); // La fiecare 3 secunde

    // Stop după 30 secunde (10 încercări)
    const timeout = setTimeout(() => {
      clearInterval(pollInterval);
      setIsAILoading(false);
    }, 30000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [analysis]);

  const fetchAnalysisDetail = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/analyses`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const found = response.data.find(
        (a: any) => a.id.toString() === analysisId,
      );

      if (found) {
        setAnalysis(found);
      } else {
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

  const getStatusColor = (status: string) => {
    if (status === 'low') return '#FF9500';
    if (status === 'high') return '#FF3B30';
    return '#34C759';
  };

  const getStatusText = (status: string) => {
    if (status === 'low') return 'Scăzut';
    if (status === 'high') return 'Crescut';
    return 'Normal';
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
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: textColor }]}>
            Detalii Analiză
          </Text>
          <Text style={[styles.headerSubtitle, { color: textColor }]}>
            {analysis?.analysisType?.name || 'Se încarcă...'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {/* CARD PRINCIPAL */}
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={[styles.label, { color: '#8E8E93' }]}>Tip Analiză</Text>
          <Text style={[styles.valueLarge, { color: textColor }]}>
            {analysis.analysisType.name}
          </Text>

          <View style={styles.divider} />

          <Text style={[styles.label, { color: '#8E8E93' }]}>Rezultat</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={[styles.valueHuge, { color: '#007AFF' }]}>
              {analysis.value || analysis.stringValue}
            </Text>
            <Text
              style={{
                fontSize: 18,
                color: textColor,
                marginLeft: 8,
                fontWeight: '500',
              }}
            >
              {analysis.analysisType.unit}
            </Text>
          </View>

          {analysis.status && (
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(analysis.status) + '15' },
              ]}
            >
              <MaterialIcons
                name={analysis.status === 'normal' ? 'check-circle-outline' : 'info-outline'}
                size={16}
                color={getStatusColor(analysis.status)}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(analysis.status) },
                ]}
              >
                {getStatusText(analysis.status)}
              </Text>
            </View>
          )}

          {hasGauge && (
            <View style={styles.gaugeContainer}>
              <View style={styles.gaugeLabels}>
                <Text style={[styles.gaugeLabel, { color: isDark ? '#8E8E93' : '#666' }]}>Scăzut</Text>
                <Text style={[styles.gaugeLabel, { fontWeight: '700', color: '#34C759' }]}>Optim</Text>
                <Text style={[styles.gaugeLabel, { color: isDark ? '#8E8E93' : '#666' }]}>Crescut</Text>
              </View>
              
              <View style={[styles.gaugeTrack, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA70' }]}>
                {/* Low zone */}
                <View style={[styles.gaugeZone, { width: '30%', backgroundColor: '#FF950020', borderTopLeftRadius: 6, borderBottomLeftRadius: 6 }]} />
                {/* Normal zone */}
                <View style={[styles.gaugeZone, { width: '40%', backgroundColor: '#34C75920' }]} />
                {/* High zone */}
                <View style={[styles.gaugeZone, { width: '30%', backgroundColor: '#FF3B3020', borderTopRightRadius: 6, borderBottomRightRadius: 6 }]} />
                
                {/* Dashed boundary markers */}
                <View style={[styles.gaugeMarker, { left: '30%', borderColor: isDark ? '#3A3A3C' : '#E5E5EA' }]} />
                <View style={[styles.gaugeMarker, { left: '70%', borderColor: isDark ? '#3A3A3C' : '#E5E5EA' }]} />

                {/* Indicator cursor */}
                <View style={[styles.gaugeIndicator, { left: `${positionPercent}%`, backgroundColor: getStatusColor(analysis.status) }]}>
                  <View style={styles.gaugeIndicatorInner} />
                </View>
              </View>

              <View style={styles.gaugeValues}>
                <Text style={[styles.gaugeValueText, { color: isDark ? '#8E8E93' : '#8E8E93' }]}>
                  {analysis.analysisType.refMin} {analysis.analysisType.unit}
                </Text>
                <Text style={[styles.gaugeValueText, { color: isDark ? '#8E8E93' : '#8E8E93' }]}>
                  {analysis.analysisType.refMax} {analysis.analysisType.unit}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.divider} />

          <Text style={[styles.label, { color: '#8E8E93' }]}>Data</Text>
          <Text style={[styles.valueNormal, { color: textColor }]}>
            {new Date(analysis.date).toLocaleDateString('ro-RO', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>

          {analysis.notes && (
            <>
              <View style={styles.divider} />
              <Text style={[styles.label, { color: '#8E8E93' }]}>Notițe</Text>
              <Text
                style={[styles.valueNormal, { color: textColor, fontSize: 16 }]}
              >
                {analysis.notes}
              </Text>
            </>
          )}
        </View>

        {/* AI CARD - 3 STĂRI */}
        {isAILoading ? (
          // STAREA 1: Se generează
          <View
            style={[
              styles.aiCard,
              {
                backgroundColor: isDark ? '#1E2D3D' : '#FFF9E6',
                borderColor: '#FF950030',
                borderWidth: 1,
              },
            ]}
          >
            <View style={styles.aiHeader}>
              <ActivityIndicator size="small" color="#FF9500" />
              <Text
                style={[
                  styles.aiTitle,
                  { color: isDark ? '#FFC947' : '#FF9500', marginLeft: 10 },
                ]}
              >
                AI generează recomandări...
              </Text>
            </View>
            <Text
              style={[
                styles.aiText,
                { color: isDark ? '#E3F2FD' : '#666', fontSize: 14 },
              ]}
            >
              Analizăm rezultatul tău și căutăm cele mai bune sfaturi
              personalizate.
            </Text>
          </View>
        ) : analysis.aiAdvice ? (
          // STAREA 2: Generat cu succes
          <View
            style={[
              styles.aiCard,
              {
                backgroundColor: isDark ? '#1E2D3D' : '#F0F8FF',
                borderColor: '#007AFF30',
                borderWidth: 1,
              },
            ]}
          >
            <View style={styles.aiHeader}>
              <View style={styles.aiIconContainer}>
                <MaterialIcons name="auto-awesome" size={20} color="#007AFF" />
              </View>
              <Text
                style={[
                  styles.aiTitle,
                  { color: isDark ? '#90CAF9' : '#0056b3' },
                ]}
              >
                Recomandări Personalizate
              </Text>
            </View>
            <Text
              style={[styles.aiText, { color: isDark ? '#E3F2FD' : '#2C3E50' }]}
            >
              {analysis.aiAdvice}
            </Text>
          </View>
        ) : null}

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
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 15 },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 2 },
  headerSubtitle: { fontSize: 14, opacity: 0.7 },

  card: {
    padding: 24,
    borderRadius: 24,
    marginBottom: 20,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  label: {
    fontSize: 13,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  valueLarge: { fontSize: 22, fontWeight: '700', marginBottom: 5 },
  valueHuge: { fontSize: 48, fontWeight: '800', letterSpacing: -1 },
  valueNormal: { fontSize: 18, fontWeight: '500' },
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA20',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    marginVertical: 16,
    opacity: 0.5,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 4,
  },
  statusText: { marginLeft: 6, fontWeight: 'bold', fontSize: 14 },

  aiCard: { padding: 20, borderRadius: 20, marginBottom: 24 },
  aiHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  aiIconContainer: { marginRight: 10 },
  aiTitle: { fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  aiText: { fontSize: 16, lineHeight: 24, fontWeight: '400' },

  chartButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
    borderRadius: 18,
    shadowColor: '#007AFF',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  chartButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 8,
  },

  // Graphical reference gauge styles
  gaugeContainer: {
    marginTop: 20,
    marginBottom: 8,
    width: '100%',
  },
  gaugeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  gaugeLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.8,
  },
  gaugeTrack: {
    height: 12,
    borderRadius: 6,
    flexDirection: 'row',
    position: 'relative',
    overflow: 'visible',
    alignItems: 'center',
  },
  gaugeZone: {
    height: '100%',
  },
  gaugeMarker: {
    position: 'absolute',
    height: '100%',
    borderLeftWidth: 1,
    borderStyle: 'dashed',
    opacity: 0.6,
  },
  gaugeIndicator: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    marginLeft: -10, // Center the cursor on the percentage value
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  gaugeIndicatorInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  gaugeValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: '25%', // Align roughly with the 30% and 70% zones
  },
  gaugeValueText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
