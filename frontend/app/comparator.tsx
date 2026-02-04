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
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import Toast from 'react-native-toast-message';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

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
  const [selectedAnalyses, setSelectedAnalyses] = useState<string[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [mode, setMode] = useState<'single' | 'batch'>('single');

  // Modal pentru breakdown
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);

  const containerBg = isDark ? '#000000' : '#F8F9FA';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const inputBg = isDark ? '#1C1C1E' : '#FFFFFF';

  // Adaugă analiză la listă
  const addAnalysis = () => {
    if (!query.trim()) return;
    if (selectedAnalyses.includes(query.trim())) return;

    setSelectedAnalyses([...selectedAnalyses, query.trim()]);
    setQuery('');
  };

  // Șterge analiză din listă
  const removeAnalysis = (name: string) => {
    setSelectedAnalyses(selectedAnalyses.filter((a) => a !== name));
  };

  // Căutare
  const searchPrices = async () => {
    // Single mode - verifică că ai query
    if (mode === 'single' && !query.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Lipsește numele',
        text2: 'Te rog să introduci o analiză pentru căutare',
      });
      return;
    }

    // Batch mode - verifică că ai cel puțin o analiză
    let finalAnalyses = [...selectedAnalyses];

    // Auto-add: Dacă ai scris ceva în input dar ai uitat să dai +, îl adăugăm noi
    if (
      mode === 'batch' &&
      query.trim() &&
      !selectedAnalyses.includes(query.trim())
    ) {
      finalAnalyses.push(query.trim());
      setSelectedAnalyses(finalAnalyses); // Update state
      setQuery(''); // Clear input
    }

    if (mode === 'batch' && finalAnalyses.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Lipsesc analizele',
        text2: 'Adaugă cel puțin o analiză pentru a compara pachete',
      });
      return;
    }

    setLoading(true);
    setHasSearched(true);
    setResults([]);

    try {
      let response;

      if (mode === 'single') {
        // Single analysis
        response = await axios.get(`${API_URL}/api/prices`, {
          params: { analysisName: query },
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        // Batch (multiple analyses)
        response = await axios.get(`${API_URL}/api/prices`, {
          params: { analysisNames: finalAnalyses.join(',') },
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      setResults(response.data.data || []);

      // Success toast (optional, doar pentru feedback pozitiv)
      if (response.data.data && response.data.data.length > 0) {
        Toast.show({
          type: 'success',
          text1: mode === 'single' ? 'Prețuri găsite!' : 'Pachete găsite!',
          text2: `${response.data.data.length} ${
            mode === 'single' ? 'rezultate' : 'pachete'
          } disponibile`,
        });
      }
    } catch (error) {
      console.error(error);
      Toast.show({
        type: 'error',
        text1: 'Eroare',
        text2: 'Nu am putut prelua prețurile. Verifică conexiunea.',
      });
    } finally {
      setLoading(false);
    }
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch((err) =>
      console.error("Couldn't load page", err)
    );
  };

  const openPackageDetails = (pkg: any) => {
    setSelectedPackage(pkg);
    setModalVisible(true);
  };

  // Reset data când switch între moduri
  React.useEffect(() => {
    // Clear toate datele când schimbi modul
    setQuery('');
    setSelectedAnalyses([]);
    setResults([]);
    setHasSearched(false);
  }, [mode]);

  // Render item pentru Single Mode
  const renderSingleItem = ({ item, index }: any) => {
    const clinicColor = CLINIC_COLORS[item.clinic] || '#8E8E93';
    const cheapest = index === 0;
    const cheapestPrice = results[0]?.price || 0;
    const savings = index > 0 ? item.price - cheapestPrice : 0;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: cardBg }]}
        onPress={() => openLink(item.url)}
        activeOpacity={0.7}
      >
        {cheapest && (
          <View style={styles.firstBadge}>
            <MaterialIcons name="emoji-events" size={14} color="#FFD700" />
          </View>
        )}

        <View style={{ flex: 1 }}>
          <Text style={[styles.clinicName, { color: clinicColor }]}>
            {item.clinic}
          </Text>
          <Text
            style={[styles.analysisName, { color: textColor }]}
            numberOfLines={2}
          >
            {item.name}
          </Text>
          {savings > 0 && (
            <Text style={styles.savingsText}>
              +{Math.round(savings)} Lei mai scump
            </Text>
          )}
        </View>

        <View style={styles.priceBox}>
          <Text
            style={[styles.price, { color: cheapest ? '#34C759' : textColor }]}
          >
            {item.price}
          </Text>
          <Text style={styles.currency}>Lei</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Render item pentru Batch Mode (pachete)
  const renderBatchItem = ({ item, index }: any) => {
    const clinicColor = CLINIC_COLORS[item.clinic] || '#8E8E93';
    const cheapest = index === 0;
    const firstPrice = results[0]?.totalPrice || 0;
    const currentPrice = item?.totalPrice || 0;
    const savings = index > 0 ? currentPrice - firstPrice : 0;

    // Verifică dacă pachetul e complet
    const requestedCount = selectedAnalyses.length;
    const foundCount = item.analysisCount || 0;
    const isComplete = foundCount === requestedCount;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: cardBg }]}
        onPress={() => openPackageDetails(item)}
        activeOpacity={0.7}
      >
        {cheapest && (
          <View style={styles.firstBadge}>
            <MaterialIcons name="emoji-events" size={14} color="#FFD700" />
          </View>
        )}

        <View style={{ flex: 1 }}>
          <Text style={[styles.clinicName, { color: clinicColor }]}>
            {item.clinic}
          </Text>
          <Text
            style={[
              styles.packageInfo,
              { color: isComplete ? textColor : '#FF9500' },
            ]}
          >
            {isComplete
              ? `Pachet complet (${foundCount} ${
                  foundCount === 1 ? 'analiză' : 'analize'
                })`
              : `Pachet parțial (${foundCount}/${requestedCount})`}
          </Text>
          {savings > 0 && (
            <Text style={styles.savingsText}>
              +{Math.round(savings)} Lei mai scump
            </Text>
          )}
        </View>

        <View style={styles.priceBox}>
          <Text
            style={[styles.price, { color: cheapest ? '#34C759' : textColor }]}
          >
            {Math.round(currentPrice)}
          </Text>
          <Text style={styles.currency}>Lei</Text>
        </View>

        <MaterialIcons name="chevron-right" size={24} color="#8E8E93" />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: containerBg }]}
      edges={['top']}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: textColor }]}>
          Comparator Prețuri
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Mode Selector */}
      <View style={styles.modeSelector}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'single' && styles.modeBtnActive]}
          onPress={() => setMode('single')}
        >
          <Text
            style={[
              styles.modeBtnText,
              mode === 'single' && styles.modeBtnTextActive,
            ]}
          >
            O analiză
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'batch' && styles.modeBtnActive]}
          onPress={() => setMode('batch')}
        >
          <Text
            style={[
              styles.modeBtnText,
              mode === 'batch' && styles.modeBtnTextActive,
            ]}
          >
            Pachet analize
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={[styles.searchBar, { backgroundColor: inputBg }]}>
          <MaterialIcons name="search" size={22} color="#8E8E93" />
          <TextInput
            style={[styles.input, { color: textColor }]}
            placeholder={
              mode === 'single' ? 'Caută analiză...' : 'Adaugă analiză...'
            }
            placeholderTextColor="#8E8E93"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => {
              if (mode === 'batch') {
                addAnalysis();
              } else {
                searchPrices();
              }
            }}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <MaterialIcons name="close" size={20} color="#8E8E93" />
            </TouchableOpacity>
          )}
        </View>

        {mode === 'single' ? (
          <TouchableOpacity style={styles.searchBtn} onPress={searchPrices}>
            <MaterialIcons name="search" size={24} color="#FFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.searchBtn} onPress={addAnalysis}>
            <MaterialIcons name="add" size={24} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Chips pentru analize selectate (Batch Mode) */}
      {mode === 'batch' && selectedAnalyses.length > 0 && (
        <View style={styles.chipsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {selectedAnalyses.map((analysis) => (
              <View
                key={analysis}
                style={[
                  styles.chip,
                  { backgroundColor: isDark ? '#2C2C2E' : '#007AFF15' },
                ]}
              >
                <Text style={[styles.chipText, { color: '#007AFF' }]}>
                  {analysis}
                </Text>
                <TouchableOpacity onPress={() => removeAnalysis(analysis)}>
                  <MaterialIcons name="close" size={18} color="#007AFF" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.compareBtn} onPress={searchPrices}>
            <Text style={styles.compareBtnText}>Compară prețurile</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Results Count */}
      {results.length > 0 && !loading && (
        <View style={styles.resultCount}>
          <Text style={[styles.countText, { color: textColor }]}>
            {results.length}{' '}
            {results.length === 1
              ? mode === 'single'
                ? 'rezultat găsit'
                : 'pachet găsit'
              : mode === 'single'
              ? 'rezultate găsite'
              : 'pachete găsite'}
          </Text>
          {results.length > 0 && (
            <Text style={styles.rangeText}>
              {mode === 'single'
                ? `${results[0]?.price || 0} - ${
                    results[results.length - 1]?.price || 0
                  } Lei`
                : `${results[0]?.totalPrice?.toFixed(0) || 0} - ${
                    results[results.length - 1]?.totalPrice?.toFixed(0) || 0
                  } Lei`}
            </Text>
          )}
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
          renderItem={mode === 'single' ? renderSingleItem : renderBatchItem}
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
                  {mode === 'single'
                    ? 'Încearcă alt nume de analiză'
                    : 'Nicio clinică nu oferă toate analizele din pachet'}
                </Text>
              </View>
            ) : (
              <View style={styles.empty}>
                <MaterialIcons name="local-offer" size={64} color="#007AFF" />
                <Text style={[styles.emptyTitle, { color: textColor }]}>
                  {mode === 'single'
                    ? 'Găsește prețul cel mai bun'
                    : 'Compară pachete de analize'}
                </Text>
                <Text style={styles.emptyText}>
                  {mode === 'single'
                    ? 'Caută o analiză pentru a compara prețurile la toate clinicile'
                    : 'Adaugă 2-3 analize pentru a vedea care clinică oferă cel mai bun preț total'}
                </Text>

                {/* Exemple */}
                <View style={styles.chips}>
                  {['Glicemie', 'Hemoleucogramă', 'Colesterol', 'TSH'].map(
                    (ex) => (
                      <TouchableOpacity
                        key={ex}
                        style={[
                          styles.exampleChip,
                          { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' },
                        ]}
                        onPress={() => {
                          if (mode === 'single') {
                            setQuery(ex);
                            setTimeout(() => searchPrices(), 100);
                          } else {
                            if (!selectedAnalyses.includes(ex)) {
                              setSelectedAnalyses([...selectedAnalyses, ex]);
                            }
                          }
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

      {/* Modal pentru detalii pachet */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textColor }]}>
                {selectedPackage?.clinic} - Detalii pachet
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text
                style={[
                  styles.modalTotalPrice,
                  {
                    color: CLINIC_COLORS[selectedPackage?.clinic] || '#007AFF',
                  },
                ]}
              >
                {selectedPackage?.totalPrice
                  ? Math.round(selectedPackage.totalPrice)
                  : 0}{' '}
                Lei TOTAL
              </Text>

              {/* Status pachet */}
              {selectedPackage && selectedAnalyses.length > 0 && (
                <View style={styles.modalStatusBadge}>
                  <MaterialIcons
                    name={
                      selectedPackage.analysisCount === selectedAnalyses.length
                        ? 'check-circle'
                        : 'info'
                    }
                    size={16}
                    color={
                      selectedPackage.analysisCount === selectedAnalyses.length
                        ? '#34C759'
                        : '#FF9500'
                    }
                  />
                  <Text
                    style={[
                      styles.modalStatusText,
                      {
                        color:
                          selectedPackage.analysisCount ===
                          selectedAnalyses.length
                            ? '#34C759'
                            : '#FF9500',
                      },
                    ]}
                  >
                    {selectedPackage.analysisCount === selectedAnalyses.length
                      ? 'Pachet complet'
                      : `Pachet parțial (${selectedPackage.analysisCount}/${selectedAnalyses.length})`}
                  </Text>
                </View>
              )}

              <Text style={[styles.modalSubtitle, { color: textColor }]}>
                {selectedPackage?.analysisCount || 0} analize incluse:
              </Text>

              {selectedPackage?.analyses.map((analysis: any, index: number) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.modalItem,
                    { borderBottomColor: isDark ? '#2C2C2E' : '#E5E5EA' },
                  ]}
                  onPress={() => {
                    setModalVisible(false);
                    openLink(analysis.url);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalItemName, { color: textColor }]}>
                      {analysis.name}
                    </Text>
                    <Text style={styles.modalItemOriginal}>
                      {analysis.originalName}
                    </Text>
                  </View>
                  <Text style={[styles.modalItemPrice, { color: textColor }]}>
                    {analysis.price} Lei
                  </Text>
                  <MaterialIcons name="open-in-new" size={20} color="#8E8E93" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Toast pentru notificări */}
      <Toast />
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

  // Mode Selector
  modeSelector: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 15,
    gap: 10,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: '#007AFF',
  },
  modeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  modeBtnTextActive: {
    color: '#FFFFFF',
  },

  // Search
  searchSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 15,
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
  input: { flex: 1, fontSize: 16, marginLeft: 10 },
  searchBtn: {
    width: 50,
    height: 50,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Chips Container (Batch Mode)
  chipsContainer: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
  },
  chipText: { fontSize: 14, fontWeight: '500' },
  compareBtn: {
    backgroundColor: '#34C759',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 10,
    alignItems: 'center',
  },
  compareBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Result Count
  resultCount: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  countText: { fontSize: 14, fontWeight: '600' },
  rangeText: { fontSize: 13, color: '#8E8E93' },

  // List
  listContent: { paddingHorizontal: 20, paddingBottom: 30 },

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
  firstBadge: { position: 'absolute', top: 8, right: 12 },
  clinicName: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  analysisName: { fontSize: 16, fontWeight: '500', marginBottom: 4 },
  packageInfo: { fontSize: 14, marginBottom: 4 },
  savingsText: { fontSize: 12, color: '#FF3B30' },
  priceBox: { alignItems: 'flex-end', marginLeft: 12 },
  price: { fontSize: 24, fontWeight: 'bold' },
  currency: { fontSize: 12, color: '#8E8E93' },

  // Loading
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#8E8E93' },

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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 40,
  },
  exampleChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', flex: 1 },
  modalBody: { paddingHorizontal: 20, paddingBottom: 30 },
  modalTotalPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
  },
  modalStatusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalSubtitle: { fontSize: 16, fontWeight: '600', marginBottom: 15 },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  modalItemName: { fontSize: 16, fontWeight: '500', marginBottom: 2 },
  modalItemOriginal: { fontSize: 12, color: '#8E8E93' },
  modalItemPrice: { fontSize: 16, fontWeight: '600' },
});
