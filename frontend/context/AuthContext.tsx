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

// ✅ Configurare globală Axios - timeout de 15 secunde
axios.defaults.timeout = 15000;

type AuthContextType = {
  token: string | null;
  isLoading: boolean;
  login: (newToken: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Ref pentru a preveni logout-uri multiple simultane
  const isLoggingOut = useRef(false);

  // Funcția de Logout (o definim aici ca să o folosim și în interceptor)
  const logout = async () => {
    // Prevenim logout-uri multiple simultane
    if (isLoggingOut.current) return;
    isLoggingOut.current = true;

    console.log('[AuthContext] Execut logout...');
    setToken(null);
    await SecureStore.deleteItemAsync('userToken');
    // Folosim replace ca să nu se poată întoarce cu butonul Back
    router.replace('/login');

    // Reset după un mic delay
    setTimeout(() => {
      isLoggingOut.current = false;
    }, 1000);
  };

  const login = (newToken: string) => {
    setToken(newToken);
    SecureStore.setItemAsync('userToken', newToken);
    console.log('[AuthContext] Token salvat în seif.');
    router.replace('/(tabs)');
  };

  // 1. Încărcare Token la pornire
  useEffect(() => {
    const loadToken = async () => {
      console.log('[AuthContext] Încep să caut token-ul...');
      try {
        const storedToken = await SecureStore.getItemAsync('userToken');

        if (storedToken) {
          console.log('[AuthContext] Am găsit token.');
          setToken(storedToken);
        } else {
          console.log('[AuthContext] Nu am găsit token.');
        }
      } catch (e) {
        console.error('Eroare la încărcarea token-ului', e);
      } finally {
        setIsLoading(false);
        SplashScreen.hideAsync();
      }
    };

    loadToken();
  }, []);

  // ✅ 2. INTERCEPTOR AXIOS - Gestionează expirarea token-ului și erorile de rețea
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response, // Dacă cererea e ok, nu facem nimic
      async (error) => {
        const requestUrl = error.config?.url || '';

        // ✅ Excludem rutele de autentificare din interceptor
        // (login, register, forgot-password nu ar trebui să declanșeze logout)
        const isAuthRoute =
          requestUrl.includes('/auth/login') ||
          requestUrl.includes('/auth/register') ||
          requestUrl.includes('/auth/forgot-password') ||
          requestUrl.includes('/auth/reset-password');

        // Dacă primim eroare 401 (Unauthorized) de la backend și NU e rută de auth
        if (error.response?.status === 401 && !isAuthRoute) {
          console.log(
            '⚠️ [AuthContext] Token expirat sau invalid (401). Deconectare automată...',
          );
          await logout();
          // Nu mai aruncăm eroarea - utilizatorul e deja redirecționat la login
          return new Promise(() => {}); // Promise care nu se rezolvă - oprește chain-ul
        }

        // ✅ Gestionare erori de rețea (timeout, server indisponibil, etc.)
        if (error.code === 'ECONNABORTED') {
          console.log(
            '⚠️ [AuthContext] Timeout - serverul nu răspunde la timp.',
          );
        } else if (!error.response) {
          console.log(
            '⚠️ [AuthContext] Eroare de rețea - nu s-a putut conecta la server.',
          );
        }

        return Promise.reject(error);
      },
    );

    // Curățenie la unmount
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []); // Rulează o singură dată la montarea AuthProvider

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
