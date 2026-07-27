import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ExpoLinking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import AuthTextField from '../../../components/AuthTextField';
import PrimaryButton from '../../../components/PrimaryButton';
import { useAuth } from '../../../context/AuthContext';
import { getAuthErrorMessage } from '../../../utils/authErrors';
import { isValidEmail } from '../../../utils/validators';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../../utils/theme';

export default function ForgotPasswordScreen({ navigation }) {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  // handleCodeInApp + a custom-scheme url means the reset link opens the
  // in-app Reset Password screen (Module 4) instead of Firebase's default
  // hosted page. See AppNavigator's linking config for the other half of this.
  const handleSend = async () => {
    setError(null);
    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      await requestPasswordReset(email.trim(), {
        url: ExpoLinking.createURL('reset-password'),
        handleCodeInApp: true,
      });
      setIsSent(true);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={styles.hitSlop}
          >
            <Ionicons name="chevron-back" size={20} color={COLORS.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Forgot Password</Text>
          <Text style={styles.headerSubtitle}>We&apos;ll send a reset link to your email</Text>
        </LinearGradient>

        {isSent ? (
          <View style={styles.body}>
            <View style={styles.iconBadge}>
              <Ionicons name="checkmark" size={36} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>Check your inbox</Text>
            <Text style={styles.subtitle}>
              We sent a password reset link to{'\n'}
              <Text style={styles.emailHighlight}>{email.trim()}</Text>
            </Text>
            <Text style={styles.caption}>
              Didn&apos;t receive it? Check your spam folder or wait a few minutes before
              trying again.
            </Text>

            <PrimaryButton title="Open Mail App" onPress={() => Linking.openURL('mailto:')} />
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setIsSent(false)}>
              <Text style={styles.secondaryButtonText}>Try a different email</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.body}>
            <View style={styles.iconBadge}>
              <Ionicons name="paper-plane-outline" size={32} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>Reset your password</Text>
            <Text style={styles.subtitle}>
              Enter the email address associated with your OrchidVision account
              and we&apos;ll send you a link to reset your password.
            </Text>

            <AuthTextField
              label="Email"
              icon="mail-outline"
              value={email}
              onChangeText={setEmail}
              placeholder="orchidvision@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              error={error}
            />

            <PrimaryButton title="Send Reset Link" onPress={handleSend} loading={isSubmitting} />

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('SignIn')}
            >
              <Text style={styles.secondaryButtonText}>Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1 },
  header: {
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.xl,
    borderBottomLeftRadius: RADIUS.lg * 2,
    borderBottomRightRadius: RADIUS.lg * 2,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  hitSlop: { top: 10, bottom: 10, left: 10, right: 10 },
  headerTitle: {
    ...TYPOGRAPHY.h1,
    color: COLORS.textInverse,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textInverseMuted,
    marginTop: SPACING.xs,
  },
  body: {
    padding: SPACING.xl,
  },
  iconBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EAF4E7',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    ...TYPOGRAPHY.h1,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.md,
  },
  emailHighlight: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  caption: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.pill,
    paddingVertical: SPACING.md,
    width: '100%',
    marginTop: SPACING.md,
  },
  secondaryButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.textSecondary,
  },
});
