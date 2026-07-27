import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFERENCES_KEY = 'orchidvision:notificationPreferences';
const DEFAULT_PREFERENCES = { email: true, push: true, critical: true };

// These are in-app preferences (what the user *wants* to receive), separate
// from the OS-level notification permission handled in Module 1's
// Permissions screen (whether the OS *allows* notifications at all).
export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(PREFERENCES_KEY)
      .then((raw) => {
        if (raw) setPreferences({ ...DEFAULT_PREFERENCES, ...JSON.parse(raw) });
      })
      .finally(() => setLoading(false));
  }, []);

  const setPreference = (key, value) => {
    setPreferences((prev) => {
      const next = { ...prev, [key]: value };
      AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(next));
      return next;
    });
  };

  return { preferences, setPreference, loading };
}
