import React, { useState } from 'react';
import {
  TextInput,
  StyleSheet,
  useColorScheme,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import axios, { isAxiosError } from 'axios';
import Toast from 'react-native-toast-message';

import { useAuth } from '@/context/AuthContext';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function LoginScreen() {
  const { login } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
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
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password,
      });

      const { token } = response.data;
      login(token);
    } catch (error) {
      let message = 'A apărut o eroare';
      if (isAxiosError(error)) {
        message = error.response?.data?.message || 'Eroare de la server';
      }
      Toast.show({ type: 'error', text1: 'Eroare Logare', text2: message });
    } finally {
      setIsLoading(false);
    }
  };

  const inputBg = isDark ? '#2C2C2E' : '#F2F2F7';
  const inputColor = isDark ? '#FFFFFF' : '#000000';
  const placeholderColor = isDark ? '#8E8E93' : '#C7C7CC';

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ThemedText style={styles.title}>Bine ai venit!</ThemedText>

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
          returnKeyType="next"
        />

        <TextInput
          style={[
            styles.input,
            { backgroundColor: inputBg, color: inputColor },
          ]}
          placeholder="Parolă"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor={placeholderColor}
          autoComplete="password"
          returnKeyType="done"
          onSubmitEditing={handleLogin}
        />

        {/* Link Forgot Password */}
        <TouchableOpacity
          style={styles.forgotPasswordContainer}
          onPress={() => router.push('/forgot-password')}
          disabled={isLoading}
        >
          <ThemedText style={styles.forgotPasswordText}>
            Ai uitat parola?
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.buttonContainer, isLoading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.buttonText}>LOGIN</ThemedText>
          )}
        </TouchableOpacity>

        <Pressable
          style={styles.registerLink}
          onPress={() => router.push('/register')}
          disabled={isLoading}
        >
          <ThemedText style={styles.registerText}>Nu ai cont? </ThemedText>
          <ThemedText style={[styles.registerText, styles.registerLinkText]}>
            Înregistrează-te
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
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 16,
    fontSize: 16,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    marginTop: -5,
    padding: 5,
  },
  forgotPasswordText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 14,
  },
  buttonContainer: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    height: 50,
    justifyContent: 'center',
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
  },
  registerLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
    padding: 10,
  },
  registerText: {
    fontSize: 15,
  },
  registerLinkText: {
    color: '#007AFF',
    fontWeight: 'bold',
    marginLeft: 5,
  },
});
