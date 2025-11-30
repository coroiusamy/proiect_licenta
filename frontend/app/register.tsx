import React, { useState } from 'react';
import {
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
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
  const [isLoading, setIsLoading] = useState(false);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleRegister = async () => {
    if (!email || !password) {
      Toast.show({
        type: 'error',
        text1: 'Atenție',
        text2: 'Te rugăm să completezi ambele câmpuri.',
      });
      return;
    }

    setIsLoading(true);
    try {
      await axios.post(`${API_URL}/api/auth/register`, {
        email,
        password,
      });

      Toast.show({
        type: 'success',
        text1: 'Cont creat cu succes!',
        text2: 'Te rugăm să te loghezi cu noile date.',
      });

      // Redirect către login
      router.replace('/login');
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
    } finally {
      setIsLoading(false);
    }
  };

  // Stiluri dinamice
  const inputBorderColor = isDark ? '#444' : 'gray';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const placeholderColor = isDark ? '#999' : '#666';

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ThemedText style={styles.title}>Creează Cont Nou</ThemedText>

        <TextInput
          style={[
            styles.input,
            { color: textColor, borderColor: inputBorderColor },
          ]}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          placeholderTextColor={placeholderColor}
          returnKeyType="next"
        />

        <TextInput
          style={[
            styles.input,
            { color: textColor, borderColor: inputBorderColor },
          ]}
          placeholder="Parolă"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor={placeholderColor}
          returnKeyType="done"
          onSubmitEditing={handleRegister}
        />

        <TouchableOpacity
          style={[styles.buttonContainer, isLoading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.buttonText}>ÎNREGISTREAZĂ-TE</ThemedText>
          )}
        </TouchableOpacity>

        <Pressable
          style={styles.loginLink}
          onPress={() => router.push('/login')}
          disabled={isLoading}
        >
          <ThemedText style={styles.loginText}>Ai deja cont? </ThemedText>
          <ThemedText style={[styles.loginText, styles.loginLinkText]}>
            Loghează-te
          </ThemedText>
        </Pressable>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40,
  },
  input: {
    height: 50,
    borderWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  buttonContainer: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    height: 50,
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
    padding: 10,
  },
  loginText: {
    fontSize: 15,
  },
  loginLinkText: {
    color: '#007AFF',
    fontWeight: 'bold',
    marginLeft: 5,
  },
});
