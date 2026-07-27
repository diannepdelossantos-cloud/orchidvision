import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AuthTextField from '../../../components/AuthTextField';
import PrimaryButton from '../../../components/PrimaryButton';
import { useAuth } from '../../../context/AuthContext';
import { getAuthErrorMessage } from '../../../utils/authErrors';
import { isValidPassword } from '../../../utils/validators';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../../utils/theme';

// Reached by tapping the reset link from the user's email (see
// ForgotPasswordScreen + AppNavigator's linking config for the oobCode's
// journey from Firebase's email into this screen's route params).
export default function ResetPasswordScreen({ route, navigation }) {
  const { verifyResetCode, confirmReset } = useAuth();
  const oobCode = route?.params?.oobCode;

  const [status, setStatus] = useState('verifying'); // 'verifying' | 'valid' | 'invalid'
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!oobCode) {
      setStatus('invalid');
      return;
    }

    let isActive = true;
    verifyResetCode(oobCode)
      .then(() => {
        if (isActive) setStatus('valid');
      })
      .catch(() => {
        if (isActive) setStatus('invalid');
      });

    return () => {
      isActive = false;
    };
  }, [oobCode, verifyResetCode]);

  const handleSubmit = async () => {
    setFormError(null);

    const nextErrors = {};
    if (!isValidPassword(password)) nextErrors.password = 'Password must be at least 8 characters.';
    if (confirmPassword !== password) nextErrors.confirmPassword = 'Passwords do not match.';
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      await confirmReset(oobCode, password);
      navigation.replace('PasswordUpdated');
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.header}>
          <View style={styles.iconBadgeHeader}>
            <Ionicons name="lock-closed-outline" size={30} color={COLORS.textInverse} />
          </View>
          <Text style={styles.headerTitle}>Reset Password</Text>
          <Text style={styles.headerSubtitle}>Create a new secure password</Text>
        </LinearGradient>

        <View style={styles.body}>
          {status === 'verifying' && (
            <View style={styles.centerState}>
              <ActivityIndicator color={COLORS.primary} size="large" />
              <Text style={styles.caption}>Verifying your reset link...</Text>
            </View>
          )}

          {status === 'invalid' && (
            <View style={styles.centerState}>
              <View style={styles.iconBadge}>
                <Ionicons name="alert-circle-outline" size={32} color={COLORS.error} />
              </View>
              <Text style={styles.title}>Link expired</Text>
              <Text style={styles.subtitle}>
                This reset link is invalid or has already been used. Please request a new one.
              </Text>
              <PrimaryButton
                title="Request New Link"
                onPress={() => navigation.replace('ForgotPassword')}
              />
            </View>
          )}

          {status === 'valid' && (
            <>
              <AuthTextField
                label="New Password"
                icon="lock-closed-outline"
                value={password}
                onChangeText={setPassword}
                placeholder="Minimum of 8 characters"
                secureTextEntry
                error={fieldErrors.password}
              />
              <AuthTextField
                label="Confirm Password"
                icon="lock-closed-outline"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter password"
                secureTextEntry
                error={fieldErrors.confirmPassword}
              />

              {!!formError && <Text style={styles.formError}>{formError}</Text>}

              <PrimaryButton title="Reset Password" onPress={handleSubmit} loading={isSubmitting} />
            </>
          )}

          {status !== 'invalid' && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('SignIn')}
            >
              <Text style={styles.secondaryButtonText}>Back to Sign In</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1 },
  header: {
    alignItems: 'center',
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xl,
    borderBottomLeftRadius: RADIUS.lg * 2,
    borderBottomRightRadius: RADIUS.lg * 2,
  },
  iconBadgeHeader: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
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
  centerState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  iconBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FDEBEA',
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: SPACING.xl,
  },
  caption: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  formError: {
    ...TYPOGRAPHY.caption,
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.pill,
    paddingVertical: SPACING.md,
    marginTop: SPACING.md,
  },
  secondaryButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.textSecondary,
  },
});
