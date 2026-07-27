import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, DARK_COLORS } from '../utils/theme';

const THEME_MODE_KEY = 'orchidvision:themeMode';
const ThemeContext = createContext(null);

// Drives the Settings screen's Light/Dark/Auto picker. Only screens that
// call useTheme() (Profile, Settings, the tab bar) respond to this — it
// does not retheme the rest of the app, which still imports COLORS directly.
export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState('light');

  useEffect(() => {
    AsyncStorage.getItem(THEME_MODE_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'auto') {
        setThemeModeState(saved);
      }
    });
  }, []);

  const setThemeMode = (mode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(THEME_MODE_KEY, mode);
  };

  const isDark = themeMode === 'dark' || (themeMode === 'auto' && systemScheme === 'dark');
  const colors = isDark ? DARK_COLORS : COLORS;

  const value = useMemo(
    () => ({ themeMode, setThemeMode, colors, isDark }),
    [themeMode, colors, isDark],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
