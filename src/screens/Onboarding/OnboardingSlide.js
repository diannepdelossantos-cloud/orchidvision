import React from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY } from '../../utils/theme';

export default function OnboardingSlide({ slide }) {
  const { width: SCREEN_WIDTH } = useWindowDimensions();

  return (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <View style={styles.illustration}>
        <View style={styles.iconBadge}>
          <Ionicons name={slide.icon} size={72} color={COLORS.primary} />
        </View>
      </View>
      <Text style={styles.title}>{slide.title}</Text>
      <Text style={styles.description}>{slide.description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl,
  },
  illustration: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  iconBadge: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#EAF4E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...TYPOGRAPHY.h1,
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  description: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: SPACING.md,
  },
});
