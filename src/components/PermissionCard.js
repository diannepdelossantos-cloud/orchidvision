import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../utils/theme';

// Reusable request/status card used by the Permissions screen.
// `status` is a PermissionResponse ({ granted, canAskAgain, ... }) or null
// while the initial check is still in flight.
export default function PermissionCard({
  icon,
  title,
  description,
  status,
  onRequest,
  onOpenSettings,
}) {
  const isChecking = status === null;
  const isGranted = status?.granted === true;
  const isBlocked = !isGranted && status?.canAskAgain === false;

  return (
    <View style={styles.card}>
      <View style={[styles.iconBadge, isGranted && styles.iconBadgeGranted]}>
        <Ionicons
          name={icon}
          size={28}
          color={isGranted ? COLORS.primary : COLORS.textSecondary}
        />
      </View>

      <View style={styles.textBlock}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      {isGranted ? (
        <View style={styles.grantedPill}>
          <Ionicons name="checkmark" size={16} color={COLORS.primary} />
          <Text style={styles.grantedText}>Granted</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.actionButton}
          disabled={isChecking}
          onPress={isBlocked ? onOpenSettings : onRequest}
        >
          <Text style={styles.actionText}>
            {isBlocked ? 'Open Settings' : 'Allow'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOW.soft,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  iconBadgeGranted: {
    backgroundColor: '#EAF4E7',
  },
  textBlock: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  title: {
    ...TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  description: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  actionButton: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
  },
  actionText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.primary,
  },
  grantedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  grantedText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
