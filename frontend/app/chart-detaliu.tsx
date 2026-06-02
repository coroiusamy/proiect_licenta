import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  Dimensions,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const { width } = Dimensions.get('window');

// ============================================
// COMPONENTA: SELECTOR PERIOADĂ
// ============================================
const TimePeriodSelector = ({ selected, onSelect, isDark }: any) => {
  const periods = [
    { label: '1S', value: 7, key: 'week' },
    { label: '1L', value: 30, key: 'month' },
    { label: '3L', value: 90, key: '3months' },
    { label: '6L', value: 180, key: '6months' },
    { label: 'Tot', value: 3650, key: 'all' }, // 10 ani = "Tot"
  ];

  return (
    <View style={styles.periodSelector}>
      {periods.map((period) => {
        const isSelected = selected === period.key;
        const buttonBg = isSelected
          ? '#007AFF'
          : isDark
            ? '#2C2C2E'
            : '#F2F2F7';
        const textColor = isSelected
          ? '#FFFFFF'
          : isDark
            ? '#FFFFFF'
            : '#000000';

        return (
          <TouchableOpacity
            key={period.key}
            style={[styles.periodButton, { backgroundColor: buttonBg }]}
            onPress={() => onSelect(period.key, period.value)}
            activeOpacity={0.7}
          >
            <Text style={[styles.periodButtonText, { color: textColor }]}>
              {period.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// ============================================
// COMPONENTA: CARD STATISTICĂ
// ============================================
const StatCard = ({ label, value, icon, color, isDark }: any) => {
  const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#000000';

  return (
    <View style={[styles.statCard, { backgroundColor: cardBg }]}>
      <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
        <MaterialIcons name={icon} size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
      </View>
    </View>
  );
};

// ============================================
// COMPONENTA: ITEM LISTĂ ISTORIC
// ============================================
const AnalysisItem = ({ item, isDark }: any) => {
  const itemBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#000000';

  return (
    <View style={[styles.analysisItem, { backgroundColor: itemBg }]}>
      <View style={styles.analysisItemContent}>
        <View style={styles.analysisItemLeft}>
          <View
            style={[styles.analysisItemDot, { backgroundColor: '#007AFF' }]}
          />
          <View>
            <Text style={[styles.analysisItemDate, { color: textColor }]}>
              {new Date(item.date).toLocaleDateString('ro-RO', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
            {item.notes && (
              <Text style={styles.analysisItemNotes} numberOfLines={1}>
                {item.notes}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.analysisItemRight}>
          <Text style={[styles.analysisItemValue, { color: textColor }]}>
            {item.value || item.stringValue}
          </Text>
          {item.analysisType?.unit && (
            <Text style={styles.analysisItemUnit}>
              {item.analysisType.unit}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

// ============================================
// ECRAN PRINCIPAL
// ============================================
export default function ChartDetailScreen() {
  const { token } = useAuth();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [isLoading, setIsLoading] = useState(true);
  const [allData, setAllData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);

  const [selectedPeriod, setSelectedPeriod] = useState('all');

  const [treatments, setTreatments] = useState<any[]>([]);
  const [filteredTreatments, setFilteredTreatments] = useState<any[]>([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [newTreatmentName, setNewTreatmentName] = useState('');
  const [newTreatmentDate, setNewTreatmentDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [stats, setStats] = useState({
    latest: 'N/A',
    average: 'N/A',
    min: 'N/A',
    max: 'N/A',
    trend: 0,
  });

  const typeId = params.typeId as string;
  const typeName = params.typeName as string;
  const patientId = params.patientId as string | undefined;

  const containerBg = isDark ? '#000000' : '#F8F9FA';
  const textColor = isDark ? '#FFFFFF' : '#000000';

  // 1. Încărcăm datele
  useEffect(() => {
    if (typeId) {
      fetchData();
    } else {
      router.back();
    }
  }, [typeId]);

  // 2. Când datele se schimbă, recalculăm DEFAULT pe 'all' (3650 zile)
  useEffect(() => {
    processDataByPeriod('all', 3650);
  }, [allData]);

  // Funcție ajutătoare pentru conversie sigură
  const safeParseFloat = (val: any) => {
    if (val === null || val === undefined) return NaN;
    if (typeof val === 'number') return val;
    const strVal = val.toString().replace(',', '.');
    return parseFloat(strVal);
  };

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      let relevantData;

      if (patientId) {
        // Mod medic: preia datele pacientului via endpoint doctor
        const response = await axios.get(
          `${API_URL}/api/doctor/patient/${patientId}/chart/${typeId}`,
          { headers },
        );
        relevantData = response.data;
      } else {
        // Mod pacient: preia propriile analize - acum prin endpoint-ul specific getChartData
        const response = await axios.get(
          `${API_URL}/api/analyses/chart/${typeId}`,
          { headers },
        );
        // Backend-ul returnează acum { results, treatments }
        if (response.data.results) {
          relevantData = response.data.results;
          setTreatments(response.data.treatments || []);
        } else {
          // Fallback dacă încă nu e updatat array-ul
          relevantData = response.data.filter
            ? response.data.filter((item: any) => item.analysisTypeId?.toString() === typeId)
            : response.data;
        }
      }

      const sortedData = relevantData.sort(
        (a: any, b: any) =>
          new Date(a.date).getTime() - new Date(b.date).getTime(),
      );

      setAllData(sortedData);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Eroare',
        text2: 'Nu s-au putut încărca datele pentru grafic.',
      });
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const processDataByPeriod = (periodKey: string, days: number) => {
    setSelectedPeriod(periodKey);

    let dataToProcess = [...allData];

    if (periodKey !== 'all') {
      const now = new Date();
      now.setHours(23, 59, 59, 999);
      const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      dataToProcess = dataToProcess.filter(
        (a) => new Date(a.date) >= cutoffDate,
      );
      
      const filteredTreat = treatments.filter((t) => new Date(t.startDate) >= cutoffDate);
      setFilteredTreatments(filteredTreat);
    } else {
      setFilteredTreatments(treatments);
    }

    setFilteredData(dataToProcess);
    calculateStats(dataToProcess);
  };

  const calculateStats = (data: any[]) => {
    if (data.length === 0) {
      setStats({
        latest: 'N/A',
        average: 'N/A',
        min: 'N/A',
        max: 'N/A',
        trend: 0,
      });
      return;
    }

    const numericValues = data
      .map((item) => safeParseFloat(item.value || item.stringValue))
      .filter((val) => !isNaN(val));

    if (numericValues.length === 0) {
      const lastItem = data[data.length - 1];
      setStats({
        latest: lastItem.stringValue || lastItem.value || 'N/A',
        average: 'N/A',
        min: 'N/A',
        max: 'N/A',
        trend: 0,
      });
      return;
    }

    const latest = numericValues[numericValues.length - 1];
    const min = Math.min(...numericValues);
    const max = Math.max(...numericValues);
    const sum = numericValues.reduce((acc, curr) => acc + curr, 0);
    const avg = sum / numericValues.length;

    let trend = 0;
    if (numericValues.length >= 2) {
      trend = latest > avg ? 1 : latest < avg ? -1 : 0;
    }

    setStats({
      latest: latest.toString(),
      average: avg.toFixed(2),
      min: min.toString(),
      max: max.toString(),
      trend,
    });
  };

  const getChartData = () => {
    const dataForChart = [...filteredData];

    const points = dataForChart
      .map((item) => ({
        label: new Date(item.date).toLocaleDateString('ro-RO', {
          day: 'numeric',
          month: 'short',
        }),
        value: safeParseFloat(item.value || item.stringValue),
      }))
      .filter((p) => !isNaN(p.value));

    if (points.length === 0) return null;

    if (points.length === 1) {
      points.push({ ...points[0] });
    }

    return {
      labels: points.map((p) => p.label),
      datasets: [{ data: points.map((p) => p.value) }],
    };
  };

  const saveTreatment = async () => {
    if (!newTreatmentName.trim()) {
      Toast.show({ type: 'error', text1: 'Eroare', text2: 'Te rugăm introdu numele medicamentului/tratamentului.' });
      return;
    }
    
    try {
      setIsSubmitting(true);
      const response = await axios.post(
        `${API_URL}/api/treatments`,
        {
          name: newTreatmentName,
          startDate: newTreatmentDate.toISOString(),
          analysisTypeId: typeId,
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      Toast.show({ type: 'success', text1: 'Succes', text2: 'Tratament salvat cu succes.' });
      setModalVisible(false);
      setNewTreatmentName('');
      
      // Refresh date
      fetchData();
    } catch(err) {
      Toast.show({ type: 'error', text1: 'Eroare', text2: 'Nu s-a putut salva tratamentul.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteTreatment = async (id: number) => {
    try {
      await axios.delete(`${API_URL}/api/treatments/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Toast.show({ type: 'success', text1: 'Succes', text2: 'Tratament șters cu succes.' });
      fetchData(); // Refresh list&chart
    } catch(err) {
      Toast.show({ type: 'error', text1: 'Eroare', text2: 'Nu s-a putut șterge tratamentul.' });
    }
  };

  const chartData = getChartData();
  const screenWidth = Dimensions.get('window').width;

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: containerBg }]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={[styles.loadingText, { color: textColor }]}>
          Se încarcă datele...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: containerBg }]}
      edges={['top']}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        style={[styles.container, { backgroundColor: containerBg }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: textColor }]}>
              {typeName}
            </Text>
            <Text
              style={[
                styles.headerSubtitle,
                { color: textColor, opacity: 0.6 },
              ]}
            >
              {filteredData.length} înregistrări
            </Text>
          </View>
        </View>

        {/* TIME PERIOD */}
        <TimePeriodSelector
          selected={selectedPeriod}
          onSelect={(key: string, days: number) =>
            processDataByPeriod(key, days)
          }
          isDark={isDark}
        />

        {/* STATS */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <StatCard
              label="Ultima valoare"
              value={stats.latest}
              icon="schedule"
              color="#007AFF"
              isDark={isDark}
            />
            <StatCard
              label="Medie"
              value={stats.average}
              icon="trending-flat"
              color="#5856D6"
              isDark={isDark}
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              label="Minim"
              value={stats.min}
              icon="arrow-downward"
              color="#34C759"
              isDark={isDark}
            />
            <StatCard
              label="Maxim"
              value={stats.max}
              icon="arrow-upward"
              color="#FF3B30"
              isDark={isDark}
            />
          </View>
        </View>

        {/* TREND */}
        {stats.trend !== 0 && (
          <View
            style={[
              styles.trendCard,
              { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
            ]}
          >
            <View
              style={[
                styles.trendIcon,
                {
                  backgroundColor: stats.trend > 0 ? '#FF3B3020' : '#34C75920',
                },
              ]}
            >
              <MaterialIcons
                name={stats.trend > 0 ? 'trending-up' : 'trending-down'}
                size={24}
                color={stats.trend > 0 ? '#FF3B30' : '#34C759'}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.trendTitle, { color: textColor }]}>
                {stats.trend > 0 ? 'Trend Crescător' : 'Trend Descrescător'}
              </Text>
              <Text
                style={[styles.trendText, { color: textColor, opacity: 0.7 }]}
              >
                Valoarea recentă este {stats.trend > 0 ? 'peste' : 'sub'} medie.
              </Text>
            </View>
          </View>
        )}

        {/* CHART */}
        {chartData ? (
          <View style={styles.chartSection}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <Text style={[styles.sectionTitle, { color: textColor, marginBottom: 0 }]}>
                Evoluție Grafică
              </Text>
              {!patientId && ( // Doar pacientii isi adauga tratament in acest flux
                <TouchableOpacity onPress={() => setModalVisible(true)} style={{flexDirection: 'row', alignItems: 'center', backgroundColor: '#007AFF20', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10}}>
                  <MaterialIcons name="add" size={16} color="#007AFF" />
                  <Text style={{color: '#007AFF', fontSize: 12, fontWeight: 'bold', marginLeft: 4}}>Tratament</Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View
                style={[
                  styles.chartContainer,
                  { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                ]}
              >
                <LineChart
                  data={chartData}
                  width={Math.max(width - 40, chartData.labels.length * 60)}
                  height={220}
                  yAxisSuffix=""
                  yAxisInterval={1}
                  chartConfig={{
                    backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                    backgroundGradientFrom: isDark ? '#1C1C1E' : '#FFFFFF',
                    backgroundGradientTo: isDark ? '#1C1C1E' : '#FFFFFF',
                    decimalPlaces: 1,
                    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
                    labelColor: (opacity = 1) =>
                      isDark
                        ? `rgba(255, 255, 255, ${opacity})`
                        : `rgba(0, 0, 0, ${opacity})`,
                    style: { borderRadius: 16 },
                    propsForDots: {
                      r: '5',
                      strokeWidth: '2',
                      stroke: '#007AFF',
                    },
                    propsForBackgroundLines: { strokeDasharray: '' },
                  }}
                  bezier
                  style={{ borderRadius: 16 }}
                  decorator={() => {
                    const dataPoints = chartData.datasets[0].data;
                    if (dataPoints.length < 2 || filteredTreatments.length === 0) return null;
                    const minDate = new Date(filteredData[0].date).getTime();
                    const maxDate = new Date(filteredData[filteredData.length - 1].date).getTime();
                    const timeSpan = maxDate - minDate;

                    if (timeSpan <= 0) return null;
                    
                    const chartWidth = Math.max(width - 40, chartData.labels.length * 60);
                    const paddingLeft = 64; 
                    const paddingRight = 16;
                    const availableWidth = chartWidth - paddingLeft - paddingRight;
                    const step = availableWidth / (filteredData.length - 1);

                    return filteredTreatments.map((t, index) => {
                      const tDate = new Date(t.startDate).getTime();
                      if (tDate >= minDate && tDate <= maxDate) {
                        // Găsim segmentul exact dintre puncte (axele n-au date liniare pe ecran)
                        let indexRatio = 0;
                        for (let i = 0; i < filteredData.length - 1; i++) {
                           const d1 = new Date(filteredData[i].date).getTime();
                           const d2 = new Date(filteredData[i+1].date).getTime();
                           if (tDate >= d1 && tDate <= d2) {
                             const segmentRatio = d2 === d1 ? 0 : (tDate - d1) / (d2 - d1);
                             indexRatio = i + segmentRatio;
                             break;
                           }
                        }
                        
                        const xCoord = paddingLeft + indexRatio * step;
                        
                        return (
                          <View key={index} style={{
                            position: 'absolute',
                            left: xCoord,
                            top: 10,
                            height: 180,
                          }}>
                            {/* Linia de marcaj verticala */}
                            <View style={{
                              width: 2,
                              height: '100%',
                              backgroundColor: '#FF3B30',
                              opacity: 0.7,
                            }} />
                            {/* Container text imbunatatit */}
                            <View style={{
                              position: 'absolute',
                              top: index % 2 === 0 ? 0 : 28, // Alterneaza pentru a preveni suprapunerea
                              left: -50,
                              backgroundColor: '#FF3B30',
                              paddingHorizontal: 8,
                              paddingVertical: 6,
                              borderRadius: 8,
                              width: 100,
                              alignItems: 'center',
                              shadowColor: "#000",
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.3,
                              shadowRadius: 3,
                              elevation: 4,
                            }}>
                              <Text 
                                style={{ fontSize: 11, color: 'white', fontWeight: 'bold', textAlign: 'center' }} 
                                numberOfLines={2}
                              >
                                {t.name}
                              </Text>
                            </View>
                          </View>
                        );
                      }
                      return null;
                    });
                  }}
                />
              </View>
            </ScrollView>
          </View>
        ) : (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ color: '#8E8E93', textAlign: 'center' }}>
              Nu există suficiente date numerice pentru grafic.
            </Text>
          </View>
        )}

        {/* LISTĂ TRATAMENTE */}
        {filteredTreatments.length > 0 && (
          <View style={[styles.listSection, { marginBottom: 15 }]}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              Tratamente Adăugate
            </Text>
            {filteredTreatments.map((t, index) => (
              <View 
                key={t.id ?? `treat-${index}`} 
                style={{
                  flexDirection: 'row', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                  padding: 16,
                  borderRadius: 12,
                  marginBottom: 10,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  elevation: 2,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: textColor, marginBottom: 4 }}>{t.name}</Text>
                  <Text style={{ fontSize: 13, color: '#8E8E93' }}>
                    Din {new Date(t.startDate).toLocaleDateString('ro-RO')}
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={() => deleteTreatment(t.id)}
                  style={{ padding: 8 }}
                >
                  <MaterialIcons name="delete-outline" size={24} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* LIST */}
        <View style={styles.listSection}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            Istoric Detaliat
          </Text>
          {/* Afișăm invers cronologic (cel mai recent sus) */}
          {[...filteredData].reverse().map((item, index) => (
            <AnalysisItem
              key={item.id ?? `item-${index}`}
              item={item}
              isDark={isDark}
            />
          ))}
        </View>

        {/* MODAL ADĂUGARE TRATAMENT */}
        <Modal visible={modalVisible} transparent={true} animationType="slide">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: isDark ? '#1C1C1E' : '#FFF', width: '90%', borderRadius: 16, padding: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: textColor }}>Adaugă Tratament Nou</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <MaterialIcons name="close" size={24} color="#8E8E93" />
                </TouchableOpacity>
              </View>

              <Text style={{ color: textColor, marginBottom: 8, fontSize: 14 }}>Nume Medicament / Tratament</Text>
              <TextInput
                style={{ backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7', color: textColor, borderRadius: 8, padding: 12, marginBottom: 20 }}
                placeholder="Ex: Vitamina D 2000 UI"
                placeholderTextColor="#8E8E93"
                value={newTreatmentName}
                onChangeText={setNewTreatmentName}
              />

              <Text style={{ color: textColor, marginBottom: 8, fontSize: 14 }}>Data Începerii</Text>
              <TouchableOpacity
                style={{ backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7', borderRadius: 8, padding: 12, marginBottom: 20 }}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={{ color: textColor }}>{newTreatmentDate.toLocaleDateString('ro-RO')}</Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={newTreatmentDate}
                  mode="date"
                  display="default"
                  maximumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) setNewTreatmentDate(selectedDate);
                  }}
                />
              )}

              <TouchableOpacity
                style={{ backgroundColor: '#007AFF', padding: 15, borderRadius: 10, alignItems: 'center' }}
                onPress={saveTreatment}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>Salvează pe Grafic</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
  },
  backButton: { marginRight: 15, padding: 5 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 2 },
  headerSubtitle: { fontSize: 14, opacity: 0.7 },
  periodSelector: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 3,
    alignItems: 'center',
  },
  periodButtonText: { fontSize: 14, fontWeight: '600' },
  statsContainer: { paddingHorizontal: 20, marginBottom: 20 },
  statsRow: { flexDirection: 'row', marginBottom: 10 },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginHorizontal: 5,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  statLabel: { fontSize: 11, opacity: 0.6, marginBottom: 2, color: '#8E8E93' },
  statValue: { fontSize: 18, fontWeight: 'bold' },
  trendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  trendIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  trendTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  trendText: { fontSize: 14 },
  chartSection: { paddingHorizontal: 20, marginBottom: 25 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  chartContainer: {
    borderRadius: 16,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  listSection: { paddingHorizontal: 20 },
  analysisItem: {
    padding: 16,
    marginBottom: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  analysisItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  analysisItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  analysisItemDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  analysisItemDate: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  analysisItemNotes: { fontSize: 13, opacity: 0.6, color: '#8E8E93' },
  analysisItemRight: { alignItems: 'flex-end' },
  analysisItemValue: { fontSize: 18, fontWeight: 'bold' },
  analysisItemUnit: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
    color: '#8E8E93',
  },
});
