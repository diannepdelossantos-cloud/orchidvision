import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { RADIUS, SPACING, TYPOGRAPHY } from '../utils/theme';
import { showAlert } from '../utils/showAlert';

// Shared header for every Admin Control Center screen: title + subtitle on
// the left, a circular sign-out button on the right (matches the storyboard's
// red-outlined logout icon on every admin screen).
export default function AdminHeader({ title, subtitle }) {
  const { colors } = useTheme();
  const { signOutUser } = useAuth();

  const handleSignOut = () => {
    showAlert('Sign out?', 'You can sign back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOutUser },
    ]);
  };

  return (
    <View style={styles.row}>
      <View style={styles.textBlock}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        {!!subtitle && (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        )}
      </View>
      <TouchableOpacity
        onPress={handleSignOut}
        style={[styles.logoutButton, { borderColor: colors.danger }]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="log-out-outline" size={20} color={colors.danger} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  textBlock: { flex: 1 },
  title: { ...TYPOGRAPHY.h1 },
  subtitle: { ...TYPOGRAPHY.body, marginTop: 2 },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});