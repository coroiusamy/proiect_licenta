import React, { useMemo, useState, useEffect } from 'react';
import {
  StyleSheet,
  FlatList,
  View,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
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
  refMin?: number | null;
  refMax?: number | null;
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

  const [allResults, setAllResults] = useState<AnalysisResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch ALL results when the screen loads (inefficient, replace later)
  useEffect(() => {
    const fetchAllResults = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const response = await axios.get(`${API_URL}/api/analyses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAllResults(response.data);
      } catch (error) {
        console.error('Failed to fetch results for detail screen', error);
        let message = 'Nu am putut reîncărca datele.';
        let shouldLogout = false;
        if (isAxiosError(error) && error.response?.status === 401) {
          message = 'Sesiunea a expirat. Te rugăm să te re-loghezi.';
          shouldLogout = true;
        }
        Toast.show({ type: 'error', text1: 'Eroare', text2: message });
        if (shouldLogout) {
          logout();
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllResults();
  }, [token, logout]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const resultsForThisDate = useMemo(() => {
    if (!params.displayDate || allResults.length === 0) {
      return [];
    }
    return allResults.filter(
      (result) => formatDate(result.date) === params.displayDate
    );
  }, [params.displayDate, allResults]);

  const renderValue = (item: AnalysisResult) => {
    if (item.value !== null && item.value !== undefined) {
      return `${item.value} ${item.analysisType.unit}`;
    }
    if (item.stringValue) {
      return item.stringValue;
    }
    return 'N/A';
  };

  const itemSeparatorStyle = {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colorScheme === 'dark' ? '#444' : '#ccc',
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{ title: params.displayDate || 'Detalii Analize' }}
      />

      <ThemedView style={styles.container}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
          </View>
        ) : resultsForThisDate.length === 0 ? (
          <ThemedText style={styles.emptyText}>
            Nu s-au găsit analize pentru această dată.
          </ThemedText>
        ) : (
          <FlatList
            data={resultsForThisDate}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={[styles.itemContainer, itemSeparatorStyle]}>
                <ThemedView style={styles.itemHeader}>
                  <ThemedText style={styles.itemName}>
                    {item.analysisType.name}
                  </ThemedText>
                </ThemedView>
                <ThemedText style={styles.itemValue}>
                  {renderValue(item)}
                </ThemedText>
                {item.notes && (
                  <ThemedText style={styles.itemNotes}>
                    Notițe: {item.notes}
                  </ThemedText>
                )}
              </View>
            )}
            ListHeaderComponent={<View style={{ height: 10 }} />}
            ListFooterComponent={<View style={{ height: 10 }} />}
          />
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: 'gray',
  },
  itemContainer: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: 'transparent',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  itemName: { fontSize: 16, fontWeight: 'bold', flex: 1, marginRight: 10 },
  itemValue: { fontSize: 15, marginBottom: 8 },
  itemNotes: { fontSize: 13, color: 'gray', fontStyle: 'italic' },
});
