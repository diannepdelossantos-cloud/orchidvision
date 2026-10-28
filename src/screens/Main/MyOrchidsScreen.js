import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Badge from '../../components/Badge';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import * as orchidService from '../../services/firebase/orchidService';
import { deleteOrchidsWithScans } from '../../services/firebase/orchidDeleteService';
import { isHealthyLabel } from '../../utils/diseaseInfo';
import { formatShortDate } from '../../utils/formatDate';
import { showAlert } from '../../utils/showAlert';
import { logError } from '../../utils/errorLogger';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../utils/theme';

function StatBox({ value, label, colors }) {
  return (
    <View style={[styles.statBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function Checkbox({ checked, colors }) {
  return (
    <View
      style={[
        styles.checkbox,
        { borderColor: checked ? colors.primary : colors.border },
        checked && { backgroundColor: colors.primary },
      ]}
    >
      {checked && <Ionicons name="checkmark" size={14} color="#fff" />}
    </View>
  );
}

function OrchidCard({ orchid, colors, selectMode, selected, onPress, onLongPress }) {
  const isHealthy = isHealthyLabel(orchid.lastLabel);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: selected ? colors.primary : colors.border },
        selected && { backgroundColor: colors.primary + '12' },
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      activeOpacity={0.8}
    >
      {selectMode && <Checkbox checked={selected} colors={colors} />}

      {orchid.imageUrl ? (
        <Image source={{ uri: orchid.imageUrl }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: colors.background }]}>
          <Ionicons name="flower-outline" size={22} color={colors.textSecondary} />
        </View>
      )}

      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {orchid.nickname}
          </Text>
          <Badge label={isHealthy ? 'Healthy' : 'Diseased'} tone={isHealthy ? 'active' : 'severe'} />
        </View>
        <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
          Last Scan: {formatShortDate(orchid.lastScanAt)}
        </Text>
        <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
          {orchid.scanCount || 1} scan{(orchid.scanCount || 1) === 1 ? '' : 's'} recorded
        </Text>
      </View>

      {!selectMode && <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />}
    </TouchableOpacity>
  );
}

export default function MyOrchidsScreen({ navigation }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [orchids, setOrchids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deleting, setDeleting] = useState(false);

  const dangerColor = colors.error || colors.danger || '#c62828';

  useEffect(() => {
    if (!user) {
      setOrchids([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    setLoadError(null);
    const unsubscribe = orchidService.subscribeToOrchids(
      user.uid,
      (records) => {
        setOrchids(records);
        setLoading(false);
      },
      (error) => {
        setLoadError(error?.message || 'Could not load your orchids.');
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [user]);

  // Drop selections for orchids that no longer exist (e.g. deleted elsewhere).
  useEffect(() => {
    setSelectedIds((prev) => {
      const alive = new Set(orchids.map((o) => o.id));
      const next = new Set([...prev].filter((id) => alive.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [orchids]);

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  // Android back button leaves select mode instead of leaving the screen.
  useEffect(() => {
    if (!selectMode) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      exitSelectMode();
      return true;
    });
    return () => sub.remove();
  }, [selectMode]);

  const toggleSelected = (id) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleLongPress = (id) => {
    if (!selectMode) setSelectMode(true);
    toggleSelected(id);
  };

  const handlePress = (orchid) => {
    if (selectMode) toggleSelected(orchid.id);
    else navigation.navigate('OrchidDetail', { orchidId: orchid.id });
  };

  const allSelected = orchids.length > 0 && selectedIds.size === orchids.length;
  const toggleSelectAll = () =>
    setSelectedIds(allSelected ? new Set() : new Set(orchids.map((o) => o.id)));

  const confirmDelete = () => {
    const count = selectedIds.size;
    if (count === 0) return;
    showAlert(
      `Delete ${count} orchid${count === 1 ? '' : 's'}?`,
      'Their scan records will move to History → Restore for 30 days.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteOrchidsWithScans(user.uid, [...selectedIds]);
              exitSelectMode();
            } catch (error) {
              logError('orchid.delete', error);
              showAlert('Delete failed', error?.message || 'Could not delete the selected orchids.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const stats = useMemo(() => {
    const healthy = orchids.filter((o) => isHealthyLabel(o.lastLabel)).length;
    return {
      registered: orchids.length,
      healthy,
      diseased: orchids.length - healthy,
    };
  }, [orchids]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.scroll, selectMode && styles.scrollWithBar]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>My Orchids</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {selectMode ? 'Tap orchids to select them' : 'Tap an orchid to view all health records · Long-press to select'}
        </Text>

        <View style={styles.statsRow}>
          <StatBox value={stats.registered} label="Registered" colors={colors} />
          <StatBox value={stats.healthy} label="Healthy" colors={colors} />
          <StatBox value={stats.diseased} label="Diseased" colors={colors} />
        </View>

        <View style={styles.sectionRow}>
          {selectMode ? (
            <TouchableOpacity style={styles.selectAll} onPress={toggleSelectAll} hitSlop={8}>
              <Checkbox checked={allSelected} colors={colors} />
              <Text style={[styles.selectAllText, { color: colors.textPrimary }]}>Select all</Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Registered Orchids</Text>
          )}

          {selectMode ? (
            <TouchableOpacity onPress={exitSelectMode} hitSlop={8}>
              <Text style={[styles.sectionAction, { color: colors.primary }]}>Cancel</Text>
            </TouchableOpacity>
          ) : (
            orchids.length > 0 && (
              <TouchableOpacity onPress={() => setSelectMode(true)} hitSlop={8}>
                <Text style={[styles.sectionAction, { color: colors.primary }]}>Select</Text>
              </TouchableOpacity>
            )
          )}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.loading} />
        ) : loadError ? (
          <View style={styles.emptyState}>
            <Ionicons name="alert-circle-outline" size={40} color={dangerColor} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Couldn't load your orchids</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>{loadError}</Text>
          </View>
        ) : orchids.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="flower-outline" size={40} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No orchids registered yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              After scanning, tap Save on the result to register your first orchid.
            </Text>
          </View>
        ) : (
          orchids.map((orchid) => (
            <OrchidCard
              key={orchid.id}
              orchid={orchid}
              colors={colors}
              selectMode={selectMode}
              selected={selectedIds.has(orchid.id)}
              onPress={() => handlePress(orchid)}
              onLongPress={() => handleLongPress(orchid.id)}
            />
          ))
        )}
      </ScrollView>

      {selectMode && (
        <View style={[styles.deleteBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.deleteCount, { color: colors.textPrimary }]}>
            {selectedIds.size} selected
          </Text>
          <TouchableOpacity
            style={[styles.deleteButton, { backgroundColor: dangerColor }, selectedIds.size === 0 && styles.disabled]}
            onPress={confirmDelete}
            disabled={selectedIds.size === 0 || deleting}
          >
            {deleting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={16} color="#fff" />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: SPACING.xl },
  scrollWithBar: { paddingBottom: 96 },
  title: { ...TYPOGRAPHY.h1 },
  subtitle: { ...TYPOGRAPHY.body, marginBottom: SPACING.lg },

  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
  },
  statValue: { ...TYPOGRAPHY.h1, fontSize: 24 },
  statLabel: { ...TYPOGRAPHY.caption, marginTop: 2 },

  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
    minHeight: 24,
  },
  sectionLabel: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionAction: { ...TYPOGRAPHY.caption, fontWeight: '700' },
  selectAll: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  selectAllText: { ...TYPOGRAPHY.caption, fontWeight: '700' },

  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loading: { marginTop: SPACING.xl },

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
    paddingHorizontal: SPACING.lg,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  thumb: { width: 52, height: 52, borderRadius: RADIUS.md },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1 },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: { ...TYPOGRAPHY.body, fontWeight: '700', flexShrink: 1, marginRight: SPACING.sm },
  cardMeta: { ...TYPOGRAPHY.caption, fontSize: 12 },

  deleteBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
  },
  deleteCount: { ...TYPOGRAPHY.body, fontWeight: '700' },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
    minWidth: 100,
    justifyContent: 'center',
  },
  deleteButtonText: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.4 },
});