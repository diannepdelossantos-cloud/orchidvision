import React, { useCallback } from 'react';
import { Alert, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCameraPermissions } from 'expo-camera';
import PermissionCard from '../../components/PermissionCard';
import { useNotificationPermission } from '../../hooks/useNotificationPermission';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../utils/theme';

// Explains why a just-denied permission matters and offers a way to
// grant it later from Settings instead of silently moving on.
function explainDenied(label) {
  Alert.alert(
    `${label} permission denied`,
    `You can still use OrchidVision, but you can enable ${label.toLowerCase()} access anytime from your device Settings.`,
    [{ text: 'Got it' }],
  );
}

export default function PermissionsScreen({ navigation }) {
  const [cameraStatus, requestCamera] = useCameraPermissions();
  const [notificationStatus, requestNotifications] = useNotificationPermission();

  const handleRequestCamera = useCallback(async () => {
    const result = await requestCamera();
    if (!result.granted) explainDenied('Camera');
  }, [requestCamera]);

  const handleRequestNotifications = useCallback(async () => {
    const result = await requestNotifications();
    if (result.granted) return;

    if (result.status === 'unavailable') {
      Alert.alert(
        'Not available in Expo Go',
        "Notifications require a development build to test on this device — they'll work normally once OrchidVision runs outside Expo Go.",
        [{ text: 'Got it' }],
      );
      return;
    }
    explainDenied('Notification');
  }, [requestNotifications]);

  // Linking.openSettings() is native-only — there's no OS Settings app to
  // deep-link to from a browser, so web gets an explanatory message instead.
  const openSettings = useCallback(() => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Enable in your browser',
        'Open your browser\'s site settings for this page to change camera or notification permissions.',
      );
      return;
    }
    Linking.openSettings();
  }, []);

  const handleContinue = useCallback(() => {
    navigation.replace('SignIn');
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Enable Permissions</Text>
        <Text style={styles.subtitle}>
          OrchidVision uses these to scan your orchids and keep you informed
          about their health.
        </Text>
      </View>

      <View style={styles.cards}>
        <PermissionCard
          icon="camera-outline"
          title="Camera Access"
          description="Capture orchid images for disease detection."
          status={cameraStatus}
          onRequest={handleRequestCamera}
          onOpenSettings={openSettings}
        />
        <PermissionCard
          icon="notifications-outline"
          title="Notifications"
          description="Receive orchid care reminders and health alerts."
          status={notificationStatus}
          onRequest={handleRequestNotifications}
          onOpenSettings={openSettings}
        />
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={handleContinue}>
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  title: {
    ...TYPOGRAPHY.h1,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  cards: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  footer: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xl,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.pill,
  },
  buttonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.textInverse,
  },
});
