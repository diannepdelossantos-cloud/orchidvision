import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScanRecordRow from '../../components/ScanRecordRow';
import { useScanHistory } from '../../context/ScanHistoryContext';
import { showAlert } from '../../utils/showAlert';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../utils/theme';

function FilterButton({ label, icon, active, onPress, colors }) {
  return (
    <TouchableOpacity
      style={[
        styles.filterButton,
        active
          ? { backgroundColor: colors.primary, borderColor: colors.primary }
          : { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={15} color={active ? colors.textInverse : colors.textSecondary} />
      <Text style={[styles.filterButtonText, { color: active ? colors.textInverse : colors.textSecondary }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function HistoryTab({ colors, onOpenRestore }) {
  const { records, deleteRecord } = useScanHistory();
  const [sourceFilter, setSourceFilter] = useState(null); // null = Recents (all)
  const [editing, setEditing] = useState(false);

  const toggleFilter = (source) => {
    setSourceFilter((prev) => (prev === source ? null : source));
  };

  const filteredRecords = useMemo(
    () => (sourceFilter ? records.filter((r) => r.source === sourceFilter) : records),
    [records, sourceFilter],
  );

  const handleDelete = (record) => {
    deleteRecord(record.id).catch((error) => {
      showAlert('Could not delete', error?.message || 'Please try again.');
    });
  };

  return (
    <View>
      <View style={styles.filterRow}>
        <FilterButton
          label="Scanned images"
          icon="camera-outline"
          active={sourceFilter === 'Scanned'}
          onPress={() => toggleFilter('Scanned')}
          colors={colors}
        />
        <FilterButton
          label="Uploaded images"
          icon="cloud-upload-outline"
          active={sourceFilter === 'Uploaded'}
          onPress={() => toggleFilter('Uploaded')}
          colors={colors}
        />
      </View>

      <View style={styles.controlsRow}>
        {sourceFilter === null ? (
          <View style={[styles.recentsChip, { backgroundColor: colors.primary }]}>
            <Text style={[styles.recentsChipText, { color: colors.textInverse }]}>Recents</Text>
          </View>
        ) : (
          <View />
        )}

        <View style={styles.controlsRight}>
          {!editing && (
            <TouchableOpacity onPress={onOpenRestore} style={styles.controlButton}>
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.controlButtonText, { color: colors.textSecondary }]}>Restore</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setEditing((e) => !e)} style={styles.controlButton}>
            <Text style={[styles.controlButtonText, { color: editing ? colors.error : colors.textSecondary }]}>
              {editing ? 'Done' : 'Edit'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {filteredRecords.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="images-outline" size={40} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No scans yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Scan or upload an orchid photo to see it here.
          </Text>
        </View>
      ) : (
        filteredRecords.map((record) => (
          <ScanRecordRow
            key={record.id}
            record={record}
            colors={colors}
            variant="history"
            editing={editing}
            onDelete={() => handleDelete(record)}
          />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingVertical: SPACING.sm,
  },
  filterButtonText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    marginLeft: 6,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  recentsChip: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
  },
  recentsChipText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
  },
  controlsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButtonText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    marginLeft: 4,
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
  },
});
