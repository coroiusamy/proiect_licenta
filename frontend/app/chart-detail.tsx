import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  useColorScheme,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios, { isAxiosError } from 'axios';
import Toast from 'react-native-toast-message';
import { LineChart } from 'react-native-chart-kit';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

type ChartDataPoint = {
  date: string;
  value: number;
};

export default function ChartDetailScreen() {
  const params = useLocalSearchParams<{ typeId?: string; typeName?: string }>();
  const { token, logout } = useAuth();
  const colorScheme = useColorScheme();
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);

  useEffect(() => {
    const fetchChartData = async () => {
      if (!token || !params.typeId) {
        setIsLoading(false);
        Toast.show({
          type: 'error',
          text1: 'Eroare',
          text2: 'Lipsesc informații necesare.',
        });
        return;
      }
      setIsLoading(true);
      try {
        const response = await axios.get(
          `${API_URL}/api/analyses/chart/${params.typeId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setChartData(response.data);
      } catch (error) {
        let message = 'Nu am putut încărca datele graficului.';
        let shouldLogout = false;
        if (isAxiosError(error) && error.response?.status === 401) {
          message = 'Sesiunea a expirat.';
          shouldLogout = true;
        }
        Toast.show({
          type: 'error',
          text1: 'Eroare Încărcare',
          text2: message,
        });
        if (shouldLogout) {
          logout();
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchChartData();
  }, [token, params.typeId, logout]);

  const formatDataForChart = () => {
    if (chartData.length === 0) {
      return { labels: [], datasets: [{ data: [] }] };
    }
    const labels = chartData.map((point) => {
      const date = new Date(point.date);
      return `${date.getDate().toString().padStart(2, '0')}.${(
        date.getMonth() + 1
      )
        .toString()
        .padStart(2, '0')}`;
    });
    const data = chartData.map((point) => point.value);
    return {
      labels: labels,
      datasets: [
        {
          data: data,
          color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
          strokeWidth: 2,
        },
      ],
      legend: [params.typeName || 'Evoluție'],
    };
  };

  const chartConfig = {
    backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#ffffff',
    backgroundGradientFrom: colorScheme === 'dark' ? '#2c2c2e' : '#f0f0f0',
    backgroundGradientTo: colorScheme === 'dark' ? '#2c2c2e' : '#f0f0f0',
    decimalPlaces: 1,
    color: (opacity = 1) =>
      colorScheme === 'dark'
        ? `rgba(255, 255, 255, ${opacity})`
        : `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) =>
      colorScheme === 'dark'
        ? `rgba(150, 150, 150, ${opacity})`
        : `rgba(100, 100, 100, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: {
      r: '4',
      strokeWidth: '1',
      stroke: colorScheme === 'dark' ? '#555' : '#ccc',
    },
  };

  const screenWidth = Dimensions.get('window').width;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: params.typeName || 'Grafic Analiză' }} />

      <ScrollView style={styles.scrollView}>
        <ThemedView style={styles.container}>
          {isLoading ? (
            <ActivityIndicator size="large" style={styles.loader} />
          ) : chartData.length < 2 ? (
            <ThemedText style={styles.emptyText}>
              Nu există suficiente date pentru a genera un grafic.
            </ThemedText>
          ) : (
            <>
              {/* Graficul */}
              <View style={styles.chartWrapper}>
                <LineChart
                  data={formatDataForChart()}
                  width={screenWidth - 30}
                  height={250}
                  chartConfig={chartConfig}
                  bezier
                  style={styles.chartStyle}
                />

                {/* Overlay cu butoane invizibile pentru fiecare punct */}
                <View style={styles.pointsOverlay}>
                  {chartData.map((_, index) => {
                    const xPosition =
                      50 +
                      (index / (chartData.length - 1)) * (screenWidth - 110);

                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.pointTouchArea,
                          { left: xPosition - 20 },
                        ]}
                        onPress={() => setSelectedPoint(index)}
                      />
                    );
                  })}
                </View>

                {/* Tooltip cu protecție pentru margini */}
                {selectedPoint !== null &&
                  chartData[selectedPoint] &&
                  (() => {
                    const totalPoints = chartData.length - 1;
                    const basePosition =
                      50 + (selectedPoint / totalPoints) * (screenWidth - 110);

                    let tooltipLeft = basePosition - 60; // Centrat pe punct

                    // prea aproape dreapta
                    if (tooltipLeft + 120 > screenWidth - 20) {
                      tooltipLeft = screenWidth - 140;
                    }

                    // prea aproape stanga
                    if (tooltipLeft < 10) {
                      tooltipLeft = 10;
                    }

                    return (
                      <View style={[styles.tooltip, { left: tooltipLeft }]}>
                        <ThemedText style={styles.tooltipDate}>
                          {new Date(
                            chartData[selectedPoint].date
                          ).toLocaleDateString('ro-RO', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </ThemedText>
                        <ThemedText style={styles.tooltipValue}>
                          {chartData[selectedPoint].value}
                        </ThemedText>
                        <TouchableOpacity
                          style={styles.tooltipClose}
                          onPress={() => setSelectedPoint(null)}
                        >
                          <ThemedText style={styles.tooltipCloseText}>
                            ✕
                          </ThemedText>
                        </TouchableOpacity>
                      </View>
                    );
                  })()}
              </View>

              {/* Lista de valori */}
              <ThemedView style={styles.valuesContainer}>
                <ThemedText style={styles.valuesTitle}>
                  Valori Înregistrate:
                </ThemedText>
                {chartData.map((point, index) => {
                  const date = new Date(point.date);
                  const formattedDate = date.toLocaleDateString('ro-RO', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  });
                  return (
                    <ThemedView key={index} style={styles.valueRow}>
                      <ThemedText style={styles.valueDate}>
                        {formattedDate}
                      </ThemedText>
                      <ThemedText style={styles.valueNumber}>
                        {point.value}
                      </ThemedText>
                    </ThemedView>
                  );
                })}
              </ThemedView>
            </>
          )}
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollView: { flex: 1 },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 40,
  },
  loader: { marginTop: 50 },
  emptyText: {
    marginTop: 50,
    fontSize: 16,
    color: 'gray',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  chartWrapper: {
    position: 'relative',
    marginBottom: 20,
  },
  chartStyle: { marginVertical: 8, borderRadius: 16 },
  pointsOverlay: {
    position: 'absolute',
    top: 60,
    bottom: 40,
    left: 0,
    right: 0,
  },
  pointTouchArea: {
    position: 'absolute',
    width: 40,
    height: 160,
    top: 0,
  },
  tooltip: {
    position: 'absolute',
    top: 20,
    backgroundColor: 'rgba(0, 122, 255, 0.95)',
    padding: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    borderBottomWidth: 0,
  },
  tooltipDate: {
    fontSize: 12,
    color: '#FFFFFF',
    marginBottom: 4,
    fontWeight: '500',
  },
  tooltipValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  tooltipClose: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tooltipCloseText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  valuesContainer: {
    width: '90%',
    marginTop: 30,
    padding: 16,
    borderRadius: 12,
  },
  valuesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#444',
  },
  valueDate: {
    fontSize: 15,
  },
  valueNumber: {
    fontSize: 15,
    fontWeight: '600',
  },
});
