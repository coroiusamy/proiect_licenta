import React, { useState, useRef } from 'react';
import {
  TextInput,
  StyleSheet,
  ActivityIndicator,
  useColorScheme,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import axios, { isAxiosError } from 'axios';
import Toast from 'react-native-toast-message';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Referințe pentru navigarea între input-uri cu tasta "Next"
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Culori dinamice
  const inputBg = isDark ? '#2C2C2E' : '#F2F2F7';
  const inputColor = isDark ? '#FFFFFF' : '#000000';
  const placeholderColor = isDark ? '#8E8E93' : '#C7C7CC';

  const handleRegister = async () => {
    if (!firstName || !lastName || !email || !password) {
      Toast.show({
        type: 'error',
        text1: 'Atenție',
        text2: 'Toate câmpurile sunt obligatorii.',
      });
      return;
    }

    setIsLoading(true);
    try {
      await axios.post(`${API_URL}/api/auth/register`, {
        email,
        password,
        firstName,
        lastName,
      });

      Toast.show({
        type: 'success',
        text1: 'Succes',
        text2: 'Cont creat! Te rugăm să te loghezi.',
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

  const inputCommonStyle = [
    styles.input,
    { backgroundColor: inputBg, color: inputColor },
  ];

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
          <ThemedText style={styles.title}>Creează Cont</ThemedText>
          <ThemedText style={styles.subtitle}>
            Completează detaliile tale
          </ThemedText>

          {/* PRENUME */}
          <TextInput
            style={inputCommonStyle}
            placeholder="Prenume"
            value={firstName}
            onChangeText={setFirstName}
            placeholderTextColor={placeholderColor}
            returnKeyType="next"
            onSubmitEditing={() => lastNameRef.current?.focus()} // Sare la următorul
            blurOnSubmit={false}
          />

          {/* NUME */}
          <TextInput
            ref={lastNameRef}
            style={inputCommonStyle}
            placeholder="Nume"
            value={lastName}
            onChangeText={setLastName}
            placeholderTextColor={placeholderColor}
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            blurOnSubmit={false}
          />

          {/* EMAIL */}
          <TextInput
            ref={emailRef}
            style={inputCommonStyle}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholderTextColor={placeholderColor}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            blurOnSubmit={false}
          />

          {/* PAROLĂ */}
          <TextInput
            ref={passwordRef}
            style={inputCommonStyle}
            placeholder="Parolă (min. 8 caractere, 1 majusculă)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor={placeholderColor}
            returnKeyType="done"
            onSubmitEditing={handleRegister} // Trimite formularul
          />

          <TouchableOpacity
            style={[styles.buttonContainer, isLoading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.buttonText}>
                ÎNREGISTREAZĂ-TE
              </ThemedText>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.back()}
            disabled={isLoading}
          >
            <ThemedText style={{ color: isDark ? '#A1A1A6' : '#666' }}>
              Ai deja cont?{' '}
              <ThemedText style={styles.linkText}>Loghează-te</ThemedText>
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
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: 'gray',
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  buttonContainer: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
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
    letterSpacing: 1,
  },
  loginLink: { marginTop: 20, alignItems: 'center', padding: 10 },
  linkText: { color: '#007AFF', fontWeight: 'bold' },
});
