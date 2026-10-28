import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import * as adminService from '../../services/firebase/adminService';
import * as diseasesService from '../../services/firebase/diseasesService';
import AdminHeader from '../../components/AdminHeader';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../utils/theme';
import { showAlert } from '../../utils/showAlert';
import { isHealthyLabel } from '../../utils/diseaseInfo';
import {
  activeScans,
  buildLabelNameMap,
  buildUserNameMap,
  formatConfidence,
  formatShortDate,
  resolveLabelName,
  toDate,
} from '../../utils/adminStats';

// Content screen: every scan record in the system. Not currently a tab in
// AdminNavigator — the storyboard specifies five and this isn't one of them
// — but kept intact and reachable by uncommenting its Tab.Screen block.
//
// Soft-deleted records are excluded: scanRecordService keeps those documents
// so RestoreScreen can recover them, and showing a user's trashed scan here
// as if it were live would let an admin act on something already removed.
export default function AdminContentScreen() {
  const { colors } = useTheme();
  const [scans, setScans] = useState([]);
  const [users, setUsers] = useState([]);
  const [diseases, setDiseases] = useState([]);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    const unsubscribeScans = adminService.subscribeToAllScans(setScans, setLoadError);
    const unsubscribeUsers = adminService.subscribeToAllUsers(setUsers, setLoadError);
    const unsubscribeDiseases = diseasesService.subscribeToAllDiseases(setDiseases);
    return () => {
      unsubscribeScans();
      unsubscribeUsers();
      unsubscribeDiseases();
    };
  }, []);

  const visibleScans = useMemo(() => activeScans(scans), [scans]);
  const userNames = useMemo(() => buildUserNameMap(users), [users]);
  const labelNames = useMemo(() => buildLabelNameMap(diseases), [diseases]);

  // Permanently removes the record and its Supabase image. Unlike the user-
  // facing delete (which soft-deletes into Restore), this is irreversible.
  const handleDelete = (item) => {
    showAlert(
      'Delete this scan record?',
      'The record and its photo are removed permanently. This is not recoverable from Restore.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => adminService.deleteScan(item.id, item.userId),
        },
      ],
    );
  };

  const renderItem = ({ item }) => {
    const healthy = isHealthyLabel(item.label);
    const labelText = resolveLabelName(item.label, labelNames);
    const scannedOn = formatShortDate(toDate(item.createdAt));
    const confidence = formatConfidence(item.confidence);

    return (
      <View style={[styles.scanCard, { backgroundColor: colors.surface }]}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.scanImage} />
        ) : (
          <View style={[styles.scanImagePlaceholder, { backgroundColor: colors.background }]}>
            <Ionicons name="image-outline" size={20} color={colors.textSecondary} />
          </View>
        )}
        <View style={styles.scanInfo}>
          <Text style={[styles.scanTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.plantName || item.name || 'Untitled scan'}
          </Text>
          <Text
            style={[styles.scanLabel, { color: healthy ? colors.primary : colors.textPrimary }]}
            numberOfLines={1}
          >
            {labelText}
            {confidence ? ` · ${confidence}` : ''}
          </Text>
          <Text style={[styles.scanSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {userNames.get(item.userId) || 'Unknown user'}
            {scannedOn ? ` · ${scannedOn}` : ''}
          </Text>
        </View>
        <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteButton}>
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <AdminHeader
        title="Manage Content"
        subtitle={
          visibleScans.length === 1 ? '1 scan record' : `${visibleScans.length} scan records`
        }
      />

      {!!loadError && (
        <Text style={[styles.loadError, { color: colors.danger }]}>
          Couldn't load scan records. Check your connection and admin permissions.
        </Text>
      )}

      <FlatList
        data={visibleScans}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No scan records yet. They appear here as users scan their orchids.
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadError: { ...TYPOGRAPHY.caption, paddingHorizontal: SPACING.xl, marginBottom: SPACING.sm },
  list: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xl },
  emptyText: { ...TYPOGRAPHY.body, textAlign: 'center', marginTop: SPACING.xl },
  scanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  scanImage: { width: 48, height: 48, borderRadius: RADIUS.sm },
  scanImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanInfo: { flex: 1 },
  scanTitle: { ...TYPOGRAPHY.body, fontWeight: '700' },
  scanLabel: { ...TYPOGRAPHY.caption, fontWeight: '700' },
  scanSubtitle: { ...TYPOGRAPHY.caption },
  deleteButton: { padding: SPACING.xs },
});