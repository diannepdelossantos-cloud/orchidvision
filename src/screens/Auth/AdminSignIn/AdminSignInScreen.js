import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import AuthTextField from '../../../components/AuthTextField';
import PrimaryButton from '../../../components/PrimaryButton';
import { useAuth } from '../../../context/AuthContext';
import { getAuthErrorMessage } from '../../../utils/authErrors';
import { isValidEmail } from '../../../utils/validators';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../../utils/theme';

// Control Center entrance. Reached only by a long-press on the logo in
// SignInScreen (or the orchidvision://admin deep link) — there is no
// visible link to it.
//
// Firebase Auth is a single user pool, so this screen has no separate
// credential store. It calls the same signIn() as SignInScreen (so the 2FA
// gate still applies), then reads the account's isAdmin flag and signs
// straight back out if the account is not an admin. SignInScreen does the
// mirror check and rejects admins, so each account type has exactly one
// door it can walk through.
//
// Hiding this screen is obscurity, not access control: the JS bundle ships
// to every device and every route name is readable in it. The real
// enforcement is this credential check plus firestore.rules, which refuses
// admin data to non-admin accounts whichever screen asked.
export default function AdminSignInScreen() {
  const { signIn, signOutUser } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

      // currentUser is populated as soon as signIn() resolves.
      const uid = getAuth().currentUser?.uid;
      const profile = await getDoc(doc(getFirestore(), 'users', uid));
      const isAdminAccount = profile.exists() && profile.data().role === 'admin';

      if (!isAdminAccount) {
        await signOutUser();
        setPassword('');
        // Deliberately vague: does not reveal whether the credentials were
        // valid, only that they do not belong here.
        setFormError('These credentials cannot be used here.');
        return;
      }

      // No navigate() call: AppNavigator swaps to the Admin stack on its
      // own once AuthContext resolves the admin role.
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={[COLORS.primaryDark, COLORS.primary]} style={styles.header}>
          <View style={styles.logoBadge}>
            <Ionicons name="lock-closed" size={34} color={COLORS.textInverse} />
          </View>
          <Text style={styles.headerTitle}>Control Center</Text>
          <Text style={styles.headerSubtitle}>Administrator access only</Text>
        </LinearGradient>

        <View style={styles.form}>
          <AuthTextField
            label="Admin Email"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            placeholder="admin@orchidvision.app"
            keyboardType="email-address"
            autoCapitalize="none"
            error={fieldErrors.email}
          />
          <AuthTextField
            label="Password"
            icon="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
            error={fieldErrors.password}
          />

          {!!formError && <Text style={styles.formError}>{formError}</Text>}

          <PrimaryButton title="Sign in" onPress={handleSignIn} loading={isSubmitting} />
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
  formError: {
    ...TYPOGRAPHY.caption,
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
});