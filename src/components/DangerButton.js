import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../utils/theme';

// Destructive-action button used by Profile (Sign Out) and Settings (Clear
// scan history / Clear cache), matching the two treatments shown in the
// storyboard: `outline` (Sign Out) and `filled` (Clear scan history).
export default function DangerButton({
  title,
  onPress,
  icon,
  variant = 'outline',
  size = 'default',
  loading,
  disabled,
  colors = COLORS,
  style,
}) {
  const isFilled = variant === 'filled';
  const isSmall = size === 'small';
  const isDisabled = disabled || loading;
  const contentColor = isFilled ? colors.textInverse : colors.error;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isSmall ? styles.buttonSmall : styles.buttonDefault,
        isFilled
          ? { backgroundColor: colors.error }
          : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator color={contentColor} size={isSmall ? 'small' : undefined} />
      ) : (
        <>
          {icon && (
            <Ionicons name={icon} size={isSmall ? 14 : 18} color={contentColor} style={styles.icon} />
          )}
          <Text style={[isSmall ? styles.textSmall : styles.text, { color: contentColor }]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.pill,
  },
  buttonDefault: {
    paddingVertical: SPACING.md,
  },
  buttonSmall: {
    paddingVertical: SPACING.xs,
  },
  disabled: {
    opacity: 0.6,
  },
  icon: {
    marginRight: SPACING.xs,
  },
  text: {
    ...TYPOGRAPHY.button,
  },
  textSmall: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
  },
});
