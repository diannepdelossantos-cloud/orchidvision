import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOW } from '../utils/theme';

// The circular "continue with Google" button shown on the Sign In screen.
export default function GoogleButton({ onPress, loading, disabled }) {
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityLabel="Continue with Google"
    >
      {loading ? (
        <ActivityIndicator color={COLORS.textPrimary} />
      ) : (
        <Ionicons name="logo-google" size={22} color="#DB4437" />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.soft,
  },
});
