import React, { useMemo, useState, useEffect } from 'react';
import {
  StyleSheet,
  FlatList,
  View,
  useColorScheme,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios, { isAxiosError } from 'axios';
import Toast from 'react-native-toast-message';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

type AnalysisType = {
  id: number;
  name: string;
  unit: string;
};

type AnalysisResult = {
  id: number;
  value?: number | null;
  stringValue?: string | null;
  date: string;
  notes?: string | null;
  analysisType: AnalysisType;
};

export default function IstoricDetaliuScreen() {
  const params = useLocalSearchParams<{ displayDate?: string }>();
  const { token, logout } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [allResults, setAllResults] = useState<AnalysisResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- 1. Fetch Data ---
  useEffect(() => {
    if (!token) return;

    const fetchAllResults = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(`${API_URL}/api/analyses`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Sortăm alfabetic după nume
        const sortedData = response.data.sort(
          (a: AnalysisResult, b: AnalysisResult) =>
            a.analysisType.name.localeCompare(b.analysisType.name)
        );
        setAllResults(sortedData);
      } catch (error) {
        let message = 'Nu am putut încărca datele.';
        if (isAxiosError(error) && error.response?.status === 401) {
          logout();
        } else {
          Toast.show({ type: 'error', text1: 'Eroare', text2: message });
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllResults();
  }, [token, logout]);

  // --- 2. filtrare dupa data ---
  const resultsForThisDate = useMemo(() => {
    if (!params.displayDate || allResults.length === 0) return [];

    return allResults.filter((result) => {
      const formattedDate = new Date(result.date).toLocaleDateString('ro-RO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      return formattedDate === params.displayDate;
    });
  }, [params.displayDate, allResults]);

  // --- 3. Render Helpers ---
  const renderValue = (item: AnalysisResult) => {
    if (item.value != null) return `${item.value} ${item.analysisType.unit}`;
    return item.stringValue || 'N/A';
  };

  const handlePressItem = (item: AnalysisResult) => {
    router.push({
      pathname: '/chart-detail',
      params: {
        typeId: item.analysisType.id,
        typeName: item.analysisType.name,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{ title: params.displayDate || 'Detalii Analize' }}
      />

      <ThemedView style={styles.container}>
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : resultsForThisDate.length === 0 ? (
          <View style={styles.centerContainer}>
            <ThemedText style={styles.emptyText}>
              Nu s-au găsit analize pentru această dată.
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={resultsForThisDate}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => (
              <View
                style={[
                  styles.separator,
                  { backgroundColor: isDark ? '#444' : '#eee' },
                ]}
              />
            )}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handlePressItem(item)}
                activeOpacity={0.7}
              >
                <View style={styles.itemContainer}>
                  <View style={styles.itemContent}>
                    <View style={styles.itemHeader}>
                      <ThemedText style={styles.itemName}>
                        {item.analysisType.name}
                      </ThemedText>
                      <ThemedText style={styles.itemValue}>
                        {renderValue(item)}
                      </ThemedText>
                    </View>

                    {item.notes && (
                      <ThemedText style={styles.itemNotes}>
                        Note: {item.notes}
                      </ThemedText>
                    )}
                  </View>

                  {/* Săgeată dreapta pentru a indica navigare */}
                  <ThemedText style={styles.chevron}>›</ThemedText>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  listContent: {
    paddingVertical: 10,
  },
  emptyText: {
    fontSize: 16,
    color: 'gray',
    textAlign: 'center',
  },
  separator: {
    height: 1,
    marginLeft: 15,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
  },
  itemValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  itemNotes: {
    fontSize: 13,
    color: 'gray',
    fontStyle: 'italic',
    marginTop: 2,
  },
  chevron: {
    fontSize: 24,
    color: '#C7C7CC',
    marginLeft: 10,
    fontWeight: '300',
  },
});
