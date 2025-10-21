import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { SplashScreen } from 'expo-router';

// date "gardian"
type AuthContextType = {
  token: string | null;
  isLoading: boolean;
  login: (newToken: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Începe ca "true"

  useEffect(() => {
    const loadToken = async () => {
      console.log('[AuthContext] Încep să caut token-ul...'); // DEBUG
      try {
        const storedToken = await SecureStore.getItemAsync('userToken');

        if (storedToken) {
          console.log('[AuthContext] Am găsit token-ul:', storedToken); // DEBUG
          setToken(storedToken);
        } else {
          console.log('[AuthContext] Nu am găsit niciun token salvat.'); // DEBUG
        }
      } catch (e) {
        console.error('Eroare la încărcarea token-ului', e); // DEBUG
      } finally {
        setIsLoading(false);
        SplashScreen.hideAsync();
      }
    };

    loadToken();
  }, []);

  const login = (newToken: string) => {
    setToken(newToken);
    SecureStore.setItemAsync('userToken', newToken);

    console.log('[AuthContext] Token salvat în seif:', newToken);

    router.replace('/(tabs)');
  };

  const logout = () => {
    setToken(null);
    SecureStore.deleteItemAsync('userToken');
    router.replace('/login');
  };

  return (
    <AuthContext.Provider value={{ token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
