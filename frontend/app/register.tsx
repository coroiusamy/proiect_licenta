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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import axios, { isAxiosError } from 'axios';
import Toast from 'react-native-toast-message';
import { MaterialIcons } from '@expo/vector-icons';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function RegisterScreen() {
  const { login } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'patient' | 'doctor'>('patient');
  const [specialty, setSpecialty] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<'firstName' | 'lastName' | 'email' | 'password' | 'specialty' | null>(null);

  // Referințe pentru navigarea între input-uri cu tasta "Next"
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const specialtyRef = useRef<TextInput>(null);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Culori dinamice
  const inputBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const inputColor = isDark ? '#FFFFFF' : '#000000';
  const placeholderColor = isDark ? '#8E8E93' : '#A1A1A6';
  const containerBg = isDark ? '#000000' : '#F8F9FA';

  const handleRegister = async () => {
    if (!firstName || !lastName || !email || !password) {
      Toast.show({
        type: 'error',
        text1: 'Atenție',
        text2: 'Toate câmpurile sunt obligatorii.',
      });
      return;
    }

    if (role === 'doctor' && !specialty.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Atenție',
        text2: 'Specialitatea este obligatorie pentru medici.',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/register`, {
        email,
        password,
        firstName,
        lastName,
        role,
        ...(role === 'doctor' && { specialty: specialty.trim() }),
      });

      const { token, user } = response.data;

      Toast.show({
        type: 'success',
        text1: 'Succes',
        text2: 'Cont creat cu succes!',
      });

      // Loghează automat și redirecționează (cu isFirstLogin = true)
      login(token, user?.role, true);
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

  const getStyleForInput = (id: 'firstName' | 'lastName' | 'email' | 'password' | 'specialty') => {
    return [
      styles.input,
      { backgroundColor: inputBg, color: inputColor },
      focusedInput === id && styles.inputFocused,
    ];
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: containerBg }]} edges={['top', 'bottom']}>
      <ThemedView style={[styles.container, { backgroundColor: containerBg }]}>
        <KeyboardAvoidingView
          behavior="padding"
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 100}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* BRANDING LOGO */}
            <View style={styles.logoSection}>
              <View style={[styles.logoIconBg, { backgroundColor: '#007AFF15' }]}>
                <MaterialIcons name="healing" size={32} color="#007AFF" />
              </View>
            </View>

            <ThemedText style={styles.title}>Creează Cont</ThemedText>
            <ThemedText style={styles.subtitle}>
              Creează un cont nou pentru a începe
            </ThemedText>

            {/* SELECTOR ROL */}
            <View style={styles.roleContainer}>
              <ThemedText style={styles.roleLabel}>Tip cont:</ThemedText>
              <View style={[styles.roleToggle, { backgroundColor: isDark ? '#1C1C1E' : '#E5E5EA70' }]}>
                <TouchableOpacity
                  style={[
                    styles.roleOption,
                    role === 'patient' && styles.roleOptionActive,
                  ]}
                  onPress={() => setRole('patient')}
                >
                  <ThemedText
                    style={[
                      styles.roleText,
                      role === 'patient' && styles.roleTextActive,
                    ]}
                  >
                    🧑 Pacient
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.roleOption,
                    role === 'doctor' && styles.roleOptionActive,
                  ]}
                  onPress={() => setRole('doctor')}
                >
                  <ThemedText
                    style={[
                      styles.roleText,
                      role === 'doctor' && styles.roleTextActive,
                    ]}
                  >
                    🩺 Medic
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            {/* PRENUME */}
            <TextInput
              style={getStyleForInput('firstName')}
              placeholder="Prenume"
              value={firstName}
              onChangeText={setFirstName}
              placeholderTextColor={placeholderColor}
              returnKeyType="next"
              onSubmitEditing={() => lastNameRef.current?.focus()}
              blurOnSubmit={false}
              onFocus={() => setFocusedInput('firstName')}
              onBlur={() => setFocusedInput(null)}
            />

            {/* NUME */}
            <TextInput
              ref={lastNameRef}
              style={getStyleForInput('lastName')}
              placeholder="Nume"
              value={lastName}
              onChangeText={setLastName}
              placeholderTextColor={placeholderColor}
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              blurOnSubmit={false}
              onFocus={() => setFocusedInput('lastName')}
              onBlur={() => setFocusedInput(null)}
            />

            {/* EMAIL */}
            <TextInput
              ref={emailRef}
              style={getStyleForInput('email')}
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
              onFocus={() => setFocusedInput('email')}
              onBlur={() => setFocusedInput(null)}
            />

            {/* PAROLĂ */}
            <TextInput
              ref={passwordRef}
              style={getStyleForInput('password')}
              placeholder="Parolă (min. 8 caractere, 1 majusculă)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor={placeholderColor}
              returnKeyType={role === 'doctor' ? 'next' : 'done'}
              onSubmitEditing={() =>
                role === 'doctor'
                  ? specialtyRef.current?.focus()
                  : handleRegister()
              }
              blurOnSubmit={role !== 'doctor'}
              onFocus={() => setFocusedInput('password')}
              onBlur={() => setFocusedInput(null)}
            />

            {/* SPECIALITATE (doar pentru medic) */}
            {role === 'doctor' && (
              <TextInput
                ref={specialtyRef}
                style={getStyleForInput('specialty')}
                placeholder="Specialitate (ex: Cardiologie)"
                value={specialty}
                onChangeText={setSpecialty}
                placeholderTextColor={placeholderColor}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
                onFocus={() => setFocusedInput('specialty')}
                onBlur={() => setFocusedInput(null)}
              />
            )}

            <TouchableOpacity
              style={[
                styles.buttonContainer,
                isLoading && styles.buttonDisabled,
              ]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <ThemedText style={styles.buttonText}>
                  CREEAZĂ CONT
                </ThemedText>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => router.back()}
              disabled={isLoading}
            >
              <ThemedText style={{ color: isDark ? '#A1A1A6' : '#666', fontSize: 15 }}>
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
  scrollContent: { 
    flexGrow: 1, 
    justifyContent: 'center', 
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 20,
    gap: 6,
  },
  logoIconBg: {
    width: 60,
    height: 60,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: '#007AFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    opacity: 0.6,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  inputFocused: {
    borderColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  buttonContainer: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
    height: 52,
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  loginLink: { marginTop: 24, alignItems: 'center', padding: 10 },
  linkText: { color: '#007AFF', fontWeight: '700' },
  roleContainer: {
    marginBottom: 20,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.8,
  },
  roleToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9,
  },
  roleOptionActive: {
    backgroundColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  roleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93',
  },
  roleTextActive: {
    color: '#FFFFFF',
  },
});
