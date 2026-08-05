import React from 'react';
import { ActivityIndicator, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, RADIUS, SHADOW } from '../utils/theme';

const GOOGLE_LOGO = require('../assets/google-logo.png');

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
        <Image source={GOOGLE_LOGO} style={styles.logo} resizeMode="contain" />
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
  logo: {
    width: 28,
    height: 28,
  },
});