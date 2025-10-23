import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Button,
  Platform, // Pentru a detecta iOS vs Android
  useColorScheme,
  Alert,
} from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { router } from 'expo-router';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

// Definim cum arată un Tip de Analiză (ce primim de la API)
type AnalysisType = {
  id: number;
  name: string;
  unit: string;
  refMin: number | null;
  refMax: number | null;
  // ... și celelalte câmpuri
};

export default function AddAnalysisScreen() {
  const { token } = useAuth();
  const colorScheme = useColorScheme();

  // --- Starea (Memoria) Formularului ---
  const [analysisTypes, setAnalysisTypes] = useState<AnalysisType[]>([]); // Lista de analize din dropdown
  const [isLoading, setIsLoading] = useState(true);

  // Câmpurile formularului
  const [selectedTypeId, setSelectedTypeId] = useState<number | undefined>();
  const [date, setDate] = useState(new Date()); // Data de azi ca default
  const [value, setValue] = useState(''); // Valoarea numerică (ex: 95)
  const [stringValue, setStringValue] = useState(''); // Valoarea text (ex: "Pozitiv")
  const [notes, setNotes] = useState('');

  const [showDatePicker, setShowDatePicker] = useState(false);

  // --- Efect: Încărcarea Analizelor de la API ---
  useEffect(() => {
    const fetchAnalysisTypes = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(`${API_URL}/api/analyses/types`);
        setAnalysisTypes(response.data);
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Eroare la încărcarea analizelor',
          text2: 'Te rugăm să încerci din nou.',
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalysisTypes();
  }, []);

  // --- Logica de Salvare ---
  const handleSave = async () => {
    // Validare
    if (!selectedTypeId) {
      Alert.alert('Eroare', 'Te rugăm să selectezi un tip de analiză.');
      return;
    }
    if (!value && !stringValue) {
      Alert.alert(
        'Eroare',
        'Te rugăm să introduci o valoare (numerică sau text).'
      );
      return;
    }

    try {
      // POST /api/analyses (ruta protejată)
      await axios.post(
        `${API_URL}/api/analyses`,
        {
          analysisTypeId: selectedTypeId,
          date: date.toISOString(), // Trimitem data în format standard
          value: value || null, // Trimite valoarea sau null
          stringValue: stringValue || null,
          notes: notes || null,
        },
        {
          headers: {
            // AICI trimitem token-ul pe care îl cere "gardianul" din backend
            Authorization: `Bearer ${token}`,
          },
        }
      );

      Toast.show({
        type: 'success',
        text1: 'Succes',
        text2: 'Analiza a fost salvată!',
      });

      // După salvare, trimite utilizatorul înapoi
      router.back();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Eroare la salvare',
        text2: 'A apărut o problemă. Încearcă din nou.',
      });
    }
  };

  // Funcție pentru schimbarea datei
  const onDateChange = (event: any, selectedDate: Date | undefined) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios'); // Pe iOS se închide manual
    setDate(currentDate);
  };

  // --- Stiluri Dinamice (pentru Dark/Light Mode) ---
  const inputStyle = {
    ...styles.input,
    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
    borderColor: colorScheme === 'dark' ? '#444' : 'gray',
  };
  const placeholderTextColor = colorScheme === 'dark' ? '#999' : '#666';
  const pickerStyle = {
    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
    backgroundColor: colorScheme === 'dark' ? '#222' : '#FFFFFF',
  };

  // --- Afișare ---
  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Se încarcă lista de analize...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>Adaugă Analiză Nouă</ThemedText>

      {/* --- Picker-ul (Dropdown) --- */}
      <ThemedText style={styles.label}>Tipul Analizei</ThemedText>
      <ThemedView style={styles.pickerContainer}>
        <Picker
          selectedValue={selectedTypeId}
          onValueChange={(itemValue) => setSelectedTypeId(itemValue)}
          style={pickerStyle}
        >
          <Picker.Item label="-- Selectează o analiză --" value={undefined} />
          {analysisTypes.map((type) => (
            <Picker.Item key={type.id} label={type.name} value={type.id} />
          ))}
        </Picker>
      </ThemedView>

      {/* --- Date Picker --- */}
      <ThemedText style={styles.label}>Data Rezultatului</ThemedText>
      {/* Pe Android, butonul deschide picker-ul. Pe iOS, e vizibil direct. */}
      {Platform.OS === 'android' && (
        <Button
          onPress={() => setShowDatePicker(true)}
          title={`Data selectată: ${date.toLocaleDateString()}`}
        />
      )}
      {(showDatePicker || Platform.OS === 'ios') && (
        <DateTimePicker
          testID="dateTimePicker"
          value={date}
          mode={'date'}
          is24Hour={true}
          display="default"
          onChange={onDateChange}
        />
      )}

      {/* --- Input Valori --- */}
      <ThemedText style={styles.label}>Valoare Numerică (ex: 95.5)</ThemedText>
      <TextInput
        style={inputStyle}
        placeholder="Doar dacă e număr"
        value={value}
        onChangeText={setValue}
        keyboardType="numeric"
        placeholderTextColor={placeholderTextColor}
      />

      <ThemedText style={styles.label}>Valoare Text (ex: "Pozitiv")</ThemedText>
      <TextInput
        style={inputStyle}
        placeholder="Doar dacă e text"
        value={stringValue}
        onChangeText={setStringValue}
        placeholderTextColor={placeholderTextColor}
      />

      {/* --- Notițe --- */}
      <ThemedText style={styles.label}>Notițe (opțional)</ThemedText>
      <TextInput
        style={[inputStyle, styles.notesInput]}
        placeholder="Ex: pe nemâncate"
        value={notes}
        onChangeText={setNotes}
        placeholderTextColor={placeholderTextColor}
        multiline
      />

      {/* --- Salvare --- */}
      <TouchableOpacity style={styles.buttonContainer} onPress={handleSave}>
        <ThemedText style={styles.buttonText}>Salvează Rezultat</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

// --- Stilurile ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 15,
    marginBottom: 5,
  },
  pickerContainer: {
    borderColor: '#444',
    borderWidth: 1,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  input: {
    height: 40,
    borderWidth: 1,
    paddingHorizontal: 8,
    borderRadius: 5,
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 8,
  },
  buttonContainer: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 30,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
