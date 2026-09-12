import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../utils/theme';


export default function AuthTextField({
  label,
  icon,
  value,
  onChangeText,
  error,
  secureTextEntry,
  colors = COLORS,
  inputStyle,
  ...inputProps
}) {
  const [isVisible, setIsVisible] = useState(false);
  const isPassword = !!secureTextEntry;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
      <View
        style={[
          styles.field,
          { backgroundColor: colors.background, borderColor: colors.border },
          error && { borderColor: colors.error },
        ]}
      >
        <Ionicons name={icon} size={18} color={colors.textSecondary} style={styles.icon} />
        <TextInput
          style={[styles.input, { color: colors.textPrimary }, inputStyle]}
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor={colors.textSecondary}
          secureTextEntry={isPassword && !isVisible}
          {...inputProps}
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setIsVisible((prev) => !prev)} hitSlop={styles.hitSlop}>
            <Ionicons
              name={isVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
      {!!error && <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  label: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: SPACING.xs,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
  },
  icon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    paddingVertical: SPACING.md,
    ...TYPOGRAPHY.body,
  },
  hitSlop: { top: 10, bottom: 10, left: 10, right: 10 },
  errorText: {
    ...TYPOGRAPHY.caption,
    marginTop: SPACING.xs,
  },
});
