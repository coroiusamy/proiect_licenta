import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Button,
  Platform,
  useColorScheme,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import axios from 'axios';
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

export default function AddAnalysisScreen() {
  const { token } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [analysisTypes, setAnalysisTypes] = useState<AnalysisType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [selectedTypeId, setSelectedTypeId] = useState<number | undefined>();
  const [date, setDate] = useState(new Date());
  const [value, setValue] = useState('');
  const [stringValue, setStringValue] = useState('');
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    const fetchAnalysisTypes = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/analyses/types`);
        setAnalysisTypes(response.data);
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Eroare',
          text2: 'Nu s-au putut încărca tipurile de analize.',
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalysisTypes();
  }, []);

  const handleSave = async () => {
    if (!selectedTypeId) {
      Alert.alert('Atenție', 'Te rugăm să selectezi un tip de analiză.');
      return;
    }
    if (!value && !stringValue) {
      Alert.alert(
        'Atenție',
        'Te rugăm să introduci o valoare (numerică sau text).'
      );
      return;
    }

    try {
      await axios.post(
        `${API_URL}/api/analyses`,
        {
          analysisTypeId: selectedTypeId,
          date: date.toISOString(),
          value: value || null,
          stringValue: stringValue || null,
          notes: notes || null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Toast.show({
        type: 'success',
        text1: 'Succes',
        text2: 'Analiza a fost salvată!',
      });
      router.back();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Eroare',
        text2: 'Salvarea a eșuat.',
      });
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) setDate(selectedDate);
  };

  // Dynamic Styles helpers
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const inputBorderColor = isDark ? '#444' : '#CCC';
  const placeholderColor = isDark ? '#888' : '#666';

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, styles.centerContent]}>
        <ThemedText>Se încarcă...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedText style={styles.title}>Adaugă Analiză Nouă</ThemedText>

        <ThemedText style={styles.label}>Tipul Analizei</ThemedText>
        <ThemedView
          style={[styles.pickerContainer, { borderColor: inputBorderColor }]}
        >
          <Picker
            selectedValue={selectedTypeId}
            onValueChange={setSelectedTypeId}
            dropdownIconColor={textColor}
            style={{ color: textColor }}
          >
            <Picker.Item
              label="-- Selectează --"
              value={undefined}
              color={textColor}
            />
            {analysisTypes.map((type) => (
              <Picker.Item
                key={type.id}
                label={type.name}
                value={type.id}
                color={textColor}
              />
            ))}
          </Picker>
        </ThemedView>

        <ThemedText style={styles.label}>Data Rezultatului</ThemedText>
        <ThemedView style={styles.dateContainer}>
          {Platform.OS === 'android' && (
            <Button
              onPress={() => setShowDatePicker(true)}
              title={date.toLocaleDateString()}
              color="#007AFF"
            />
          )}
          {(showDatePicker || Platform.OS === 'ios') && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={onDateChange}
              themeVariant={colorScheme ?? 'light'}
            />
          )}
        </ThemedView>

        <ThemedText style={styles.label}>Valoare Numerică</ThemedText>
        <TextInput
          style={[
            styles.input,
            { color: textColor, borderColor: inputBorderColor },
          ]}
          placeholder="Ex: 95.5"
          value={value}
          onChangeText={setValue}
          keyboardType="numeric"
          placeholderTextColor={placeholderColor}
        />

        <ThemedText style={styles.label}>Valoare Text</ThemedText>
        <TextInput
          style={[
            styles.input,
            { color: textColor, borderColor: inputBorderColor },
          ]}
          placeholder="Ex: Pozitiv / Negativ"
          value={stringValue}
          onChangeText={setStringValue}
          placeholderTextColor={placeholderColor}
        />

        <ThemedText style={styles.label}>Notițe (Opțional)</ThemedText>
        <TextInput
          style={[
            styles.input,
            styles.notesInput,
            { color: textColor, borderColor: inputBorderColor },
          ]}
          placeholder="Detalii suplimentare..."
          value={notes}
          onChangeText={setNotes}
          placeholderTextColor={placeholderColor}
          multiline
        />

        <TouchableOpacity style={styles.buttonContainer} onPress={handleSave}>
          <ThemedText style={styles.buttonText}>Salvează</ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 25,
    marginTop: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden', // Important pentru colțuri rotunjite la Picker
  },
  dateContainer: {
    alignItems: Platform.OS === 'ios' ? 'flex-start' : 'stretch',
  },
  input: {
    height: 48,
    borderWidth: 1,
    paddingHorizontal: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  notesInput: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  buttonContainer: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 35,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
