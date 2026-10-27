import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Badge from '../../components/Badge';
import DetectionOverlay from '../../components/DetectionOverlay';
import ImageZoomModal from '../../components/ImageZoomModal';
import PrimaryButton from '../../components/PrimaryButton';
import ScanRecordDetailModal from '../../components/ScanRecordDetailModal';
import { useAuth } from '../../context/AuthContext';
import { useDiseaseForLabel } from '../../context/DiseasesContext';
import { useTheme } from '../../context/ThemeContext';
import * as orchidService from '../../services/firebase/orchidService';
import { deleteOrchidWithScans } from '../../services/firebase/orchidDeleteService';
import { isHealthyLabel } from '../../utils/diseaseInfo';
import { formatScanDate } from '../../utils/formatDate';
import { showAlert } from '../../utils/showAlert';
import { logError } from '../../utils/errorLogger';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../utils/theme';

const SEVERITY_COLORS = { None: '#2e7d32', Mild: '#7cb342', Moderate: '#ef8c2f', Severe: '#c62828' };

function StatBox({ label, value, valueColor, colors }) {
  return (
    <View style={[styles.statBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text
        style={[styles.statValue, { color: valueColor || colors.textPrimary }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </View>
  );
}

function ScanHistoryRow({ scan, colors, onPress }) {
  const isHealthy = isHealthyLabel(scan.label);
  const statusColor = isHealthy ? colors.success : colors.error;

  return (
    <TouchableOpacity
      style={[styles.historyRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.historyRing, { backgroundColor: statusColor + '33' }]}>
        <View style={[styles.historyDot, { backgroundColor: statusColor }]} />
      </View>
      <View style={styles.historyBody}>
        <View style={styles.historyTopRow}>
          <Text style={[styles.historyDate, { color: colors.textPrimary }]}>
            {formatScanDate(scan.createdAt)}
          </Text>
          <Badge label={isHealthy ? 'Healthy' : 'Diseased'} tone={isHealthy ? 'active' : 'severe'} />
        </View>
        <Text style={[styles.historyMeta, { color: colors.textSecondary }]}>
          Confidence {((scan.confidence || 0) * 100).toFixed(1)}%
        </Text>
        <Text style={[styles.historyAction, { color: isHealthy ? colors.textSecondary : colors.error }]}>
          {isHealthy ? 'Monitor status' : 'Treatment recommended'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} style={styles.historyChevron} />
    </TouchableOpacity>
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
  const [zoomVisible, setZoomVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [openScan, setOpenScan] = useState(null);

  const { entry } = useDiseaseForLabel(orchid?.lastLabel);
  const dangerColor = colors.error || colors.danger || '#c62828';

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

  const confirmDelete = () => {
    showAlert(
      `Delete "${orchid.nickname}"?`,
      'Its scan records will move to History → Restore for 30 days.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteOrchidWithScans(user.uid, orchidId);
              navigation.goBack();
            } catch (error) {
              setDeleting(false);
              logError('orchid.delete', error);
              showAlert('Delete failed', error?.message || 'Could not delete this orchid.');
            }
          },
        },
      ],
    );
  };

  // `deleting` keeps the "Couldn't load" state from flashing once the doc is gone.
  if (loading || deleting) {
    return (
      <SafeAreaView style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (loadError || !orchid) {
    return (
      <SafeAreaView style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={40} color={dangerColor} />
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Couldn't load this orchid</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          {loadError || 'It may have been removed.'}
        </Text>
      </SafeAreaView>
    );
  }

  const isHealthy = isHealthyLabel(orchid.lastLabel);
  const confidencePct = `${((orchid.lastConfidence || 0) * 100).toFixed(0)}%`;
  const severity = isHealthy ? 'None' : entry?.severity || '—';
  // Only knowledge-base diseases are named; anything else is unrecognized.
  const diseaseName = entry?.name || 'Unrecognized';

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
          <TouchableOpacity
            onPress={confirmDelete}
            style={styles.trashButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Delete orchid"
          >
            <Ionicons name="trash-outline" size={22} color={dangerColor} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <StatBox
            label="Current Status"
            value={isHealthy ? 'Healthy' : 'Diseased'}
            valueColor={isHealthy ? colors.success : colors.error}
            colors={colors}
          />
          <StatBox label="Confidence" value={confidencePct} colors={colors} />
          <StatBox label="Severity" value={severity} valueColor={SEVERITY_COLORS[severity]} colors={colors} />
        </View>

        <View style={styles.imageWrap}>
          {orchid.imageUrl ? (
            <TouchableOpacity activeOpacity={0.9} onPress={() => setZoomVisible(true)}>
              <Image source={{ uri: orchid.imageUrl }} style={styles.image} />
              <DetectionOverlay imageUri={orchid.imageUrl} detections={orchid.lastDetections || []} />
            </TouchableOpacity>
          ) : (
            <View style={[styles.image, styles.imagePlaceholder, { backgroundColor: colors.surface }]}>
              <Ionicons name="flower-outline" size={40} color={colors.textSecondary} />
            </View>
          )}
          {!!orchid.lastLabel && (
            <View style={[styles.imageBadge, { backgroundColor: isHealthy ? colors.success : colors.error }]}>
              <Text style={styles.imageBadgeText}>
                {isHealthy ? 'Healthy' : diseaseName} {confidencePct}
              </Text>
            </View>
          )}
        </View>

        {entry?.symptoms?.length > 0 && (
          <View style={styles.tagRow}>
            {entry.symptoms.map((symptom) => (
              <View key={symptom} style={[styles.tag, { backgroundColor: isHealthy ? '#e7f4e8' : '#fff1dc' }]}>
                <Text style={[styles.tagText, { color: isHealthy ? '#2e7d32' : '#9a5b00' }]}>{symptom}</Text>
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
          scans.map((scan) => (
            <ScanHistoryRow
              key={scan.id}
              scan={scan}
              colors={colors}
              onPress={() => setOpenScan(scan)}
            />
          ))
        )}

        <PrimaryButton
          title="Scan this orchid now"
          onPress={() => navigation.navigate('Scan', { orchidId: orchid.id, orchidNickname: orchid.nickname })}
          colors={colors}
          style={styles.scanButton}
        />
      </ScrollView>

      <ImageZoomModal
        visible={zoomVisible}
        imageUri={orchid.imageUrl}
        detections={orchid.lastDetections || []}
        onClose={() => setZoomVisible(false)}
      />

      <ScanRecordDetailModal
        scan={openScan}
        orchidNickname={orchid.nickname}
        onClose={() => setOpenScan(null)}
      />
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
  trashButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginLeft: SPACING.sm },

  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  statBox: {
    flex: 1,
    minHeight: 76,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xs,
    overflow: 'hidden',
  },
  statLabel: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  statValue: { ...TYPOGRAPHY.h2, fontSize: 18, lineHeight: 22, marginTop: 4 },

  imageWrap: { marginBottom: SPACING.sm },
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

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: SPACING.lg },
  // maxWidth lets a long symptom wrap inside the screen instead of overflowing.
  tag: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, maxWidth: '100%' },
  tagText: { fontSize: 11, lineHeight: 15, fontWeight: '600', flexShrink: 1 },

  sectionLabel: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },

  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  historyRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  historyDot: { width: 14, height: 14, borderRadius: 7 },
  historyBody: { flex: 1 },
  historyTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
  historyDate: { ...TYPOGRAPHY.body, fontWeight: '700', fontSize: 14, flexShrink: 1 },
  historyMeta: { ...TYPOGRAPHY.caption, marginTop: 2 },
  historyAction: { ...TYPOGRAPHY.caption, fontWeight: '700', marginTop: 4 },
  historyChevron: { marginLeft: SPACING.sm },

  emptyTitle: { ...TYPOGRAPHY.body, fontWeight: '700', marginTop: SPACING.sm },
  emptySubtitle: { ...TYPOGRAPHY.caption, marginTop: 4, textAlign: 'center' },

  scanButton: { marginTop: SPACING.lg, marginBottom: SPACING.xl },
});