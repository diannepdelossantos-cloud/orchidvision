import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import AdminHeader from '../../components/AdminHeader';
import { RADIUS, SPACING, TAG_COLORS, TYPOGRAPHY } from '../../utils/theme';
import {
  ERROR_LOG,
  MONITOR_SUMMARY,
  RETRAINING_SCHEDULE,
  SYSTEM_HEALTH,
} from '../../utils/adminMockData';

// System Monitoring tab. All values here are placeholder — real health,
// log, and scheduling data would come from a server-side monitoring
// service (e.g. Cloud Monitoring + a scheduled retrain function), which
// isn't part of this Firebase-only client project. See adminMockData.js.
export default function AdminMonitorScreen() {
  const { colors } = useTheme();

  const healthCards = [
    { key: 'cpu', label: 'CPU', value: SYSTEM_HEALTH.cpu, suffix: '%', tone: SYSTEM_HEALTH.cpu > 80 ? colors.danger : colors.primary },
    { key: 'memory', label: 'Memory', value: SYSTEM_HEALTH.memory, suffix: '%', tone: SYSTEM_HEALTH.memory > 80 ? colors.danger : colors.primary },
    { key: 'storage', label: 'Storage', value: SYSTEM_HEALTH.storage, suffix: '%', tone: SYSTEM_HEALTH.storage > 70 ? colors.warning : colors.primary },
    { key: 'uptime', label: 'Uptime', value: SYSTEM_HEALTH.uptime, suffix: '%', tone: colors.primary },
  ];

  const summaryRows = [
    { label: 'Total Scans', value: MONITOR_SUMMARY.totalScans },
    { label: 'New Users', value: MONITOR_SUMMARY.newUsers },
    { label: 'Flagged Submissions', value: MONITOR_SUMMARY.flaggedSubmissions },
    { label: 'API Errors', value: MONITOR_SUMMARY.apiErrors },
    { label: 'Avg Confidence', value: `${MONITOR_SUMMARY.avgConfidence}%` },
    { label: 'Most Detected', value: MONITOR_SUMMARY.mostDetected, bold: true },
  ];

  const logToneKey = { ERROR: 'error', WARN: 'warn', INFO: 'info' };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <AdminHeader title="System Monitoring" subtitle="Health, logs, and reports" />

        <View style={styles.healthGrid}>
          {healthCards.map((card) => (
            <View key={card.key} style={[styles.healthCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.healthLabel, { color: colors.textSecondary }]}>{card.label}</Text>
              <Text style={[styles.healthValue, { color: card.tone }]}>
                {card.value}
                {card.suffix}
              </Text>
              <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(card.value, 100)}%`, backgroundColor: card.tone },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Total Summary</Text>
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

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Error Log</Text>
          {ERROR_LOG.map((entry) => {
            const tone = TAG_COLORS[logToneKey[entry.level]] || TAG_COLORS.info;
            return (
              <View key={entry.id} style={[styles.logRow, { backgroundColor: colors.background }]}>
                <View style={styles.logHeaderRow}>
                  <View style={[styles.logLevelPill, { backgroundColor: tone.bg }]}>
                    <Text style={[styles.logLevelText, { color: tone.text }]}>{entry.level}</Text>
                  </View>
                  <Text style={[styles.logSource, { color: colors.textSecondary }]}>{entry.source}</Text>
                  <Text style={[styles.logTime, { color: colors.textSecondary }]}>{entry.time}</Text>
                </View>
                <Text style={[styles.logMessage, { color: colors.textPrimary }]}>{entry.message}</Text>
              </View>
            );
          })}
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Retraining Schedule</Text>
          <View style={styles.scheduleRow}>
            <View style={[styles.scheduleDot, { backgroundColor: colors.success }]} />
            <Text style={[styles.scheduleLabel, { color: colors.textSecondary }]}>Last Retrain</Text>
            <Text style={[styles.scheduleValue, { color: colors.textPrimary }]}>
              {RETRAINING_SCHEDULE.lastRetrain}
            </Text>
          </View>
          <View style={styles.scheduleRow}>
            <View style={[styles.scheduleDot, { backgroundColor: colors.info }]} />
            <Text style={[styles.scheduleLabel, { color: colors.textSecondary }]}>Next Scheduled</Text>
            <Text style={[styles.scheduleValue, { color: colors.textPrimary }]}>
              {RETRAINING_SCHEDULE.nextScheduled}
            </Text>
          </View>
          <View style={styles.scheduleRow}>
            <View style={[styles.scheduleDot, { backgroundColor: colors.warning }]} />
            <Text style={[styles.scheduleLabel, { color: colors.textSecondary }]}>Auto-trigger</Text>
            <Text style={[styles.scheduleValue, { color: colors.textPrimary }]}>
              {RETRAINING_SCHEDULE.autoTrigger}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: SPACING.xxl },
  healthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
  },
  healthCard: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  healthLabel: { ...TYPOGRAPHY.caption },
  healthValue: { ...TYPOGRAPHY.h1, marginVertical: SPACING.xs },
  progressTrack: { height: 5, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 3 },
  card: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.md,
  },
  cardTitle: { ...TYPOGRAPHY.body, fontWeight: '700', marginBottom: SPACING.sm },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth },
  summaryLabel: { ...TYPOGRAPHY.caption },
  summaryValue: { ...TYPOGRAPHY.body, fontWeight: '700' },
  summaryValueBold: { fontWeight: '800' },
  logRow: { borderRadius: RADIUS.md, padding: SPACING.sm, marginBottom: SPACING.sm },
  logHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: 4 },
  logLevelPill: { paddingHorizontal: SPACING.xs, paddingVertical: 2, borderRadius: RADIUS.sm },
  logLevelText: { ...TYPOGRAPHY.caption, fontSize: 10, fontWeight: '800' },
  logSource: { ...TYPOGRAPHY.caption, flex: 1 },
  logTime: { ...TYPOGRAPHY.caption },
  logMessage: { ...TYPOGRAPHY.caption, fontWeight: '600' },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.xs },
  scheduleDot: { width: 8, height: 8, borderRadius: 4 },
  scheduleLabel: { ...TYPOGRAPHY.caption, flex: 1 },
  scheduleValue: { ...TYPOGRAPHY.caption, fontWeight: '700' },
});