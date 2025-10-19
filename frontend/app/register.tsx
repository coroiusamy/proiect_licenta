import React, { useState } from 'react';
import {
  TextInput,
  Button,
  StyleSheet,
  Alert,
  useColorScheme,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import axios, { isAxiosError } from 'axios';
import Toast from 'react-native-toast-message';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const colorScheme = useColorScheme();

  const handleRegister = async () => {
    if (!email || !password) {
      Toast.show({
        type: 'error',
        text1: 'Eroare',
        text2: 'Te rugăm să completezi ambele câmpuri.',
      });
      return;
    }
    try {
      await axios.post(`${API_URL}/api/auth/register`, {
        email: email,
        password: password,
      });

      Toast.show({
        type: 'success',
        text1: 'Succes',
        text2: 'Contul tău a fost creat! Te poți loga acum.',
      });

      router.push('/login');
    } catch (error) {
      let message = 'A apărut o eroare';
      if (isAxiosError(error)) {
        message = error.response?.data?.message || 'Eroare de la server';
      }

      Toast.show({
        type: 'error',
        text1: 'Eroare Înregistrare',
        text2: message,
      });
    }
  };

  const inputStyle = {
    ...styles.input,
    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
    borderColor: colorScheme === 'dark' ? '#444' : 'gray',
  };
  const placeholderTextColor = colorScheme === 'dark' ? '#999' : '#666';

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>Creează Cont Nou</ThemedText>

      <TextInput
        style={inputStyle}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholderTextColor={placeholderTextColor}
      />
      <TextInput
        style={inputStyle}
        placeholder="Parolă"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholderTextColor={placeholderTextColor}
      />

      <TouchableOpacity style={styles.buttonContainer} onPress={handleRegister}>
        <ThemedText style={styles.buttonText}>Înregistrează-te</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    height: 40,
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 8,
    borderRadius: 5,
  },
  buttonContainer: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
