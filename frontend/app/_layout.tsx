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
import { toastConfig } from '../config/toastConfig';

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
              name="login"
              options={{ title: 'Autentificare', presentation: 'modal' }}
            />
            <Stack.Screen
              name="register"
              options={{ title: 'Înregistrare', presentation: 'modal' }}
            />
            <Stack.Screen
              name="forgot-password"
              options={{ title: 'Resetare', presentation: 'modal' }}
            />
            <Stack.Screen
              name="reset-password"
              options={{ title: 'Confirmare', presentation: 'card' }}
            />
            <Stack.Screen
              name="add-analysis"
              options={{ title: 'Adaugă', presentation: 'modal' }}
            />
            <Stack.Screen
              name="buletin-detaliu"
              options={{ headerShown: false, presentation: 'card' }}
            />
            <Stack.Screen
              name="analiza-detaliu"
              options={{ headerShown: false, presentation: 'modal' }}
            />

            <Stack.Screen name="chart-detaliu" options={{ title: 'Grafic' }} />
          </Stack>
          <Toast config={toastConfig} />
          <StatusBar style="auto" />
        </ThemeProvider>
      </AuthProvider>
    </>
  );
}
