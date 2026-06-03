import React, { useState, useEffect } from 'react';
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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import axios, { isAxiosError } from 'axios';
import Toast from 'react-native-toast-message';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { MaterialIcons } from '@expo/vector-icons';

import { useAuth } from '@/context/AuthContext';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

export default function LoginScreen() {
  const { login } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<'email' | 'password' | null>(null);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
    });
  }, []);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices();

      // Deconectare pentru a arăta mereu selectorul de conturi
      await GoogleSignin.signOut();

      const response = await GoogleSignin.signIn();

      if (response.data?.idToken) {
        const res = await axios.post(`${API_URL}/api/auth/google`, {
          idToken: response.data.idToken,
        });
        login(res.data.token, res.data.user?.role);
      } else {
        throw new Error('Nu s-a putut obține token-ul Google');
      }
    } catch (error: any) {
      let message = 'Eroare la autentificarea cu Google';

      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // Utilizatorul a anulat - nu afișăm eroare
        setIsGoogleLoading(false);
        return;
      } else if (error.code === statusCodes.IN_PROGRESS) {
        message = 'Autentificare în curs...';
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        message = 'Google Play Services nu este disponibil';
      } else if (isAxiosError(error)) {
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
      login(token, response.data.user?.role);
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

  const inputBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const inputColor = isDark ? '#FFFFFF' : '#000000';
  const placeholderColor = isDark ? '#8E8E93' : '#A1A1A6';
  const containerBg = isDark ? '#000000' : '#F8F9FA';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: containerBg }]} edges={['top', 'bottom']}>
      <ThemedView style={[styles.container, { backgroundColor: containerBg }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* BRANDING LOGO */}
            <View style={styles.logoSection}>
              <View style={[styles.logoIconBg, { backgroundColor: '#007AFF15' }]}>
                <MaterialIcons name="healing" size={36} color="#007AFF" />
              </View>
            </View>

            <View style={styles.headerSection}>
              <ThemedText style={styles.title}>Bine ai venit!</ThemedText>
              <ThemedText style={styles.subtitle}>
                Conectează-te pentru a-ți monitoriza sănătatea
              </ThemedText>
            </View>

            <TextInput
              style={[
                styles.input,
                { backgroundColor: inputBg, color: inputColor },
                focusedInput === 'email' && styles.inputFocused,
              ]}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              placeholderTextColor={placeholderColor}
              returnKeyType="next"
              onFocus={() => setFocusedInput('email')}
              onBlur={() => setFocusedInput(null)}
            />

            <TextInput
              style={[
                styles.input,
                { backgroundColor: inputBg, color: inputColor },
                focusedInput === 'password' && styles.inputFocused,
              ]}
              placeholder="Parolă"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor={placeholderColor}
              autoComplete="password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              onFocus={() => setFocusedInput('password')}
              onBlur={() => setFocusedInput(null)}
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
              style={[
                styles.buttonContainer,
                isLoading && styles.buttonDisabled,
              ]}
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
              <ThemedText style={styles.dividerText}>sau continuă cu</ThemedText>
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
                { 
                  backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                  borderColor: isDark ? '#3A3A3C' : '#E5E5EA'
                },
              ]}
              onPress={handleGoogleSignIn}
              disabled={isGoogleLoading || isLoading}
            >
              {isGoogleLoading ? (
                <ActivityIndicator color="#007AFF" />
              ) : (
                <>
                  <View style={styles.googleIconWrapper}>
                    <MaterialIcons
                      name="health-and-safety"
                      size={20}
                      color="#007AFF"
                    />
                  </View>
                  <ThemedText style={styles.googleButtonText}>
                    Google Account
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
              <ThemedText
                style={[styles.registerText, styles.registerLinkText]}
              >
                Înregistrează-te
              </ThemedText>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  logoIconBg: {
    width: 68,
    height: 68,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  logoText: {
    fontSize: 24,
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
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  headerSection: {
    marginBottom: 10,
  },
  input: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
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
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    marginTop: -4,
    padding: 4,
  },
  forgotPasswordText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 14,
  },
  buttonContainer: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
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
  registerLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    padding: 10,
  },
  registerText: {
    fontSize: 15,
    opacity: 0.7,
  },
  registerLinkText: {
    color: '#007AFF',
    fontWeight: '700',
    opacity: 1,
    marginLeft: 4,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    opacity: 0.5,
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#8E8E93',
    fontSize: 14,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  googleIconWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
});
