import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  useColorScheme,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import Toast from 'react-native-toast-message';

import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function AddAnalysisScreen() {
  const { token } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [isLoading, setIsLoading] = useState(false);
  const [analysisTypes, setAnalysisTypes] = useState<any[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [selectedType, setSelectedType] = useState('');
  const [value, setValue] = useState('');
  const [stringValue, setStringValue] = useState('');
  const [date, setDate] = useState(new Date());
  const [notes, setNotes] = useState('');

  const containerBg = isDark ? '#000000' : '#F8F9FA';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const inputBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const placeholderColor = isDark ? '#8E8E93' : '#8E8E93';

  useEffect(() => {
    fetchAnalysisTypes();
  }, []);

  const fetchAnalysisTypes = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/analyses/types`);

      if (response.data && response.data.length > 0) {
        setAnalysisTypes(response.data);
        setSelectedType(response.data[0].id.toString());
      }
    } catch (error: any) {
      console.error('Error fetching analysis types:', error);
      Toast.show({
        type: 'error',
        text1: 'Eroare',
        text2: 'Nu s-au putut încărca tipurile de analize.',
      });
    }
  };

  const getSelectedTypeInfo = () => {
    return analysisTypes.find((t) => t.id.toString() === selectedType);
  };

  const handleSubmit = async () => {
    const typeInfo = getSelectedTypeInfo();
    if (!typeInfo) {
      Toast.show({
        type: 'error',
        text1: 'Eroare',
        text2: 'Selectează un tip de analiză.',
      });
      return;
    }

    // Validate
    const isNumeric = typeInfo.unit && typeInfo.unit.length > 0;

    if (isNumeric && !value) {
      Toast.show({
        type: 'error',
        text1: 'Eroare',
        text2: 'Introdu o valoare.',
      });
      return;
    }

    if (!isNumeric && !stringValue) {
      Toast.show({
        type: 'error',
        text1: 'Eroare',
        text2: 'Introdu o valoare.',
      });
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        analysisTypeId: parseInt(selectedType),
        date: date.toISOString(),
        value: isNumeric ? parseFloat(value) : null,
        stringValue: !isNumeric ? stringValue : null,
        notes: notes || null,
      };

      await axios.post(`${API_URL}/api/analyses`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Toast.show({
        type: 'success',
        text1: 'Salvată!',
        text2: 'Analiza a fost adăugată.',
      });

      setValue('');
      setStringValue('');
      setNotes('');
      setDate(new Date());

      setTimeout(() => {
        router.back();
      }, 1000);
    } catch (error: any) {
      console.error('Error submitting:', error);
      Toast.show({
        type: 'error',
        text1: 'Eroare',
        text2: error.response?.data?.message || 'Nu s-a putut salva.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const typeInfo = getSelectedTypeInfo();
  const isNumeric = typeInfo?.unit && typeInfo.unit.length > 0;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: containerBg }]}
      edges={['top']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={[styles.container, { backgroundColor: containerBg }]}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <MaterialIcons name="close" size={24} color={textColor} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerTitle, { color: textColor }]}>
                Adaugă Analiză
              </Text>
              <Text style={[styles.headerSubtitle, { color: textColor }]}>
                Completează datele
              </Text>
            </View>
          </View>

          <View style={styles.form}>
            {/* TYPE */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: textColor }]}>
                Tip Analiză *
              </Text>
              {analysisTypes.length === 0 ? (
                <View style={[styles.emptyState, { backgroundColor: inputBg }]}>
                  <ActivityIndicator color="#007AFF" />
                  <Text style={[styles.emptyText, { color: textColor }]}>
                    Se încarcă...
                  </Text>
                </View>
              ) : (
                <View
                  style={[styles.pickerContainer, { backgroundColor: inputBg }]}
                >
                  <Picker
                    selectedValue={selectedType}
                    onValueChange={setSelectedType}
                    style={[styles.picker, { color: textColor }]}
                    dropdownIconColor={textColor}
                  >
                    {analysisTypes.map((type) => (
                      <Picker.Item
                        key={type.id}
                        label={`${type.name}${
                          type.unit ? ` (${type.unit})` : ''
                        }`}
                        value={type.id.toString()}
                      />
                    ))}
                  </Picker>
                </View>
              )}
            </View>

            {/* VALUE */}
            {typeInfo && (
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: textColor }]}>
                  Valoare *
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: inputBg,
                      color: textColor,
                      borderColor: isDark ? '#2C2C2E' : '#E5E5EA',
                    },
                  ]}
                  value={isNumeric ? value : stringValue}
                  onChangeText={isNumeric ? setValue : setStringValue}
                  placeholder={
                    isNumeric
                      ? `Ex: 62${typeInfo.unit ? ` ${typeInfo.unit}` : ''}`
                      : 'Introdu valoare'
                  }
                  placeholderTextColor={placeholderColor}
                  keyboardType={isNumeric ? 'decimal-pad' : 'default'}
                />
                {typeInfo.refMin && typeInfo.refMax && (
                  <Text style={styles.hint}>
                    Normal: {typeInfo.refMin} - {typeInfo.refMax}{' '}
                    {typeInfo.unit}
                  </Text>
                )}
              </View>
            )}

            {/* DATE */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: textColor }]}>Data *</Text>
              <TouchableOpacity
                style={[
                  styles.dateButton,
                  {
                    backgroundColor: inputBg,
                    borderColor: isDark ? '#2C2C2E' : '#E5E5EA',
                  },
                ]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={[styles.dateText, { color: textColor }]}>
                  {date.toLocaleDateString('ro-RO', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
                <MaterialIcons
                  name="calendar-today"
                  size={20}
                  color={textColor}
                />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (selectedDate) setDate(selectedDate);
                  }}
                  maximumDate={new Date()}
                />
              )}
            </View>

            {/* NOTES */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: textColor }]}>
                Notițe (opțional)
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: inputBg,
                    color: textColor,
                    borderColor: isDark ? '#2C2C2E' : '#E5E5EA',
                  },
                ]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Adaugă notițe..."
                placeholderTextColor={placeholderColor}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              backgroundColor: containerBg,
              borderTopColor: isDark ? '#2C2C2E' : '#E5E5EA',
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.submitButton,
              (isLoading || analysisTypes.length === 0) && { opacity: 0.6 },
            ]}
            onPress={handleSubmit}
            disabled={isLoading || analysisTypes.length === 0}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons name="check" size={24} color="#FFFFFF" />
                <Text style={styles.submitText}>Salvează</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
  },
  backButton: { marginRight: 15, padding: 5 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 2 },
  headerSubtitle: { fontSize: 14, opacity: 0.7 },
  form: { paddingHorizontal: 20 },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    fontSize: 16,
  },
  pickerContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  picker: { height: 50 },
  dateButton: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: { fontSize: 16 },
  hint: { fontSize: 13, color: '#8E8E93', marginTop: 6 },
  emptyState: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  emptyText: { fontSize: 14, marginTop: 8 },
  footer: { padding: 20, borderTopWidth: 1 },
  submitButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 8,
  },
});
