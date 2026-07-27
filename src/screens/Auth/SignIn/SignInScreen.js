import React, { useState } from 'react';
import {
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
import GoogleButton from '../../../components/GoogleButton';
import { useAuth } from '../../../context/AuthContext';
import { useGoogleSignIn } from '../../../hooks/useGoogleSignIn';
import { getAuthErrorMessage } from '../../../utils/authErrors';
import { isValidEmail } from '../../../utils/validators';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../../utils/theme';

export default function SignInScreen({ navigation }) {
  const { signIn } = useAuth();
  const google = useGoogleSignIn();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Once signIn() resolves, AuthContext's onAuthStateChanged listener flips
  // `user` to a non-null value, and AppNavigator (auth-gated) swaps the
  // whole stack over to Home on its own — no explicit navigate() needed here.
  const handleSignIn = async () => {
    setFormError(null);

    const nextErrors = {};
    if (!isValidEmail(email)) nextErrors.email = 'Enter a valid email address.';
    if (!password) nextErrors.password = 'Password is required.';
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      await signIn(email.trim(), password);
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
          <View style={styles.logoBadge}>
            <Ionicons name="leaf" size={34} color={COLORS.textInverse} />
          </View>
          <Text style={styles.headerTitle}>Welcome back!</Text>
          <Text style={styles.headerSubtitle}>Sign in to OrchidVision</Text>
        </LinearGradient>

        <View style={styles.form}>
          <AuthTextField
            label="Email"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            placeholder="orchidvision@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={fieldErrors.email}
          />
          <AuthTextField
            label="Password"
            icon="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
            placeholder="Minimum of 8 characters"
            secureTextEntry
            error={fieldErrors.password}
          />

          <TouchableOpacity
            style={styles.forgotLink}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          {!!formError && <Text style={styles.formError}>{formError}</Text>}

          <PrimaryButton title="Sign in" onPress={handleSignIn} loading={isSubmitting} />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.googleRow}>
            <GoogleButton
              onPress={() => google.promptAsync()}
              loading={google.isSigningIn}
              disabled={!google.isReady}
            />
          </View>
          {!!google.error && <Text style={styles.formError}>{google.error}</Text>}

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don&apos;t have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.footerLink}>Sign up</Text>
            </TouchableOpacity>
          </View>
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
    paddingBottom: SPACING.xxl,
    borderBottomLeftRadius: RADIUS.lg * 2,
    borderBottomRightRadius: RADIUS.lg * 2,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
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
  form: {
    padding: SPACING.xl,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: SPACING.lg,
  },
  forgotText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.primary,
  },
  formError: {
    ...TYPOGRAPHY.caption,
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginHorizontal: SPACING.sm,
  },
  googleRow: {
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.xl,
  },
  footerText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  footerLink: {
    ...TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
