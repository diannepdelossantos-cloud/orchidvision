import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Badge from '../../components/Badge';
import PrimaryButton from '../../components/PrimaryButton';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import * as orchidService from '../../services/firebase/orchidService';
import { DISEASE_INFO, SEVERITY_LEVELS } from '../../utils/diseaseInfo';
import { formatScanDate } from '../../utils/formatDate';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../utils/theme';

function StatBox({ label, value, valueColor, colors }) {
  return (
    <View style={[styles.statBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.statValue, { color: valueColor || colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

function ScanHistoryRow({ scan, colors }) {
  const info = DISEASE_INFO[scan.label];
  const isHealthy = !!info?.isHealthy;
  const statusColor = isHealthy ? colors.success : colors.error;

  return (
    <View style={[styles.historyRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.historyDot, { backgroundColor: statusColor }]} />
      <View style={styles.historyBody}>
        <View style={styles.historyTopRow}>
          <Text style={[styles.historyDate, { color: colors.textPrimary }]}>{formatScanDate(scan.createdAt)}</Text>
          <Badge label={isHealthy ? 'Healthy' : 'Diseased'} tone={isHealthy ? 'active' : 'severe'} />
        </View>
        <Text style={[styles.historyMeta, { color: colors.textSecondary }]}>
          Confidence {((scan.confidence || 0) * 100).toFixed(1)}%
        </Text>
        <Text style={[styles.historyAction, { color: isHealthy ? colors.textSecondary : colors.warning }]}>
          {isHealthy ? 'Monitor status' : 'Treatment recommended'}
        </Text>
      </View>
    </View>
  );
}

export default function OrchidDetailScreen({ route, navigation }) {
  const { orchidId } = route.params;
  const { colors } = useTheme();
  const { user } = useAuth();

  const [orchid, setOrchid] = useState(null);
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    const unsubscribe = orchidService.subscribeToOrchid(
      orchidId,
      (record) => {
        setOrchid(record);
        setLoading(false);
      },
      (error) => {
        setLoadError(error?.message || 'Could not load this orchid.');
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [orchidId]);

  useEffect(() => {
    if (!user) return undefined;
    const unsubscribe = orchidService.subscribeToOrchidScans(user.uid, orchidId, setScans, () => {});
    return unsubscribe;
  }, [user, orchidId]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (loadError || !orchid) {
    return (
      <SafeAreaView style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.error} />
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Couldn't load this orchid</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          {loadError || 'It may have been removed.'}
        </Text>
      </SafeAreaView>
    );
  }

  const info = DISEASE_INFO[orchid.lastLabel];
  const isHealthy = !!info?.isHealthy;
  const severity = SEVERITY_LEVELS[info?.severity];
  const confidencePct = `${((orchid.lastConfidence || 0) * 100).toFixed(0)}%`;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.titleRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.titleTextWrap}>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
              {orchid.nickname}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {orchid.speciesName} · {orchid.scanCount || 1} scan{(orchid.scanCount || 1) === 1 ? '' : 's'} total
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatBox
            label="Current Status"
            value={isHealthy ? 'Healthy' : 'Diseased'}
            valueColor={isHealthy ? colors.success : colors.error}
            colors={colors}
          />
          <StatBox label="Confidence" value={confidencePct} colors={colors} />
          <StatBox
            label="Severity"
            value={severity?.label || '—'}
            valueColor={severity?.color}
            colors={colors}
          />
        </View>

        <View style={styles.imageWrap}>
          {orchid.imageUrl ? (
            <Image source={{ uri: orchid.imageUrl }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder, { backgroundColor: colors.surface }]}>
              <Ionicons name="flower-outline" size={40} color={colors.textSecondary} />
            </View>
          )}
          {!!info && (
            <View style={[styles.imageBadge, { backgroundColor: isHealthy ? colors.success : colors.error }]}>
              <Text style={styles.imageBadgeText}>
                {info.displayName} {confidencePct}
              </Text>
            </View>
          )}
        </View>

        {info?.tags?.length > 0 && (
          <View style={styles.chipRow}>
            {info.tags.map((tag) => (
              <View key={tag} style={[styles.chip, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.chipText, { color: colors.textSecondary }]}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Scan History</Text>

        {scans.length === 0 ? (
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary, textAlign: 'left' }]}>
            No scans linked to this orchid yet.
          </Text>
        ) : (
          scans.map((scan) => <ScanHistoryRow key={scan.id} scan={scan} colors={colors} />)
        )}

        <PrimaryButton
          title="Scan this orchid now"
          onPress={() => navigation.navigate('Scan', { orchidId: orchid.id, orchidNickname: orchid.nickname })}
          colors={colors}
          style={styles.scanButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.xl },
  scroll: { padding: SPACING.xl },

  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.lg },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  titleTextWrap: { flex: 1 },
  title: { ...TYPOGRAPHY.h2 },
  subtitle: { ...TYPOGRAPHY.caption, marginTop: 2 },

  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  statBox: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xs,
  },
  statLabel: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  statValue: { ...TYPOGRAPHY.h2, fontSize: 18, marginTop: 4 },

  imageWrap: { marginBottom: SPACING.md },
  image: { width: '100%', height: 220, borderRadius: RADIUS.lg, resizeMode: 'cover' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  imageBadge: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  imageBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: SPACING.lg },
  chip: {
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    marginRight: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  chipText: { ...TYPOGRAPHY.caption, fontSize: 12 },

  sectionLabel: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },

  historyRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  historyDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5, marginRight: SPACING.sm },
  historyBody: { flex: 1 },
  historyTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  historyDate: { ...TYPOGRAPHY.body, fontWeight: '700', fontSize: 14 },
  historyMeta: { ...TYPOGRAPHY.caption, marginTop: 2 },
  historyAction: { ...TYPOGRAPHY.caption, fontWeight: '700', marginTop: 4 },

  emptyTitle: { ...TYPOGRAPHY.body, fontWeight: '700', marginTop: SPACING.sm },
  emptySubtitle: { ...TYPOGRAPHY.caption, marginTop: 4, textAlign: 'center' },

  scanButton: { marginTop: SPACING.lg, marginBottom: SPACING.xl },
});
