import { useAuth } from '@/context/AuthContext';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const { token, isLoading } = useAuth();
  const colorScheme = useColorScheme();

  if (isLoading) {
    return <View />;
  } //asteptare verificare token conexiune

  if (!token) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      {/* --- Tab 1: Home (Dashboard) --- */}
      <Tabs.Screen
        name="index" // Acesta e app/(tabs)/index.tsx
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />

      {/* --- Tab 2: Istoric (Rămâne la fel) --- */}
      <Tabs.Screen
        name="istoric"
        options={{
          title: 'Istoric',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="list.bullet" color={color} />
          ),
        }}
      />

      {/* --- TAB NOU 3: Butonul "Adaugă" (Central) --- */}
      <Tabs.Screen
        name="adauga" // Vom crea un fișier 'adauga.tsx'
        options={{
          title: 'Adaugă',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={34} name="plus.circle.fill" color={color} /> // Iconiță mai mare
          ),
        }}
        // Vom adăuga un listener care să deschidă un modal
      />

      {/* --- TAB NOU 4: Profil --- */}
      <Tabs.Screen
        name="profil" // Vom crea un fișier 'profil.tsx'
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="person.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
