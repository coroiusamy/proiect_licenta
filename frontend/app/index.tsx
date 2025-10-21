import { useAuth } from '@/context/AuthContext';
import { Redirect } from 'expo-router';
import { View } from 'react-native';

export default function StartScreen() {
  const { token, isLoading } = useAuth();
  console.log(
    `[StartScreen] Decid ce fac: isLoading=${isLoading}, token=${token}`
  );

  if (isLoading) {
    return <View />;
  }

  if (token) {
    return <Redirect href="/(tabs)" />;
  } //utilizator logat -> ecran principal

  //altfel ->login
  return <Redirect href="/login" />;
}
