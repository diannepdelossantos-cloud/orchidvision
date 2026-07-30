import { Alert, Platform } from 'react-native';

// react-native-web ships Alert.alert as a no-op, so on web every
// confirmation/error dialog in the app would silently do nothing (including
// the Sign Out confirmation). This mirrors the Alert.alert(title, message,
// buttons) API but falls back to window.confirm/alert on web.
export function showAlert(title, message = '', buttons) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  const text = message ? `${title}\n\n${message}` : title;

  if (!buttons || buttons.length <= 1) {
    window.alert(text);
    buttons?.[0]?.onPress?.();
    return;
  }

  const cancelButton = buttons.find((button) => button.style === 'cancel');
  const confirmButton = buttons.find((button) => button !== cancelButton) ?? buttons[buttons.length - 1];

  if (window.confirm(text)) {
    confirmButton?.onPress?.();
  } else {
    cancelButton?.onPress?.();
  }
}
