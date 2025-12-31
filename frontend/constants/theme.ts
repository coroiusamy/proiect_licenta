import { useColorScheme } from 'react-native';

export const useTheme = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return {
    colors: {
      // Primary
      primary: '#007AFF',
      primaryDark: '#0051D5',
      primaryLight: 'rgba(0, 122, 255, 0.2)',

      // Secondary
      secondary: '#5856D6',
      success: '#34C759',
      warning: '#FF9500',
      danger: '#FF3B30',
      info: '#00C7BE',

      // Background
      background: isDark ? '#000000' : '#F8F9FA',
      surface: isDark ? '#1C1C1E' : '#FFFFFF',
      surface2: isDark ? '#2C2C2E' : '#F2F2F7',

      // Text
      text: isDark ? '#FFFFFF' : '#000000',
      textSecondary: isDark ? '#A1A1A6' : '#8E8E93',

      // Border
      border: isDark ? '#38383A' : '#E5E5EA',

      // Health-specific colors
      health: {
        glucose: '#FF9500',
        cholesterol: '#FF3B30',
        bloodPressure: '#5856D6',
        hemoglobin: '#FF2D55',
        weight: '#34C759',
        general: '#007AFF',
      },
    },

    spacing: {
      xs: 4,
      sm: 8,
      md: 12,
      lg: 16,
      xl: 20,
      xxl: 24,
      xxxl: 32,
    },

    typography: {
      h1: { fontSize: 32, fontWeight: 'bold' as const, lineHeight: 40 },
      h2: { fontSize: 28, fontWeight: 'bold' as const, lineHeight: 36 },
      h3: { fontSize: 24, fontWeight: 'bold' as const, lineHeight: 32 },
      h4: { fontSize: 20, fontWeight: 'bold' as const, lineHeight: 28 },
      body1: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
      body2: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
      subtitle: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24 },
      caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
      button: { fontSize: 16, fontWeight: 'bold' as const, lineHeight: 20 },
    },

    borderRadius: {
      sm: 8,
      md: 12,
      lg: 16,
      xl: 20,
      round: 999,
    },

    shadows: {
      small: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      },
      medium: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
      },
      large: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 5,
      },
    },

    isDark,
  };
};

// Helper function to get color for analysis type
export const getAnalysisTypeColor = (typeName: string): string => {
  const lower = typeName.toLowerCase();
  if (lower.includes('glucoz') || lower.includes('glicemi')) return '#FF9500';
  if (lower.includes('colesterol')) return '#FF3B30';
  if (lower.includes('tensiune') || lower.includes('presiune'))
    return '#5856D6';
  if (lower.includes('hemoglobin')) return '#FF2D55';
  if (lower.includes('greutate') || lower.includes('kg')) return '#34C759';
  return '#007AFF';
};

// Helper function to get icon for analysis type
export const getAnalysisTypeIcon = (typeName: string): string => {
  const lower = typeName.toLowerCase();
  if (lower.includes('glucoz') || lower.includes('glicemi'))
    return 'water-drop';
  if (lower.includes('colesterol')) return 'favorite';
  if (lower.includes('tensiune') || lower.includes('presiune'))
    return 'monitor-heart';
  if (lower.includes('hemoglobin')) return 'bloodtype';
  if (lower.includes('greutate') || lower.includes('kg'))
    return 'fitness-center';
  return 'science';
};
