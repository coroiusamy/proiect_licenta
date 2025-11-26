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
  date: string;
  // Alte câmpuri dacă sunt necesare
};

export default function IstoricScreen() {
  const { token, logout } = useAuth();
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const fetchResults = useCallback(async () => {
    if (!token) return;

    // Arată loading doar dacă nu avem date deloc (prima încărcare)
    if (results.length === 0) setIsLoading(true);

    try {
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
      if (isAxiosError(error) && error.response?.status === 401) {
        logout();
      } else {
        Toast.show({ type: 'error', text1: 'Eroare', text2: message });
      }
    } finally {
      setIsLoading(false);
    }
  }, [token, logout, results.length]);

  useFocusEffect(
    useCallback(() => {
      fetchResults();
    }, [fetchResults])
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const uniqueDates = useMemo(() => {
    const dates = new Set<string>();
    results.forEach((result) => dates.add(formatDate(result.date)));
    return Array.from(dates);
  }, [results]);

  const getOriginalDate = (formattedDate: string) => {
    return results.find((r) => formatDate(r.date) === formattedDate)?.date;
  };

  const handleNavigate = (formattedDate: string) => {
    const originalDate = getOriginalDate(formattedDate);
    if (originalDate) {
      router.push({
        pathname: '/istoric-detaliu',
        params: { displayDate: formattedDate, date: originalDate },
      });
    }
  };

  const handleDelete = (formattedDate: string) => {
    const originalDate = getOriginalDate(formattedDate);
    if (!originalDate) return;

    Alert.alert(
      'Confirmare Ștergere',
      `Ștergi toate analizele din ${formattedDate}?`,
      [
        { text: 'Anulează', style: 'cancel' },
        {
          text: 'Șterge',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(`${API_URL}/api/analyses`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { date: originalDate },
              });
              Toast.show({
                type: 'success',
                text1: 'Succes',
                text2: 'Buletin șters.',
              });
              fetchResults();
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: 'Eroare',
                text2: 'Nu s-a putut șterge.',
              });
            }
          },
        },
      ]
    );
  };

  if (isLoading && results.length === 0) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </ThemedView>
    );
  }

  if (results.length === 0) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ThemedText style={styles.emptyText}>
          Nu există analize în istoric.
        </ThemedText>
        <ThemedText style={styles.emptySubText}>
          Folosește tab-ul Adaugă pentru a începe.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <FlatList
          data={uniqueDates}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => (
            <View
              style={[
                styles.separator,
                { backgroundColor: isDark ? '#444' : '#eee' },
              ]}
            />
          )}
          renderItem={({ item: date }) => (
            <View style={styles.rowContainer}>
              <TouchableOpacity
                style={styles.dateTouchable}
                onPress={() => handleNavigate(date)}
                activeOpacity={0.7}
              >
                <View style={styles.textWrapper}>
                  <ThemedText style={styles.dateText}>{date}</ThemedText>
                  {/* Chevron pentru a indica navigare */}
                  <ThemedText style={styles.chevron}>›</ThemedText>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(date)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons
                  name="delete-outline"
                  size={24}
                  color="#FF3B30"
                />
              </TouchableOpacity>
            </View>
          )}
        />
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
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubText: {
    color: 'gray',
  },
  separator: {
    height: 1,
    marginLeft: 15,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 15, // Spațiu pentru butonul de ștergere
  },
  dateTouchable: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 15,
  },
  textWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 17,
    fontWeight: '500',
    flex: 1,
  },
  chevron: {
    fontSize: 22,
    color: '#C7C7CC',
    fontWeight: '300',
    marginRight: 10,
  },
  deleteButton: {
    padding: 8,
  },
});
