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
  View,
} from 'react-native';
import { router } from 'expo-router';
import axios, { isAxiosError } from 'axios';
import Toast from 'react-native-toast-message';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import { MaterialIcons } from '@expo/vector-icons';

import { useAuth } from '@/context/AuthContext';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';

WebBrowser.maybeCompleteAuthSession();

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
const REDIRECT_URI = 'https://auth.expo.io/@samycoroiu/frontend';

export default function LoginScreen() {
  const { login } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const state = Crypto.randomUUID();
      const codeVerifier = Crypto.randomUUID() + Crypto.randomUUID();
      const codeChallenge = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        codeVerifier,
        { encoding: Crypto.CryptoEncoding.BASE64 },
      );
      const codeChallengeFormatted = codeChallenge
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const authUrl =
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${GOOGLE_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent('openid profile email')}` +
        `&state=${state}` +
        `&code_challenge=${codeChallengeFormatted}` +
        `&code_challenge_method=S256`;

      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        REDIRECT_URI,
      );

      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        const code = url.searchParams.get('code');

        if (code) {
          const res = await axios.post(`${API_URL}/api/auth/google`, {
            code,
            redirectUri: REDIRECT_URI,
            codeVerifier,
          });
          login(res.data.token);
        }
      }
    } catch (error) {
      let message = 'Eroare la autentificarea cu Google';
      if (isAxiosError(error)) {
        message = error.response?.data?.message || message;
      }
      Toast.show({ type: 'error', text1: 'Eroare', text2: message });
    } finally {
      setIsGoogleLoading(false);
    }
  };

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

        <View style={styles.dividerContainer}>
          <View
            style={[
              styles.dividerLine,
              { backgroundColor: isDark ? '#3A3A3C' : '#E5E5EA' },
            ]}
          />
          <ThemedText style={styles.dividerText}>sau</ThemedText>
          <View
            style={[
              styles.dividerLine,
              { backgroundColor: isDark ? '#3A3A3C' : '#E5E5EA' },
            ]}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.googleButton,
            { backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF' },
          ]}
          onPress={handleGoogleSignIn}
          disabled={isGoogleLoading || isLoading}
        >
          {isGoogleLoading ? (
            <ActivityIndicator color="#4285F4" />
          ) : (
            <>
              <MaterialIcons name="g-mobiledata" size={28} color="#4285F4" />
              <ThemedText style={styles.googleButtonText}>
                Continuă cu Google
              </ThemedText>
            </>
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
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 15,
    color: '#8E8E93',
    fontSize: 14,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    gap: 8,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
