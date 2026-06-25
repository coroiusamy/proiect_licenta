import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

interface ScrapeState {
  isScraping: boolean;
  results: any[] | null;
  mode: 'single' | 'batch';
  query: string;
  selectedAnalyses: string[];
  error: string | null;
  resultsViewed: boolean;
}

interface ScrapeContextType extends ScrapeState {
  startScrape: (query: string, mode: 'single' | 'batch', analyses: string[]) => void;
  clearResults: () => void;
  markResultsAsViewed: () => void;
}

const ScrapeContext = createContext<ScrapeContextType>({
  isScraping: false,
  results: null,
  mode: 'single',
  query: '',
  selectedAnalyses: [],
  error: null,
  resultsViewed: false,
  startScrape: () => {},
  clearResults: () => {},
  markResultsAsViewed: () => {},
});

export const useScrape = () => useContext(ScrapeContext);

export function ScrapeProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [state, setState] = useState<ScrapeState>({
    isScraping: false,
    results: null,
    mode: 'single',
    query: '',
    selectedAnalyses: [],
    error: null,
    resultsViewed: false,
  });

  // Prevent duplicate scrapes
  const scrapeInProgress = useRef(false);

  const clearResults = useCallback(() => {
    setState((prev) => ({
      ...prev,
      results: null,
      error: null,
      resultsViewed: false,
    }));
  }, []);

  const markResultsAsViewed = useCallback(() => {
    setState((prev) => ({
      ...prev,
      resultsViewed: true,
    }));
  }, []);

  const startScrape = useCallback(
    (query: string, mode: 'single' | 'batch', analyses: string[]) => {
      if (scrapeInProgress.current) return;
      scrapeInProgress.current = true;

      setState((prev) => ({
        ...prev,
        isScraping: true,
        results: null,
        error: null,
        query,
        mode,
        selectedAnalyses: analyses,
        resultsViewed: false,
      }));

      // Fire-and-forget background scrape
      (async () => {
        try {
          const scrapeTimeout = 90000;
          let response;

          if (mode === 'single') {
            response = await axios.get(`${API_URL}/api/prices`, {
              params: { analysisName: query },
              headers: { Authorization: `Bearer ${token}` },
              timeout: scrapeTimeout,
            });
          } else {
            response = await axios.get(`${API_URL}/api/prices`, {
              params: { analysisNames: analyses.join(',') },
              headers: { Authorization: `Bearer ${token}` },
              timeout: scrapeTimeout,
            });
          }

          const data = response.data.data || [];

          setState((prev) => ({
            ...prev,
            isScraping: false,
            results: data,
            error: null,
          }));

          // Success toast
          if (data.length > 0) {
            Toast.show({
              type: 'success',
              text1: mode === 'single' ? 'Prețuri găsite! 🏷️' : 'Pachete găsite! 📊',
              text2: mode === 'single'
                ? `${data.length} oferte disponibile. Atinge pentru detalii.`
                : `${data.length} pachete comparate. Atinge pentru detalii.`,
              visibilityTime: 5000,
              onPress: () => {
                Toast.hide();
                router.push('/comparator');
              },
            });
          } else {
            Toast.show({
              type: 'info',
              text1: 'Niciun rezultat 🔍',
              text2: 'Nu am găsit prețuri pentru căutarea ta.',
              visibilityTime: 4000,
            });
          }
        } catch (error: any) {
          setState((prev) => ({
            ...prev,
            isScraping: false,
            results: null,
            error: error.message || 'Eroare la căutare',
          }));

          Toast.show({
            type: 'error',
            text1: 'Căutare eșuată ❌',
            text2: 'Nu am putut prelua prețurile. Încearcă din nou.',
            visibilityTime: 5000,
          });
        } finally {
          scrapeInProgress.current = false;
        }
      })();
    },
    [token],
  );

  return (
    <ScrapeContext.Provider value={{ ...state, startScrape, clearResults, markResultsAsViewed }}>
      {children}
    </ScrapeContext.Provider>
  );
}
