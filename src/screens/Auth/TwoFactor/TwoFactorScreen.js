import React, { useEffect, useRef, useState } from 'react';
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
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../../utils/theme';

const RESEND_COOLDOWN_SECONDS = 30;

// Shown after a 2FA-enrolled account signs in (password or Google) — see
// AppNavigator's needsTwoFactor gate. A code is sent automatically on
// mount; confirmTwoFactorLogin() (which clears needsTwoFactor) is what lets
// AppNavigator swap through to Main/Admin, so there's no explicit
// navigation call here.
export default function TwoFactorScreen() {
  const { user, sendTwoFactorCode, verifyTwoFactorCode, confirmTwoFactorLogin, signOutUser } = useAuth();

  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const hasSentInitialCode = useRef(false);

  useEffect(() => {
    if (hasSentInitialCode.current) return;
    hasSentInitialCode.current = true;
    handleSendCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleSendCode = async () => {
    setError(null);
    setIsSending(true);
    try {
      await sendTwoFactorCode();
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(err?.message || 'Could not send the code. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleVerify = async () => {
    setError(null);
    if (code.trim().length < 6) {
      setError('Enter the code from your email.');
      return;
    }

    setIsVerifying(true);
    try {
      await verifyTwoFactorCode(code.trim());
      confirmTwoFactorLogin();
    } catch (err) {
      setError(err?.message || 'That code is invalid or expired.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.header}>
          <View style={styles.iconBadge}>
            <Ionicons name="shield-checkmark-outline" size={32} color={COLORS.textInverse} />
          </View>
          <Text style={styles.headerTitle}>Two-Factor Verification</Text>
          <Text style={styles.headerSubtitle}>
            We sent a 6-digit code to{'\n'}
            <Text style={styles.emailHighlight}>{user?.email}</Text>
          </Text>
        </LinearGradient>

        <View style={styles.body}>
          <AuthTextField
            label="Verification Code"
            icon="keypad-outline"
            value={code}
            onChangeText={setCode}
            placeholder="12345678"
            keyboardType="number-pad"
            maxLength={8}
            error={error}
          />

          <PrimaryButton title="Verify" onPress={handleVerify} loading={isVerifying} />

          <TouchableOpacity
            style={styles.resendLink}
            onPress={handleSendCode}
            disabled={isSending || cooldown > 0}
          >
            <Text style={[styles.resendText, (isSending || cooldown > 0) && styles.resendTextDisabled]}>
              {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={signOutUser}>
            <Text style={styles.secondaryButtonText}>Not you? Sign out</Text>
          </TouchableOpacity>
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
    paddingHorizontal: SPACING.xl,
    borderBottomLeftRadius: RADIUS.lg * 2,
    borderBottomRightRadius: RADIUS.lg * 2,
  },
  iconBadge: {
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
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  emailHighlight: {
    fontWeight: '700',
    color: COLORS.textInverse,
  },
  body: {
    padding: SPACING.xl,
  },
  resendLink: {
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  resendText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.primary,
  },
  resendTextDisabled: {
    color: COLORS.textSecondary,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.pill,
    paddingVertical: SPACING.md,
    width: '100%',
    marginTop: SPACING.xl,
  },
  secondaryButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.textSecondary,
  },
});
