import React, { useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import * as adminService from '../../services/firebase/adminService';
import * as diseasesService from '../../services/firebase/diseasesService';
import * as monitorService from '../../services/firebase/monitorService';
import { subscribeToAllReports } from '../../services/firebase/reportService';
import AdminHeader from '../../components/AdminHeader';
import LineAreaChart from '../../components/charts/LineAreaChart';
import ModelOpsEditModal from './ModelOpsEditModal';
import { ACTIVE_MODEL } from '../../utils/modelInfo';
import { ERROR_SOURCES } from '../../utils/errorLogger';
import { RADIUS, SPACING, TAG_COLORS, TYPOGRAPHY } from '../../utils/theme';
import {
  LOW_CONFIDENCE_THRESHOLD,
  buildConditionReport,
  buildDatasetGrowth,
  buildLowConfidenceScans,
  buildMonitorSummary,
  buildRetrainingStatus,
  buildSystemHealth,
  conditionReportToCsv,
  formatConfidence,
  formatRelativeTime,
  formatShortDate,
  niceCeiling,
  toDate,
} from '../../utils/adminStats';

const WINDOW_DAYS = 7;

const REPORT_PERIODS = [
  { key: '7', label: '7 days', days: 7 },
  { key: '30', label: '30 days', days: 30 },
  { key: 'all', label: 'All time', days: null },
];

const HEALTH_META = {
  healthy: { label: 'Healthy', color: '#2e7d32', bg: '#e7f4e8', icon: 'checkmark-circle' },
  degraded: { label: 'Degraded', color: '#b26a00', bg: '#fff4e0', icon: 'alert-circle' },
  critical: { label: 'Critical', color: '#c62828', bg: '#fdecea', icon: 'close-circle' },
};

// Saves/shares the condition report. Native: share sheet. Web: downloads a .csv.
async function exportCsv(csv, filename) {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  await Share.share({ title: filename, message: csv });
}

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
//
// Added below those: a condition summary report (exportable CSV), a real
// error log + health status fed by utils/errorLogger.js (errorLogs), and a
// dataset & retraining record the admin maintains (modelOps/current and
// datasetVersions) — the model is trained offline, so those figures are
// entered after each training run rather than measured.
export default function AdminMonitorScreen() {
  const { colors } = useTheme();
  const [scans, setScans] = useState([]);
  const [users, setUsers] = useState([]);
  const [diseases, setDiseases] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [errorLogs, setErrorLogs] = useState([]);
  const [reports, setReports] = useState([]);
  const [modelOps, setModelOps] = useState(null);
  const [datasetVersions, setDatasetVersions] = useState([]);
  const [reportPeriod, setReportPeriod] = useState('30');
  const [editOpsVisible, setEditOpsVisible] = useState(false);
  const [showAllErrors, setShowAllErrors] = useState(false);

  useEffect(() => {
    const unsubscribeScans = adminService.subscribeToAllScans(setScans, setLoadError);
    const unsubscribeUsers = adminService.subscribeToAllUsers(setUsers, setLoadError);
    const unsubscribeDiseases = diseasesService.subscribeToAllDiseases(setDiseases);
    // These three are new data sources; if one fails (e.g. rules not yet
    // deployed) only its own section shows empty, not the whole screen.
    const unsubscribeErrors = monitorService.subscribeToErrorLogs(setErrorLogs);
    const unsubscribeOps = monitorService.subscribeToModelOps(setModelOps);
    const unsubscribeVersions = monitorService.subscribeToDatasetVersions(setDatasetVersions);
    const unsubscribeReports = subscribeToAllReports(setReports);
    return () => {
      unsubscribeScans();
      unsubscribeUsers();
      unsubscribeDiseases();
      unsubscribeErrors();
      unsubscribeOps();
      unsubscribeVersions();
      unsubscribeReports();
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

  const period = REPORT_PERIODS.find((p) => p.key === reportPeriod) || REPORT_PERIODS[1];
  const conditionReport = useMemo(
    () => buildConditionReport(scans, diseases, period.days),
    [scans, diseases, period.days],
  );
  const health = useMemo(() => buildSystemHealth({ errorLogs, reports, scans }), [errorLogs, reports, scans]);
  const growth = useMemo(() => buildDatasetGrowth(datasetVersions), [datasetVersions]);
  const growthMax = useMemo(() => niceCeiling(growth.map((g) => g.value)), [growth]);
  const retraining = useMemo(
    () => buildRetrainingStatus(modelOps, scans, diseases),
    [modelOps, scans, diseases],
  );
  const healthMeta = HEALTH_META[health.status];
  const nowDate = new Date();

  const handleExportReport = () => {
    const csv = conditionReportToCsv(conditionReport, period.label);
    const stamp = new Date().toISOString().slice(0, 10);
    exportCsv(csv, `orchidvision-conditions-${period.key}-${stamp}.csv`).catch(() => {});
  };

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
        <AdminHeader title="System Monitoring" subtitle="Activity, health, reports and model status" />

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

        {/* ================= Condition summary report ================= */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Condition Report</Text>
            <TouchableOpacity
              style={[styles.smallButton, { borderColor: colors.border }]}
              onPress={handleExportReport}
              disabled={conditionReport.total === 0}
            >
              <Ionicons name="download-outline" size={14} color={colors.textPrimary} />
              <Text style={[styles.smallButtonText, { color: colors.textPrimary }]}>Export CSV</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            Most commonly detected orchid conditions across all users, by knowledge-base name.
          </Text>

          <View style={styles.periodRow}>
            {REPORT_PERIODS.map((p) => {
              const active = p.key === reportPeriod;
              return (
                <TouchableOpacity
                  key={p.key}
                  onPress={() => setReportPeriod(p.key)}
                  style={[
                    styles.periodChip,
                    { borderColor: active ? colors.primary : colors.border },
                    active && { backgroundColor: colors.primary + '1A' },
                  ]}
                >
                  <Text style={[styles.periodText, { color: active ? colors.primary : colors.textSecondary }]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {conditionReport.total > 0 ? (
            <>
              <Text style={[styles.reportHeadline, { color: colors.textPrimary }]}>
                {conditionReport.total} scans ·{' '}
                {conditionReport.topDisease
                  ? `${conditionReport.topDisease.name} is the most common disease (${Math.round(
                      conditionReport.topDisease.share * 100,
                    )}%)`
                  : 'no disease detected'}
              </Text>
              {conditionReport.rows.map((row) => (
                <View key={row.name} style={styles.barRow}>
                  <View style={styles.barLabelRow}>
                    <Text style={[styles.barLabel, { color: colors.textPrimary }]} numberOfLines={1}>
                      {row.name}
                    </Text>
                    <Text style={[styles.barValue, { color: colors.textSecondary }]}>
                      {row.count} · {Math.round(row.share * 100)}%
                    </Text>
                  </View>
                  <View style={[styles.barTrack, { backgroundColor: colors.background }]}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${Math.max(2, row.share * 100)}%`,
                          backgroundColor: row.isHealthy
                            ? '#66bb6a'
                            : row.isUnrecognized
                              ? '#bdbdbd'
                              : colors.primary,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </>
          ) : (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No scans in this period.
            </Text>
          )}
        </View>

        {/* ================= Error logs & system health ================= */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>System Health</Text>
            <View style={[styles.healthPill, { backgroundColor: healthMeta.bg }]}>
              <Ionicons name={healthMeta.icon} size={14} color={healthMeta.color} />
              <Text style={[styles.healthPillText, { color: healthMeta.color }]}>{healthMeta.label}</Text>
            </View>
          </View>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            From errors the app reports while users scan and save, plus open user reports.
          </Text>

          <View style={styles.metricGrid}>
            {[
              { label: 'Errors · 24h', value: health.errors24h },
              { label: 'Errors · 7d', value: health.errors7d },
              { label: 'Classifier failures · 24h', value: health.classifierFailures24h },
              { label: 'Open reports', value: health.openReports },
              {
                label: `Confident scans · 7d`,
                value: health.confidentShare7d == null ? '—' : `${Math.round(health.confidentShare7d * 100)}%`,
              },
              {
                label: 'Last error',
                value: health.lastErrorAt ? formatRelativeTime(health.lastErrorAt, nowDate) : 'None',
              },
            ].map((m) => (
              <View key={m.label} style={[styles.metric, { backgroundColor: colors.background }]}>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{m.value}</Text>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{m.label}</Text>
              </View>
            ))}
          </View>

          {health.sources.length > 0 && (
            <>
              <Text style={[styles.subheading, { color: colors.textSecondary }]}>ERRORS BY AREA · 7 DAYS</Text>
              {health.sources.map((src) => (
                <View key={src.source} style={styles.sourceRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textPrimary }]}>
                    {ERROR_SOURCES[src.source] || src.source}
                  </Text>
                  <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{src.count}</Text>
                </View>
              ))}
            </>
          )}

          <Text style={[styles.subheading, { color: colors.textSecondary }]}>ERROR LOG</Text>
          {health.recent.length > 0 ? (
            <>
              {(showAllErrors ? errorLogs.slice(0, 50) : health.recent).map((log) => {
                const date = log.date || toDate(log.createdAt);
                return (
                  <View key={log.id} style={[styles.logRow, { backgroundColor: colors.background }]}>
                    <View style={styles.logHeaderRow}>
                      <View style={[styles.logLevelPill, { backgroundColor: '#fdecea' }]}>
                        <Text style={[styles.logLevelText, { color: '#c62828' }]}>ERROR</Text>
                      </View>
                      <Text style={[styles.logSource, { color: colors.textSecondary }]} numberOfLines={1}>
                        {ERROR_SOURCES[log.source] || log.source}
                        {log.platform ? ` · ${log.platform}` : ''}
                      </Text>
                      <Text style={[styles.logTime, { color: colors.textSecondary }]}>
                        {date ? formatRelativeTime(date, nowDate) : ''}
                      </Text>
                    </View>
                    <Text style={[styles.logMessage, { color: colors.textPrimary }]} numberOfLines={2}>
                      {log.code ? `[${log.code}] ` : ''}
                      {log.message}
                    </Text>
                  </View>
                );
              })}
              {errorLogs.length > health.recent.length && (
                <TouchableOpacity onPress={() => setShowAllErrors((v) => !v)} style={styles.moreLink}>
                  <Text style={[styles.moreText, { color: colors.primary }]}>
                    {showAllErrors ? 'Show fewer' : 'Show more'}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No errors logged. Errors from scanning and saving will appear here.
            </Text>
          )}
        </View>

        {/* ================= Dataset growth & retraining ================= */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Dataset & Retraining</Text>
            <TouchableOpacity
              style={[styles.smallButton, { borderColor: colors.border }]}
              onPress={() => setEditOpsVisible(true)}
            >
              <Ionicons name="create-outline" size={14} color={colors.textPrimary} />
              <Text style={[styles.smallButtonText, { color: colors.textPrimary }]}>
                {modelOps ? 'Update' : 'Set up'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            Bundled model {ACTIVE_MODEL.version} ({ACTIVE_MODEL.classifierArchitecture} +{' '}
            {ACTIVE_MODEL.detectorArchitecture}). Dataset figures are recorded by an admin after each
            Roboflow / Colab run.
          </Text>

          {[
            { label: 'Dataset version', value: modelOps?.datasetVersion || 'Not recorded' },
            { label: 'Total images', value: modelOps?.totalImages != null ? String(modelOps.totalImages) : '—' },
            {
              label: 'Last trained',
              value: formatShortDate(retraining.lastTrainedAt) || ACTIVE_MODEL.trainedOn || 'Not recorded',
            },
            {
              label: 'Next retraining',
              value: retraining.nextRetrainAt
                ? `${formatShortDate(retraining.nextRetrainAt)} · ${
                    retraining.overdue
                      ? `${Math.abs(retraining.daysUntilNext)}d overdue`
                      : retraining.daysUntilNext === 0
                        ? 'today'
                        : `in ${retraining.daysUntilNext}d`
                  }`
                : 'Not scheduled',
              danger: retraining.overdue,
            },
            {
              label: retraining.lastTrainedAt ? 'New user scans since training' : 'User scans (all time)',
              value: String(retraining.newScansSinceTraining),
            },
            { label: 'Low-confidence scans since training', value: String(retraining.lowConfidenceSince) },
          ].map((row, index, arr) => (
            <View
              key={row.label}
              style={[styles.summaryRow, index < arr.length - 1 && [styles.rowDivider, { borderColor: colors.border }]]}
            >
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{row.label}</Text>
              <Text style={[styles.summaryValue, { color: row.danger ? colors.danger : colors.textPrimary }]}>
                {row.value}
              </Text>
            </View>
          ))}

          {growth.length > 0 && (
            <>
              <Text style={[styles.subheading, { color: colors.textSecondary }]}>DATASET GROWTH (IMAGES)</Text>
              <LineAreaChart data={growth} color={colors.primary} yMax={growthMax} textColor={colors.textSecondary} />
            </>
          )}

          {!!modelOps?.classCounts && Object.keys(modelOps.classCounts).length > 0 && (
            <>
              <Text style={[styles.subheading, { color: colors.textSecondary }]}>IMAGES PER CLASS</Text>
              {Object.entries(modelOps.classCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([label, count]) => (
                  <View key={label} style={styles.sourceRow}>
                    <Text style={[styles.summaryLabel, { color: colors.textPrimary }]}>{label}</Text>
                    <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{count}</Text>
                  </View>
                ))}
            </>
          )}

          {retraining.newByCondition.length > 0 && (
            <>
              <Text style={[styles.subheading, { color: colors.textSecondary }]}>
                NEW DATA CANDIDATES BY CONDITION
              </Text>
              {retraining.newByCondition.map((row) => (
                <View key={row.name} style={styles.sourceRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textPrimary }]}>{row.name}</Text>
                  <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{row.count}</Text>
                </View>
              ))}
            </>
          )}

          {!!modelOps?.notes && (
            <Text style={[styles.noticeText, { color: colors.textSecondary, marginTop: SPACING.sm }]}>
              Note: {modelOps.notes}
            </Text>
          )}
        </View>
      </ScrollView>

      <ModelOpsEditModal
        visible={editOpsVisible}
        modelOps={modelOps}
        colors={colors}
        onClose={() => setEditOpsVisible(false)}
      />
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

  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.xs },
  smallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  smallButtonText: { ...TYPOGRAPHY.caption, fontWeight: '700' },
  periodRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  periodChip: { borderWidth: 1, borderRadius: RADIUS.pill, paddingHorizontal: SPACING.md, paddingVertical: 4 },
  periodText: { ...TYPOGRAPHY.caption, fontWeight: '700' },
  reportHeadline: { ...TYPOGRAPHY.caption, fontWeight: '700', marginBottom: SPACING.sm },
  barRow: { marginBottom: SPACING.sm },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, gap: SPACING.sm },
  barLabel: { ...TYPOGRAPHY.caption, fontWeight: '600', flexShrink: 1 },
  barValue: { ...TYPOGRAPHY.caption },
  barTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  healthPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: RADIUS.pill, paddingHorizontal: SPACING.sm, paddingVertical: 3 },
  healthPillText: { ...TYPOGRAPHY.caption, fontWeight: '800' },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.sm },
  metric: { flexBasis: '30%', flexGrow: 1, borderRadius: RADIUS.md, padding: SPACING.sm },
  metricValue: { ...TYPOGRAPHY.body, fontWeight: '800' },
  metricLabel: { ...TYPOGRAPHY.caption, fontSize: 10, marginTop: 2 },
  subheading: { ...TYPOGRAPHY.caption, fontSize: 10, fontWeight: '800', letterSpacing: 0.5, marginTop: SPACING.md, marginBottom: SPACING.xs },
  sourceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  moreLink: { alignSelf: 'center', paddingVertical: SPACING.xs },
  moreText: { ...TYPOGRAPHY.caption, fontWeight: '700' },
});