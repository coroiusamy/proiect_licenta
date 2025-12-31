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
import axios, { isAxiosError } from 'axios';
import Toast from 'react-native-toast-message';
import { router, useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function ResetPasswordScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();

  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const inputBg = isDark ? '#2C2C2E' : '#F2F2F7';
  const inputColor = isDark ? '#FFFFFF' : '#000000';
  const placeholderColor = isDark ? '#8E8E93' : '#C7C7CC';

  const handleFinalReset = async () => {
    if (!token || !newPassword) {
      Toast.show({
        type: 'error',
        text1: 'Atenție',
        text2: 'Te rugăm să introduci codul și noua parolă.',
      });
      return;
    }

    setIsLoading(true);
    try {
      await axios.post(`${API_URL}/api/auth/reset-password`, {
        token,
        newPassword,
      });

      Toast.show({
        type: 'success',
        text1: 'Succes!',
        text2: 'Parola a fost schimbată. Te poți loga.',
        visibilityTime: 4000,
      });

      // Redirect către Login și ștergerea istoricului de navigare
      router.replace('/login');
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
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <ThemedText style={styles.title}>Schimbă Parola</ThemedText>

          <ThemedText style={styles.subtitle}>
            Introdu codul de 6 cifre primit pe email
            {email ? (
              <ThemedText style={{ fontWeight: 'bold' }}>
                {' '}
                ({email}){' '}
              </ThemedText>
            ) : (
              ' '
            )}
            și alege o parolă nouă.
          </ThemedText>

          {/* Input COD */}
          <TextInput
            style={[
              styles.input,
              { backgroundColor: inputBg, color: inputColor },
            ]}
            placeholder="Codul (6 cifre)"
            value={token}
            onChangeText={setToken}
            keyboardType="numeric"
            placeholderTextColor={placeholderColor}
            returnKeyType="next"
          />

          {/* Input Parolă Nouă */}
          <TextInput
            style={[
              styles.input,
              { backgroundColor: inputBg, color: inputColor },
            ]}
            placeholder="Noua Parolă"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            placeholderTextColor={placeholderColor}
            returnKeyType="done"
            onSubmitEditing={handleFinalReset}
          />

          <TouchableOpacity
            style={[styles.buttonContainer, isLoading && styles.buttonDisabled]}
            onPress={handleFinalReset}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.buttonText}>SALVEAZĂ PAROLA</ThemedText>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
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
    backgroundColor: '#34C759',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#34C759',
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
});
