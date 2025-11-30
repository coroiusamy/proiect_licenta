import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  FlatList,
  ActivityIndicator,
  useColorScheme,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import axios, { isAxiosError } from 'axios';
import Toast from 'react-native-toast-message';
import { useFocusEffect, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

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

  // --- Format Date ---
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // --- date unice ---
  const uniqueDates = useMemo(() => {
    const dates = new Set<string>();
    results.forEach((result) => {
      dates.add(formatDate(result.date));
    });
    return Array.from(dates);
  }, [results]);

  // --- Detail Screen Navigation ---
  const handleDatePress = (formattedDate: string) => {
    const originalDate = results.find(
      (r) => formatDate(r.date) === formattedDate
    )?.date;
    if (originalDate) {
      router.push({
        pathname: '/istoric-detaliu' as any,
        params: { displayDate: formattedDate, date: originalDate },
      });
    }
  };

  // --- Functia de stergere ---
  const handleDeletePress = (formattedDate: string) => {
    const originalDate = results.find(
      (r) => formatDate(r.date) === formattedDate
    )?.date;
    if (!originalDate) return;

    Alert.alert(
      'Confirmare Ștergere',
      `Ești sigur că vrei să ștergi toate analizele din data de ${formattedDate}?`,
      [
        {
          text: 'Anulează',
          style: 'cancel',
        },
        {
          text: 'Șterge',
          style: 'destructive',
          onPress: async () => {
            // Delete request
            try {
              console.log(
                `Frontend: Trimit cerere de ștergere pentru data: ${originalDate}`
              );
              const response = await axios.delete(`${API_URL}/api/analyses`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { date: originalDate },
              });

              Toast.show({
                type: 'success',
                text1: 'Succes',
                text2: response.data.message || 'Buletin șters.',
              });

              // Refresh lista
              fetchResults();
            } catch (error) {
              console.error('Eroare la ștergere:', error);
              Toast.show({
                type: 'error',
                text1: 'Eroare',
                text2: 'Nu s-a putut șterge buletinul.',
              });
            }
          },
        },
      ]
    );
  };

  // --- Dynamic Style pentru Separator ---
  const itemSeparatorStyle = {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colorScheme === 'dark' ? '#444' : '#ccc',
  };

  // --- Render Logic ---
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
        <ThemedText>Apasă pe „Adaugă”...</ThemedText>
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
            <View style={[styles.itemRow, itemSeparatorStyle]}>
              <TouchableOpacity
                style={styles.dateTouchable}
                onPress={() => handleDatePress(date)}
              >
                <ThemedText style={styles.itemDateText}>{date}</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeletePress(date)}
              >
                <MaterialIcons
                  name="delete-outline"
                  size={24}
                  color="#FF3B30"
                />
              </TouchableOpacity>
            </View>
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
  },
  // Style for the entire row
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  // Tappable area for the date
  dateTouchable: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 15,
  },
  itemDateText: {
    fontSize: 17,
    fontWeight: '500',
  },
  // Tappable area for the delete button
  deleteButton: {
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
