import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RADIUS, SPACING, TAG_COLORS, TYPOGRAPHY } from '../utils/theme';

// Small pill used across the Admin Control Center for disease category
// ("Fungal"/"Bacterial"/"Viral"), severity ("Mild"/"Moderate"/"Severe"),
// and status ("Active"/"Inactive", "Admin"/"User") tags. `tone` looks up
// a preset in TAG_COLORS; pass explicit `bg`/`color` to override.
export default function Badge({ label, tone = 'info', bg, color, outline, style }) {
  const preset = TAG_COLORS[tone] || TAG_COLORS.info;
  const backgroundColor = bg || (outline ? 'transparent' : preset.bg);
  const textColor = color || preset.text;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor },
        outline && { borderWidth: 1, borderColor: textColor },
        style,
      ]}
    >
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
  },
  text: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    fontWeight: '700',
  },
});