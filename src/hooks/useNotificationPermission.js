import { useCallback, useEffect, useState } from 'react';
import { isRunningInExpoGo } from 'expo';

// expo-notifications throws as soon as it's imported when running inside
// Expo Go on Android (SDK 53+ removed its push-notification support from
// Expo Go entirely — see https://docs.expo.dev/develop/development-builds/).
// require()'ing it lazily, only outside Expo Go, keeps the rest of the app
// usable in Expo Go; this still works normally the moment it runs in a real
// development build or standalone app, with no further code change needed.
const IS_EXPO_GO = isRunningInExpoGo();
const UNAVAILABLE_STATUS = { granted: false, canAskAgain: false, status: 'unavailable' };

export function useNotificationPermission() {
  const [status, setStatus] = useState(IS_EXPO_GO ? UNAVAILABLE_STATUS : null);

  useEffect(() => {
    if (IS_EXPO_GO) return;
    const Notifications = require('expo-notifications');
    Notifications.getPermissionsAsync().then(setStatus);
  }, []);

  const request = useCallback(async () => {
    if (IS_EXPO_GO) {
      setStatus(UNAVAILABLE_STATUS);
      return UNAVAILABLE_STATUS;
    }
    const Notifications = require('expo-notifications');
    const result = await Notifications.requestPermissionsAsync();
    setStatus(result);
    return result;
  }, []);

  return [status, request];
}
