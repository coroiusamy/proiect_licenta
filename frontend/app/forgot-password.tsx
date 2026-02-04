import React, { useState } from 'react';
import {
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios, { isAxiosError } from 'axios';
import Toast from 'react-native-toast-message';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Culori dinamice
  const inputBg = isDark ? '#2C2C2E' : '#F2F2F7';
  const inputColor = isDark ? '#FFFFFF' : '#000000';
  const placeholderColor = isDark ? '#8E8E93' : '#C7C7CC';

  const handleResetRequest = async () => {
    // 1. Validare simplă
    if (!email) {
      Toast.show({
        type: 'error',
        text1: 'Atenție',
        text2: 'Introdu adresa de email.',
      });
      return;
    }
    // Regex simplu pentru email
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email)) {
      Toast.show({
        type: 'error',
        text1: 'Eroare',
        text2: 'Adresa de email nu este validă.',
      });
      return;
    }

    setIsLoading(true);
    try {
      // 2. Cerere Backend
      await axios.post(`${API_URL}/api/auth/forgot-password`, { email });

      Toast.show({
        type: 'success',
        text1: 'Email Trimis',
        text2: 'Verifică inbox-ul pentru codul de 6 cifre.',
        visibilityTime: 4000,
      });

      // 3. Navigare către ecranul de introducere cod
      // Trimitem email-ul ca parametru ca să nu îl mai scrie o dată
      router.push({
        pathname: '/reset-password',
        params: { email: email },
      });
    } catch (error) {
      let message = 'A apărut o eroare.';
      if (isAxiosError(error)) {
        message = error.response?.data?.message || 'Eroare de la server.';
      }
      Toast.show({ type: 'error', text1: 'Eroare', text2: message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ThemedView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
          <ThemedText style={styles.title}>Resetare Parolă</ThemedText>
          <ThemedText style={styles.subtitle}>
            Introdu adresa de email asociată contului tău și îți vom trimite un
            cod de resetare.
          </ThemedText>

          <TextInput
            style={[
              styles.input,
              { backgroundColor: inputBg, color: inputColor },
            ]}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholderTextColor={placeholderColor}
            returnKeyType="done"
            onSubmitEditing={handleResetRequest}
          />

          <TouchableOpacity
            style={[styles.buttonContainer, isLoading && styles.buttonDisabled]}
            onPress={handleResetRequest}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.buttonText}>TRIMITE CODUL</ThemedText>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backLink}
            onPress={() => router.back()}
            disabled={isLoading}
          >
            <ThemedText style={{ color: isDark ? '#A1A1A6' : '#666' }}>
              Înapoi la Autentificare
            </ThemedText>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: 'gray',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  input: {
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16,
  },
  buttonContainer: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  backLink: {
    marginTop: 25,
    alignItems: 'center',
    padding: 10,
  },
});
