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
              options={{ headerShown: false, presentation: 'modal' }}
            />
            <Stack.Screen
              name="register"
              options={{ headerShown: false, presentation: 'modal' }}
            />
            <Stack.Screen
              name="forgot-password"
              options={{ headerShown: false, presentation: 'modal' }}
            />
            <Stack.Screen
              name="reset-password"
              options={{ headerShown: false, presentation: 'card' }}
            />
            <Stack.Screen
              name="add-analysis"
              options={{ headerShown: false, presentation: 'modal' }}
            />
            <Stack.Screen name="comparator" options={{ headerShown: false }} />
            <Stack.Screen
              name="buletin-detaliu"
              options={{ headerShown: false, presentation: 'card' }}
            />
            <Stack.Screen
              name="analiza-detaliu"
              options={{ headerShown: false, presentation: 'modal' }}
            />
            <Stack.Screen
              name="chart-detaliu"
              options={{ headerShown: false }}
            />
          </Stack>
          <Toast config={toastConfig} />
          <StatusBar style="auto" />
        </ThemeProvider>
      </AuthProvider>
    </>
  );
}
