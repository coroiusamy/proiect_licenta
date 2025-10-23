import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  FlatList,
  ActivityIndicator,
  useColorScheme,
  TouchableOpacity,
  View,
} from 'react-native';
import axios, { isAxiosError } from 'axios';
import Toast from 'react-native-toast-message';
import { useFocusEffect, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

type AnalysisResult = {
  id: number;
  value?: number | null;
  stringValue?: string | null;
  date: string;
  notes?: string | null;
  analysisType: any;
};

export default function IstoricScreen() {
  const { token, logout } = useAuth();
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const colorScheme = useColorScheme();

  const fetchResults = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      if (results.length === 0) {
        setIsLoading(true);
      }
      const response = await axios.get(`${API_URL}/api/analyses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const sortedResults = response.data.sort(
        (a: AnalysisResult, b: AnalysisResult) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setResults(sortedResults);
    } catch (error) {
      let message = 'Nu am putut încărca istoricul.';
      let shouldLogout = false;
      if (isAxiosError(error) && error.response?.status === 401) {
        message = 'Sesiunea a expirat. Te rugăm să te re-loghezi.';
        shouldLogout = true;
      }
      Toast.show({ type: 'error', text1: 'Eroare Încărcare', text2: message });
      if (shouldLogout) {
        logout();
      }
    } finally {
      setIsLoading(false);
    }
  }, [token, logout, results.length]);

  // --- Auto-Refresh Trigger ---
  useFocusEffect(
    useCallback(() => {
      fetchResults();
    }, [fetchResults])
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const uniqueDates = useMemo(() => {
    const dates = new Set<string>();
    results.forEach((result) => {
      dates.add(formatDate(result.date));
    });
    return Array.from(dates);
  }, [results]);

  // --- Functia de navigare la detalii ---
  const handleDatePress = (formattedDate: string) => {
    router.push({
      pathname: '/istoric-detaliu' as any,
      params: { displayDate: formattedDate },
    });
  };

  const itemSeparatorStyle = {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colorScheme === 'dark' ? '#444' : '#ccc',
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <ThemedText>Se încarcă...</ThemedText>
      </ThemedView>
    );
  }
  if (results.length === 0) {
    return (
      <ThemedView style={styles.emptyContainer}>
        <ThemedText>Nu ai analize.</ThemedText>
        <ThemedText>Apasă pe „Home”...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <FlatList
          data={uniqueDates}
          keyExtractor={(item) => item}
          renderItem={({ item: date }) => (
            <TouchableOpacity
              style={[styles.itemContainer, itemSeparatorStyle]}
              onPress={() => handleDatePress(date)}
            >
              <ThemedText style={styles.itemDateText}>{date}</ThemedText>
            </TouchableOpacity>
          )}
          ListHeaderComponent={<View style={{ height: 10 }} />}
        />
      </ThemedView>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    textAlign: 'center',
  },
  itemContainer: {
    paddingVertical: 18,
    paddingHorizontal: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemDateText: {
    fontSize: 17,
    fontWeight: '500',
  },
});
