import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PrimaryButton from '../../../components/PrimaryButton';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../../utils/theme';

export default function PasswordUpdatedScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconBadge}>
          <Ionicons name="checkmark" size={48} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>Password reset successfully!</Text>
        <Text style={styles.subtitle}>
          Your password has been updated. You can now sign in to your
          OrchidVision account with your new password.
        </Text>

        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Security Tips</Text>
          <Text style={styles.tipItem}>• Never share your password with anyone.</Text>
          <Text style={styles.tipItem}>• Use a unique password for each service.</Text>
          <Text style={styles.tipItem}>
            • Enable Two-Factor Verification for extra account protection.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <PrimaryButton title="Sign in Now" onPress={() => navigation.replace('SignIn')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  iconBadge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#EAF4E7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    ...TYPOGRAPHY.h1,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  tipsCard: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  tipsTitle: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  tipItem: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xl,
  },
});
