import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { AuthProvider } from '@/context/AuthContext';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <>
      <AuthProvider>
        <ThemeProvider
          value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
        >
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

            <Stack.Screen
              name="modal"
              options={{ presentation: 'modal', title: 'Modal' }}
            />

            <Stack.Screen
              name="login"
              options={{
                title: 'Autentificare',
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="register"
              options={{
                title: 'Înregistrare',
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="add-analysis"
              options={{
                title: 'Adaugă Analiză',
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="istoric-detaliu"
              options={{
                title: 'Detalii Analize',
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="chart-detail"
              options={{
                title: 'Grafic',
              }}
            />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </AuthProvider>
      <Toast />
    </>
  );
}
