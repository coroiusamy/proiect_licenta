import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Linking,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

// Culori pentru fiecare clinică
const CLINIC_COLORS: Record<string, string> = {
  Synevo: '#007AFF',
  'Regina Maria': '#E30613',
  MedLife: '#00A651',
  Bioclinica: '#FF9500',
  Sante: '#5856D6',
};

export default function ComparatorScreen() {
  const { token } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const containerBg = isDark ? '#000000' : '#F8F9FA';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const inputBg = isDark ? '#1C1C1E' : '#FFFFFF';

  const searchPrices = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setHasSearched(true);
    setResults([]);

    try {
      const response = await axios.get(`${API_URL}/api/prices`, {
        params: { analysisName: query },
        headers: { Authorization: `Bearer ${token}` },
      });
      setResults(response.data.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch((err) =>
      console.error("Couldn't load page", err)
    );
  };

  const cheapestPrice = results.length > 0 ? results[0].price : 0;

  const renderItem = ({ item, index }: any) => {
    const clinicColor = CLINIC_COLORS[item.clinic] || '#8E8E93';
    const savings = index > 0 ? item.price - cheapestPrice : 0;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: cardBg }]}
        onPress={() => openLink(item.url)}
        activeOpacity={0.7}
      >
        {/* Badge pentru primul loc */}
        {index === 0 && (
          <View style={styles.firstBadge}>
            <MaterialIcons name="emoji-events" size={14} color="#FFD700" />
          </View>
        )}

        <View style={{ flex: 1 }}>
          {/* Clinica */}
          <Text style={[styles.clinicName, { color: clinicColor }]}>
            {item.clinic}
          </Text>

          {/* Nume analiză */}
          <Text
            style={[styles.analysisName, { color: textColor }]}
            numberOfLines={2}
          >
            {item.name}
          </Text>

          {/* Diferență de preț */}
          {savings > 0 && (
            <Text style={styles.savingsText}>
              +{savings.toFixed(0)} Lei mai scump
            </Text>
          )}
        </View>

        {/* Preț */}
        <View style={styles.priceBox}>
          <Text
            style={[
              styles.price,
              { color: index === 0 ? '#34C759' : textColor },
            ]}
          >
            {item.price}
          </Text>
          <Text style={styles.currency}>Lei</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: containerBg }]}
      edges={['top']}
    >
      {/* Header Simplu */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: textColor }]}>
          Comparator Prețuri
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={[styles.searchBar, { backgroundColor: inputBg }]}>
          <MaterialIcons name="search" size={22} color="#8E8E93" />
          <TextInput
            style={[styles.input, { color: textColor }]}
            placeholder="Caută analiză..."
            placeholderTextColor="#8E8E93"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={searchPrices}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <MaterialIcons name="close" size={20} color="#8E8E93" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={searchPrices}>
          <MaterialIcons name="search" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Rezultate Count */}
      {results.length > 0 && !loading && (
        <View style={styles.resultCount}>
          <Text style={[styles.countText, { color: textColor }]}>
            {results.length}{' '}
            {results.length === 1 ? 'rezultat găsit' : 'rezultate găsite'}
          </Text>
          <Text style={styles.rangeText}>
            {cheapestPrice} - {results[results.length - 1].price} Lei
          </Text>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Căutăm oferte...</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.clinic}-${index}`}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            hasSearched ? (
              <View style={styles.empty}>
                <MaterialIcons name="search-off" size={64} color="#C7C7CC" />
                <Text style={[styles.emptyTitle, { color: textColor }]}>
                  Niciun rezultat
                </Text>
                <Text style={styles.emptyText}>
                  Încearcă: Glicemie, Hemoleucogramă
                </Text>
              </View>
            ) : (
              <View style={styles.empty}>
                <MaterialIcons name="local-offer" size={64} color="#007AFF" />
                <Text style={[styles.emptyTitle, { color: textColor }]}>
                  Găsește prețul cel mai bun
                </Text>
                <Text style={styles.emptyText}>
                  Caută o analiză pentru a compara prețurile
                </Text>

                {/* Chips Exemple */}
                <View style={styles.chips}>
                  {['Glicemie', 'Hemoleucogramă', 'Colesterol', 'TSH'].map(
                    (ex) => (
                      <TouchableOpacity
                        key={ex}
                        style={[
                          styles.chip,
                          { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' },
                        ]}
                        onPress={() => {
                          setQuery(ex);
                          setTimeout(() => searchPrices(), 100);
                        }}
                      >
                        <Text style={[styles.chipText, { color: textColor }]}>
                          {ex}
                        </Text>
                      </TouchableOpacity>
                    )
                  )}
                </View>
              </View>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backBtn: { padding: 5 },
  title: { fontSize: 20, fontWeight: 'bold' },

  // Search
  searchSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    marginLeft: 10,
  },
  searchBtn: {
    width: 50,
    height: 50,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Result Count
  resultCount: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
  },
  rangeText: {
    fontSize: 13,
    color: '#8E8E93',
  },

  // List
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },

  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  firstBadge: {
    position: 'absolute',
    top: 8,
    right: 12,
  },
  clinicName: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  analysisName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  savingsText: {
    fontSize: 12,
    color: '#FF3B30',
  },
  priceBox: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  currency: {
    fontSize: 12,
    color: '#8E8E93',
  },

  // Loading
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#8E8E93',
  },

  // Empty
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 30,
  },

  // Chips
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 40,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
