import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AuthTextField from '../../components/AuthTextField';
import PrimaryButton from '../../components/PrimaryButton';
import DangerButton from '../../components/DangerButton';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useScanHistory } from '../../context/ScanHistoryContext';
import { useNotificationPreferences } from '../../hooks/useNotificationPreferences';
import { getAuthErrorMessage } from '../../utils/authErrors';
import { isValidPassword } from '../../utils/validators';
import { showAlert } from '../../utils/showAlert';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../utils/theme';

const THEME_OPTIONS = [
  { mode: 'light', label: 'Light', icon: 'sunny-outline' },
  { mode: 'dark', label: 'Dark', icon: 'moon-outline' },
  { mode: 'auto', label: 'Auto', icon: 'contrast-outline' },
];

function ToggleRow({ label, description, value, onValueChange, colors }) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>{label}</Text>
        <Text style={[styles.toggleDescription, { color: colors.textSecondary }]}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

export default function SettingsScreen() {
  const { colors, themeMode, setThemeMode } = useTheme();
  const {
    changePassword,
    twoFactorEnabled,
    sendTwoFactorCode,
    verifyTwoFactorCode,
    updateTwoFactorEnabled,
  } = useAuth();
  const { preferences, setPreference } = useNotificationPreferences();
  const { records, deleteRecord } = useScanHistory();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState({});
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [isSendingTwoFactorCode, setIsSendingTwoFactorCode] = useState(false);
  const [showTwoFactorCodeInput, setShowTwoFactorCodeInput] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorError, setTwoFactorError] = useState(null);
  const [isVerifyingTwoFactorCode, setIsVerifyingTwoFactorCode] = useState(false);

  const handleUpdatePassword = async () => {
    const nextErrors = {};
    if (!currentPassword) nextErrors.currentPassword = 'Current password is required.';
    if (!isValidPassword(newPassword)) nextErrors.newPassword = 'Password must be at least 8 characters.';
    if (confirmPassword !== newPassword) nextErrors.confirmPassword = 'Passwords do not match.';
    setPasswordErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsUpdatingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showAlert('Password updated', 'Your password has been changed.');
    } catch (error) {
      showAlert('Could not update password', getAuthErrorMessage(error));
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleEnableTwoFactor = async () => {
    setTwoFactorError(null);
    setIsSendingTwoFactorCode(true);
    try {
      await sendTwoFactorCode();
      setShowTwoFactorCodeInput(true);
    } catch (error) {
      showAlert('Could not send code', error?.message || 'Please try again.');
    } finally {
      setIsSendingTwoFactorCode(false);
    }
  };

  const handleCancelTwoFactorSetup = () => {
    setShowTwoFactorCodeInput(false);
    setTwoFactorCode('');
    setTwoFactorError(null);
  };

  const handleConfirmTwoFactorSetup = async () => {
    setTwoFactorError(null);
    if (twoFactorCode.trim().length < 6) {
      setTwoFactorError('Enter the code from your email.');
      return;
    }

    setIsVerifyingTwoFactorCode(true);
    try {
      await verifyTwoFactorCode(twoFactorCode.trim());
      await updateTwoFactorEnabled(true);
      setShowTwoFactorCodeInput(false);
      setTwoFactorCode('');
      showAlert('Two-Factor Authentication enabled', "You'll be asked for a code like this each time you sign in.");
    } catch (error) {
      setTwoFactorError(error?.message || 'That code is invalid or expired.');
    } finally {
      setIsVerifyingTwoFactorCode(false);
    }
  };

  const handleDisableTwoFactor = () => {
    showAlert('Turn off Two-Factor Authentication?', 'You can turn it back on anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Turn Off', style: 'destructive', onPress: () => updateTwoFactorEnabled(false) },
    ]);
  };

  const handleClearScanHistory = () => {
    if (records.length === 0) {
      showAlert('Nothing to clear', "You don't have any scan history yet.");
      return;
    }

    showAlert(
      'Clear scan history?',
      'Cleared scans move to Restore on the Profile screen and are kept for 30 days before being permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            Promise.all(records.map((record) => deleteRecord(record.id))).catch((error) => {
              showAlert('Could not clear history', error?.message || 'Please try again.');
            });
          },
        },
      ],
    );
  };

  const handleClearCache = () => {
    showAlert('Clear cache?', 'This frees up locally stored temporary data.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', onPress: () => showAlert('Cache cleared', 'Temporary data has been removed.') },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Settings</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Manage your OrchidVision settings
        </Text>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Notifications</Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <ToggleRow
            label="Email Notifications"
            description="Receive alerts via email"
            value={preferences.email}
            onValueChange={(value) => setPreference('email', value)}
            colors={colors}
          />
          <ToggleRow
            label="Push Notifications"
            description="Receive alerts on this device"
            value={preferences.push}
            onValueChange={(value) => setPreference('push', value)}
            colors={colors}
          />
          <ToggleRow
            label="Critical Alerts"
            description="High-priority health alerts"
            value={preferences.critical}
            onValueChange={(value) => setPreference('critical', value)}
            colors={colors}
          />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Appearance</Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>Theme Mode</Text>
          <View style={styles.themeRow}>
            {THEME_OPTIONS.map((option) => {
              const isSelected = themeMode === option.mode;
              return (
                <TouchableOpacity
                  key={option.mode}
                  style={[
                    styles.themeOption,
                    { borderColor: isSelected ? colors.primary : colors.border },
                    isSelected && { backgroundColor: `${colors.primary}1A` },
                  ]}
                  onPress={() => setThemeMode(option.mode)}
                >
                  <Ionicons
                    name={option.icon}
                    size={20}
                    color={isSelected ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.themeOptionText,
                      { color: isSelected ? colors.primary : colors.textSecondary },
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Security & Privacy</Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>Change Password</Text>
          <AuthTextField
            label="Current Password"
            icon="lock-closed-outline"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            error={passwordErrors.currentPassword}
            colors={colors}
          />
          <AuthTextField
            label="New Password"
            icon="lock-closed-outline"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Minimum of 8 characters"
            secureTextEntry
            error={passwordErrors.newPassword}
            colors={colors}
            inputStyle={styles.newPasswordInput}
          />
          <AuthTextField
            label="Confirm New Password"
            icon="lock-closed-outline"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            error={passwordErrors.confirmPassword}
            colors={colors}
          />

          <View style={styles.twoFactorRow}>
            <View style={styles.toggleText}>
              <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
                Two-Factor Authentication
              </Text>
              <Text style={[styles.toggleDescription, { color: colors.textSecondary }]}>
                {twoFactorEnabled
                  ? 'A code is emailed to you at every sign-in'
                  : 'Add extra layer of security'}
              </Text>
            </View>
            {twoFactorEnabled ? (
              <TouchableOpacity
                style={[styles.enableButton, { backgroundColor: colors.error }]}
                onPress={handleDisableTwoFactor}
              >
                <Text style={[styles.enableButtonText, { color: colors.textInverse }]}>Turn Off</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.enableButton, { backgroundColor: colors.primary }]}
                onPress={handleEnableTwoFactor}
                disabled={isSendingTwoFactorCode}
              >
                <Text style={[styles.enableButtonText, { color: colors.textInverse }]}>
                  {isSendingTwoFactorCode ? 'Sending…' : 'Enable'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {showTwoFactorCodeInput && (
            <View style={styles.twoFactorCodeBlock}>
              <Text style={[styles.toggleDescription, { color: colors.textSecondary }]}>
                Enter the code we emailed you to confirm.
              </Text>
              <AuthTextField
                label="Verification Code"
                icon="keypad-outline"
                value={twoFactorCode}
                onChangeText={setTwoFactorCode}
                placeholder="12345678"
                keyboardType="number-pad"
                maxLength={8}
                error={twoFactorError}
                colors={colors}
              />
              <View style={styles.twoFactorCodeActions}>
                <PrimaryButton
                  title="Confirm"
                  onPress={handleConfirmTwoFactorSetup}
                  loading={isVerifyingTwoFactorCode}
                  colors={colors}
                  style={styles.twoFactorConfirmButton}
                />
                <TouchableOpacity onPress={handleCancelTwoFactorSetup} style={styles.twoFactorCancelButton}>
                  <Text style={[styles.enableButtonText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <PrimaryButton
            title="Update Password"
            onPress={handleUpdatePassword}
            loading={isUpdatingPassword}
            colors={colors}
            style={styles.updatePasswordButton}
          />
        </View>

        <View style={styles.destructiveRow}>
          <DangerButton
            title="Clear scan history"
            variant="filled"
            size="small"
            onPress={handleClearScanHistory}
            colors={colors}
            style={styles.destructiveButton}
          />
          <DangerButton
            title="Clear cache"
            variant="outline"
            size="small"
            onPress={handleClearCache}
            colors={colors}
            style={styles.destructiveButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  title: {
    ...TYPOGRAPHY.h1,
  },
  newPasswordInput: {
    fontSize: 13,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    marginBottom: SPACING.lg,
  },
  sectionLabel: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  card: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  toggleText: {
    flex: 1,
    marginRight: SPACING.md,
  },
  toggleLabel: {
    ...TYPOGRAPHY.body,
    fontWeight: '700',
  },
  toggleDescription: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  themeRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
  },
  themeOptionText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    marginTop: 4,
  },
  twoFactorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  enableButton: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  enableButtonText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
  },
  twoFactorCodeBlock: {
    marginBottom: SPACING.lg,
  },
  twoFactorCodeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  twoFactorConfirmButton: {
    flex: 1,
  },
  twoFactorCancelButton: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  updatePasswordButton: {
    marginTop: SPACING.xs,
  },
  destructiveRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  destructiveButton: {
    flex: 1,
  },
});
