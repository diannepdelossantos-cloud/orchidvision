import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DISEASE_INFO } from '../utils/diseaseInfo';
import { formatConfidence, formatDeletedDate, formatScanDate } from '../utils/formatDate';
import { RADIUS, SPACING, TYPOGRAPHY } from '../utils/theme';

function statusColor(info, colors) {
  if (!info) return colors.textSecondary;
  if (info.isHealthy) return colors.success;
  if (info.status === 'Diseased') return colors.error;
  return colors.warning;
}

// One scan-history row, reused by the History list ("history" variant, with
// an optional per-item delete icon in Edit mode) and the Restore screen
// ("restore" variant, with Restore/Delete actions and a deleted-at stamp).
export default function ScanRecordRow({
  record,
  colors,
  variant = 'history',
  editing = false,
  onDelete,
  onRestore,
  onPermanentDelete,
}) {
  const info = DISEASE_INFO[record.label];
  const badgeColor = statusColor(info, colors);

  return (
    <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.mainRow}>
        {record.imageUrl ? (
          <Image source={{ uri: record.imageUrl }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: colors.background }]}>
            <Ionicons name="flower-outline" size={20} color={colors.textSecondary} />
          </View>
        )}

        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
              {record.name}
            </Text>
            <View style={[styles.badge, { backgroundColor: `${badgeColor}1A` }]}>
              <Text style={[styles.badgeText, { color: badgeColor }]}>{info?.status ?? 'Unknown'}</Text>
            </View>
          </View>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            None detected • {formatConfidence(record.confidence)}
          </Text>

          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {formatScanDate(record.createdAt)}
            </Text>
            <View style={[styles.sourcePill, { borderColor: colors.border }]}>
              <Text style={[styles.sourcePillText, { color: colors.textSecondary }]}>{record.source}</Text>
            </View>
          </View>

          {variant === 'restore' && (
            <Text style={[styles.deletedText, { color: colors.warning }]}>
              {formatDeletedDate(record.deletedAt)}
            </Text>
          )}
        </View>

        {variant === 'history' && editing && (
          <TouchableOpacity
            style={styles.trashButton}
            onPress={onDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>

      {variant === 'restore' && (
        <View style={[styles.restoreActions, { borderTopColor: colors.border }]}>
          <TouchableOpacity style={styles.restoreAction} onPress={onRestore}>
            <Ionicons name="refresh-outline" size={15} color={colors.primary} />
            <Text style={[styles.restoreActionText, { color: colors.primary }]}>Restore</Text>
          </TouchableOpacity>
          <View style={[styles.restoreActionDivider, { backgroundColor: colors.border }]} />
          <TouchableOpacity style={styles.restoreAction} onPress={onPermanentDelete}>
            <Ionicons name="trash-outline" size={15} color={colors.error} />
            <Text style={[styles.restoreActionText, { color: colors.error }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  mainRow: {
    flexDirection: 'row',
    padding: SPACING.md,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    ...TYPOGRAPHY.body,
    fontWeight: '700',
    flexShrink: 1,
    marginRight: SPACING.sm,
  },
  badge: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  badgeText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    fontWeight: '700',
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    marginTop: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  metaText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    marginLeft: 4,
  },
  sourcePill: {
    marginLeft: SPACING.sm,
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 1,
  },
  sourcePillText: {
    fontSize: 10,
    fontWeight: '600',
  },
  deletedText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    marginTop: 6,
    fontWeight: '600',
  },
  trashButton: {
    justifyContent: 'center',
    paddingLeft: SPACING.sm,
  },
  restoreActions: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  restoreAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
  },
  restoreActionText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    marginLeft: 4,
  },
  restoreActionDivider: {
    width: StyleSheet.hairlineWidth,
  },
});
