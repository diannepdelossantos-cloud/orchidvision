import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DangerButton from '../../components/DangerButton';
import ScanRecordRow from '../../components/ScanRecordRow';
import { useScanHistory } from '../../context/ScanHistoryContext';
import { showAlert } from '../../utils/showAlert';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../utils/theme';

export default function RestoreScreen({ colors }) {
  const { deletedRecords, restoreRecord, permanentlyDelete, permanentlyDeleteAll } = useScanHistory();

  const handleRestore = (record) => {
    restoreRecord(record.id).catch((error) => {
      showAlert('Could not restore', error?.message || 'Please try again.');
    });
  };

  const handleDelete = (record) => {
    showAlert('Delete permanently?', `"${record.name}" cannot be recovered after this.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          permanentlyDelete(record.id).catch((error) => {
            showAlert('Could not delete', error?.message || 'Please try again.');
          }),
      },
    ]);
  };

  const handleDeleteAll = () => {
    showAlert(
      'Delete all permanently?',
      `${deletedRecords.length} record${deletedRecords.length === 1 ? '' : 's'} will be permanently removed and cannot be recovered.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: () =>
            permanentlyDeleteAll(deletedRecords.map((r) => r.id)).catch((error) => {
              showAlert('Could not delete', error?.message || 'Please try again.');
            }),
        },
      ],
    );
  };

  return (
    <View>
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Restore</Text>

      {deletedRecords.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="trash-outline" size={40} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No deleted records</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Scans you delete will appear here. They're kept for 30 days before being permanently deleted.
          </Text>
        </View>
      ) : (
        <>
          <View style={[styles.banner, { backgroundColor: `${colors.warning}1A` }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.warning} />
            <Text style={[styles.bannerText, { color: colors.warning }]}>
              Items kept for 30 days. After 30 days, deleted scans are permanently removed and cannot be recovered.
            </Text>
          </View>

          {deletedRecords.map((record) => (
            <ScanRecordRow
              key={record.id}
              record={record}
              colors={colors}
              variant="restore"
              onRestore={() => handleRestore(record)}
              onPermanentDelete={() => handleDelete(record)}
            />
          ))}

          <DangerButton
            title={`Delete All Permanently (${deletedRecords.length})`}
            variant="filled"
            onPress={handleDeleteAll}
            colors={colors}
            style={styles.deleteAllButton}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  bannerText: {
    ...TYPOGRAPHY.caption,
    flex: 1,
    marginLeft: SPACING.sm,
    lineHeight: 17,
  },
  deleteAllButton: {
    marginTop: SPACING.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyTitle: {
    ...TYPOGRAPHY.body,
    fontWeight: '700',
    marginTop: SPACING.sm,
  },
  emptySubtitle: {
    ...TYPOGRAPHY.caption,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
    lineHeight: 18,
  },
});
