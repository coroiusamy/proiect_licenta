import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { SplashScreen } from 'expo-router';
import axios from 'axios';

// Configurare globală Axios
axios.defaults.timeout = 15000;

type AuthContextType = {
  token: string | null;
  role: string | null;
  isLoading: boolean;
  login: (newToken: string, userRole?: string, isFirstLogin?: boolean) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Ref pentru a preveni logout-uri multiple simultane
  const isLoggingOut = useRef(false);

  // Funcția de Logout (o definim aici ca să o folosim și în interceptor)
  const logout = async () => {
    // Prevenim logout-uri multiple simultane
    if (isLoggingOut.current) return;
    isLoggingOut.current = true;

    await SecureStore.deleteItemAsync('userToken');
    await SecureStore.deleteItemAsync('userRole');
    // Setăm token null → (tabs)/_layout.tsx va face automat Redirect la /login
    setToken(null);
    setRole(null);

    // Reset după un mic delay
    setTimeout(() => {
      isLoggingOut.current = false;
    }, 1000);
  };

  const login = (newToken: string, userRole?: string, isFirstLogin?: boolean) => {
    setToken(newToken);
    const resolvedRole = userRole || 'patient';
    setRole(resolvedRole);
    SecureStore.setItemAsync('userToken', newToken);
    SecureStore.setItemAsync('userRole', resolvedRole);
    if (resolvedRole === 'doctor') {
      router.replace('/(tabs)/pacienti');
    } else if (isFirstLogin) {
      router.replace('/(tabs)/profil?edit=true');
    } else {
      router.replace('/(tabs)');
    }
  };

  // Încărcare Token la pornire
  useEffect(() => {
    const loadToken = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync('userToken');

        if (storedToken) {
          setToken(storedToken);
          const storedRole = await SecureStore.getItemAsync('userRole');
          setRole(storedRole || 'patient');
        }
      } catch (_) {
        // Token corupt sau inaccesibil
      } finally {
        setIsLoading(false);
        SplashScreen.hideAsync();
      }
    };

    loadToken();
  }, []);

  // Interceptor Axios - gestionează expirarea token-ului și erorile de rețea
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const requestUrl = error.config?.url || '';

        // Excludere rute de autentificare din interceptor
        const isAuthRoute =
          requestUrl.includes('/auth/login') ||
          requestUrl.includes('/auth/register') ||
          requestUrl.includes('/auth/forgot-password') ||
          requestUrl.includes('/auth/reset-password');
        if (error.response?.status === 401 && !isAuthRoute) {
          await logout();
          return new Promise(() => {});
        }

        return Promise.reject(error);
      },
    );

    // Curățenie la unmount
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ token, role, isLoading, login, logout }}>
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
