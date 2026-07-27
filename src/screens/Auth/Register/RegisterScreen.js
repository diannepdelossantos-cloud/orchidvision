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
import { useAuth } from '../../../context/AuthContext';
import { getAuthErrorMessage } from '../../../utils/authErrors';
import { isValidEmail, isValidPassword } from '../../../utils/validators';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../../utils/theme';

export default function RegisterScreen({ navigation }) {
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // A successful signUp() creates the Firebase Auth account and signs the
  // user in immediately, which flips AuthContext's `user` and lets
  // AppNavigator swap to Home on its own.
  const handleCreateAccount = async () => {
    setFormError(null);

    const nextErrors = {};
    if (!fullName.trim()) nextErrors.fullName = 'Full name is required.';
    if (!isValidEmail(email)) nextErrors.email = 'Enter a valid email address.';
    if (!location.trim()) nextErrors.location = 'Station / location is required.';
    if (!isValidPassword(password)) nextErrors.password = 'Password must be at least 8 characters.';
    if (confirmPassword !== password) nextErrors.confirmPassword = 'Passwords do not match.';
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      await signUp({
        fullName: fullName.trim(),
        email: email.trim(),
        location: location.trim(),
        password,
      });
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={styles.hitSlop}
          >
            <Ionicons name="chevron-back" size={20} color={COLORS.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Account</Text>
          <Text style={styles.headerSubtitle}>Join OrchidVision today</Text>
        </LinearGradient>

        <View style={styles.form}>
          <AuthTextField
            label="Full Name"
            icon="person-outline"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Orchid Vision Team"
            autoCapitalize="words"
            error={fieldErrors.fullName}
          />
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
            label="Station / Location"
            icon="location-outline"
            value={location}
            onChangeText={setLocation}
            placeholder="e.g. Greenhouse A"
            error={fieldErrors.location}
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
          <AuthTextField
            label="Confirm Password"
            icon="lock-closed-outline"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter password"
            secureTextEntry
            error={fieldErrors.confirmPassword}
          />

          <Text style={styles.terms}>
            By creating an account you agree to our Terms of Service and Privacy Policy.
          </Text>

          {!!formError && <Text style={styles.formError}>{formError}</Text>}

          <PrimaryButton title="Create Account" onPress={handleCreateAccount} loading={isSubmitting} />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
              <Text style={styles.footerLink}>Sign in</Text>
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
  form: {
    padding: SPACING.xl,
  },
  terms: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    lineHeight: 18,
  },
  formError: {
    ...TYPOGRAPHY.caption,
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: SPACING.md,
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
