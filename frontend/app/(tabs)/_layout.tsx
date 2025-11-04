import { useAuth } from '@/context/AuthContext';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const { token, isLoading } = useAuth(); // Preluăm starea de la "gardian"
  const colorScheme = useColorScheme();

  // 1. Așteaptă ca "gardianul" să verifice dacă există un token salvat
  if (isLoading) {
    return <View />; // Arată un ecran gol în timpul încărcării
  }

  // 2. Dacă s-a terminat încărcarea și NU există token, dă afară
  if (!token) {
    return <Redirect href="/login" />;
  }

  // 3. Utilizatorul este logat, afișează tab-urile
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
        name="index" // -> app/(tabs)/index.tsx
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            // Iconița ta mapată: 'house.fill'
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />

      {/* --- Tab 2: Istoric --- */}
      <Tabs.Screen
        name="istoric" // -> app/(tabs)/istoric.tsx
        options={{
          title: 'Istoric',
          tabBarIcon: ({ color }) => (
            // Iconița ta mapată: 'list.bullet'
            <IconSymbol size={28} name="list.bullet" color={color} />
          ),
        }}
      />

      {/* --- Tab 3: Adaugă (Central) --- */}
      <Tabs.Screen
        name="adauga" // -> app/(tabs)/adauga.tsx
        options={{
          title: 'Adaugă',
          tabBarIcon: ({ color }) => (
            // Iconița ta mapată: 'plus.circle.fill'
            <IconSymbol size={34} name="plus.circle.fill" color={color} />
          ),
        }}
      />

      {/* --- Tab 4: Profil --- */}
      <Tabs.Screen
        name="profil" // -> app/(tabs)/profil.tsx
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => (
            // Iconița ta mapată: 'person.fill'
            <IconSymbol size={28} name="person.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
