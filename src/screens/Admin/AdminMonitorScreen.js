import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import * as adminService from '../../services/firebase/adminService';
import * as diseasesService from '../../services/firebase/diseasesService';
import AdminHeader from '../../components/AdminHeader';
import { RADIUS, SPACING, TAG_COLORS, TYPOGRAPHY } from '../../utils/theme';
import {
  LOW_CONFIDENCE_THRESHOLD,
  buildLowConfidenceScans,
  buildMonitorSummary,
  formatConfidence,
  formatShortDate,
} from '../../utils/adminStats';

const WINDOW_DAYS = 7;

// System Monitoring tab.
//
// This screen previously showed CPU / memory / storage / uptime gauges, an
// error log, and a retraining schedule. All of it was invented: the app is a
// Firebase-only client with no server to measure, no log collection, and no
// training pipeline — those numbers had no possible source and could not be
// made real without infrastructure this project doesn't have.
//
// What replaces them is everything the app CAN actually observe about
// itself: recent activity volume, how confident the classifier has been, and
// which scans it struggled with. Every figure below traces to a document in
// `scans` or `users` that you can open in the Firestore console.
export default function AdminMonitorScreen() {
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

  const summary = useMemo(
    () => buildMonitorSummary(scans, users, diseases, new Date(), WINDOW_DAYS),
    [scans, users, diseases],
  );

  const lowConfidence = useMemo(
    () => buildLowConfidenceScans(scans, users, diseases),
    [scans, users, diseases],
  );

  const headline = [
    { key: 'scans', label: `Scans · last ${WINDOW_DAYS} days`, value: String(summary.scansInWindow) },
    { key: 'users', label: `New users · last ${WINDOW_DAYS} days`, value: String(summary.newUsers) },
  ];

  const avgConfidenceText =
    summary.avgConfidence != null ? `${Math.round(summary.avgConfidence * 100)}%` : 'No data';

  const summaryRows = [
    { label: 'Total scans (all time)', value: String(summary.totalScans) },
    { label: `Average confidence · ${WINDOW_DAYS}d`, value: avgConfidenceText },
    {
      label: `Low-confidence scans · ${WINDOW_DAYS}d`,
      value: String(summary.lowConfidenceCount),
    },
    {
      label: `Most detected disease · ${WINDOW_DAYS}d`,
      value: summary.mostDetected
        ? `${summary.mostDetected} (${summary.mostDetectedCount})`
        : 'None detected',
      bold: true,
    },
  ];

  const warnTone = TAG_COLORS.warn || TAG_COLORS.info;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <AdminHeader title="System Monitoring" subtitle="Scan activity and model confidence" />

        {!!loadError && (
          <Text style={[styles.loadError, { color: colors.danger }]}>
            Couldn't load monitoring data. Check your connection and admin permissions.
          </Text>
        )}

        <View style={styles.statGrid}>
          {headline.map((card) => (
            <View key={card.key} style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{card.label}</Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{card.value}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Activity Summary</Text>
          {summaryRows.map((row, index) => (
            <View
              key={row.label}
              style={[
                styles.summaryRow,
                index < summaryRows.length - 1 && [styles.rowDivider, { borderColor: colors.border }],
              ]}
            >
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{row.label}</Text>
              <Text
                style={[
                  styles.summaryValue,
                  { color: colors.textPrimary },
                  row.bold && styles.summaryValueBold,
                ]}
              >
                {row.value}
              </Text>
            </View>
          ))}
        </View>

        {summary.invalidConfidenceCount > 0 && (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Data quality</Text>
            <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
              {summary.invalidConfidenceCount} recent{' '}
              {summary.invalidConfidenceCount === 1 ? 'scan stores' : 'scans store'} a confidence
              value outside the expected 0–1 range. Those readings are excluded from the average
              above and hidden in the UI until the scan flow writing them is corrected.
            </Text>
          </View>
        )}

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            Lowest-Confidence Scans
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            Scans the classifier was least sure about (below{' '}
            {Math.round(LOW_CONFIDENCE_THRESHOLD * 100)}%). Worth reviewing for image quality or
            model gaps.
          </Text>

          {lowConfidence.length > 0 ? (
            lowConfidence.map((scan) => (
              <View key={scan.id} style={[styles.logRow, { backgroundColor: colors.background }]}>
                <View style={styles.logHeaderRow}>
                  <View style={[styles.logLevelPill, { backgroundColor: warnTone.bg }]}>
                    <Text style={[styles.logLevelText, { color: warnTone.text }]}>
                      {formatConfidence(scan.confidence)}
                    </Text>
                  </View>
                  <Text style={[styles.logSource, { color: colors.textSecondary }]} numberOfLines={1}>
                    {scan.label}
                  </Text>
                  <Text style={[styles.logTime, { color: colors.textSecondary }]}>
                    {formatShortDate(scan.date) || '—'}
                  </Text>
                </View>
                <Text style={[styles.logMessage, { color: colors.textPrimary }]} numberOfLines={1}>
                  {scan.title} · {scan.userName}
                </Text>
              </View>
            ))
          ) : (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Nothing below the threshold. Every recorded scan cleared{' '}
              {Math.round(LOW_CONFIDENCE_THRESHOLD * 100)}% confidence.
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: SPACING.xxl },
  loadError: { ...TYPOGRAPHY.caption, paddingHorizontal: SPACING.xl, marginBottom: SPACING.sm },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
  },
  statCard: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  statLabel: { ...TYPOGRAPHY.caption },
  statValue: { ...TYPOGRAPHY.h1, marginTop: SPACING.xs },
  card: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.md,
  },
  cardTitle: { ...TYPOGRAPHY.body, fontWeight: '700', marginBottom: SPACING.xs },
  cardSubtitle: { ...TYPOGRAPHY.caption, marginBottom: SPACING.md, lineHeight: 16 },
  noticeText: { ...TYPOGRAPHY.caption, lineHeight: 16 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth },
  summaryLabel: { ...TYPOGRAPHY.caption, flexShrink: 1 },
  summaryValue: { ...TYPOGRAPHY.body, fontWeight: '700' },
  summaryValueBold: { fontWeight: '800' },
  logRow: { borderRadius: RADIUS.md, padding: SPACING.sm, marginBottom: SPACING.sm },
  logHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: 4 },
  logLevelPill: { paddingHorizontal: SPACING.xs, paddingVertical: 2, borderRadius: RADIUS.sm },
  logLevelText: { ...TYPOGRAPHY.caption, fontSize: 10, fontWeight: '800' },
  logSource: { ...TYPOGRAPHY.caption, flex: 1 },
  logTime: { ...TYPOGRAPHY.caption },
  logMessage: { ...TYPOGRAPHY.caption, fontWeight: '600' },
  emptyText: { ...TYPOGRAPHY.caption, paddingVertical: SPACING.sm },
});