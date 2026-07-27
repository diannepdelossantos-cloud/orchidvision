import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../utils/theme';

// The single pill-shaped green button reused across every Auth screen
// (Sign In, Create Account, Send Reset Link, ...). Shows a spinner in
// place of the label while an async action is in flight.
// `colors` defaults to the static light palette (existing callers keep
// working unchanged); theme-aware screens pass colors={useTheme().colors}.
export default function PrimaryButton({ title, onPress, loading, disabled, style, colors = COLORS }) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: colors.primary },
        isDisabled && styles.buttonDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator color={colors.textInverse} />
      ) : (
        <Text style={[styles.text, { color: colors.textInverse }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.pill,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  text: {
    ...TYPOGRAPHY.button,
  },
});
