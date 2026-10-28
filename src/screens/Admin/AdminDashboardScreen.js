import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import * as adminService from '../../services/firebase/adminService';
import * as diseasesService from '../../services/firebase/diseasesService';
import AdminHeader from '../../components/AdminHeader';
import DonutChart from '../../components/charts/DonutChart';
import LineAreaChart from '../../components/charts/LineAreaChart';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../utils/theme';
import { ACTIVE_MODEL, formatModelSummary } from '../../utils/modelInfo';
import {
  activeScans,
  buildDiseaseDistribution,
  buildRecentActivity,
  buildScanVolumeTrend,
  formatRelativeTime,
  niceCeiling,
} from '../../utils/adminStats';

const TREND_MONTHS = 8;

// Home tab of the Admin Control Center. Every figure on this screen is
// derived from live Firestore data: the three subscriptions below feed the
// pure selectors in adminStats.js. The only constant is the bundled model's
// version/accuracy (utils/modelInfo.js), which is a build artifact rather
// than queryable state.
export default function AdminDashboardScreen() {
  const { colors } = useTheme();
  const [users, setUsers] = useState([]);
  const [scans, setScans] = useState([]);
  const [diseases, setDiseases] = useState([]);

  // Relative timestamps in the activity feed would otherwise freeze at
  // whatever they read when the snapshot last changed.
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const unsubscribeUsers = adminService.subscribeToAllUsers(setUsers);
    const unsubscribeScans = adminService.subscribeToAllScans(setScans);
    const unsubscribeDiseases = diseasesService.subscribeToAllDiseases(setDiseases);
    return () => {
      unsubscribeUsers();
      unsubscribeScans();
      unsubscribeDiseases();
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Soft-deleted scans keep their document so RestoreScreen can recover
  // them, so the headline count has to exclude them.
  const visibleScanCount = useMemo(() => activeScans(scans).length, [scans]);

  const scanVolume = useMemo(() => buildScanVolumeTrend(scans, TREND_MONTHS), [scans]);
  const scanVolumeMax = useMemo(
    () => niceCeiling(scanVolume.map((point) => point.value)),
    [scanVolume],
  );

  const distribution = useMemo(
    () => buildDiseaseDistribution(scans, diseases),
    [scans, diseases],
  );

  const recentActivity = useMemo(
    () => buildRecentActivity(scans, users, diseases),
    [scans, users, diseases],
  );

  const stats = [
    { label: 'Total Users', value: String(users.length), icon: 'people-outline' },
    { label: 'Total Scans', value: String(visibleScanCount), icon: 'scan-outline' },
    { label: 'Diseases', value: `${diseases.length} tracked`, icon: 'leaf-outline' },
    { label: 'Model', value: formatModelSummary(ACTIVE_MODEL), icon: 'extension-puzzle-outline' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <AdminHeader title="Dashboard" subtitle="System overview & activity" />

        <View style={styles.statsGrid}>
          {stats.map((stat) => (
            <View key={stat.label} style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <View style={styles.statCardHeader}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
                <Ionicons name={stat.icon} size={16} color={colors.textSecondary} />
              </View>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stat.value}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            Scan Volume - {TREND_MONTHS} months
          </Text>
          <LineAreaChart
            data={scanVolume}
            color={colors.primary}
            yMax={scanVolumeMax}
            textColor={colors.textSecondary}
          />
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Disease Distribution</Text>
          {distribution.length > 0 ? (
            <View style={styles.donutRow}>
              <DonutChart data={distribution} size={120} strokeWidth={20} />
              <View style={styles.legend}>
                {distribution.map((item) => (
                  <View key={item.rawLabel} style={styles.legendRow}>
                    <View style={styles.legendLeft}>
                      <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                      <Text style={[styles.legendLabel, { color: colors.textPrimary }]}>{item.label}</Text>
                    </View>
                    <Text style={[styles.legendValue, { color: colors.textSecondary }]}>
                      {item.value}%
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No scans recorded yet. Distribution appears once users start scanning.
            </Text>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Recent Activity</Text>
          {recentActivity.length > 0 ? (
            recentActivity.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.activityRow,
                  index < recentActivity.length - 1 && [styles.activityDivider, { borderColor: colors.border }],
                ]}
              >
                <View style={[styles.activityIcon, { backgroundColor: colors.background }]}>
                  <Ionicons name={item.icon} size={16} color={colors.primary} />
                </View>
                <View style={styles.activityText}>
                  <Text style={[styles.activityName, { color: colors.textPrimary }]}>
                    {item.name} <Text style={{ fontWeight: '400' }}>· {item.action}</Text>
                  </Text>
                </View>
                <Text style={[styles.activityTime, { color: colors.textSecondary }]}>
                  {formatRelativeTime(item.date, now)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Nothing yet. Scans and new registrations show up here.
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
  statsGrid: {
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
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: { ...TYPOGRAPHY.caption },
  statValue: { ...TYPOGRAPHY.h2, marginTop: SPACING.sm },
  card: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.md,
  },
  cardTitle: { ...TYPOGRAPHY.body, fontWeight: '700', marginBottom: SPACING.md },
  emptyText: { ...TYPOGRAPHY.caption, paddingVertical: SPACING.sm },
  donutRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.lg },
  legend: { flex: 1, gap: SPACING.sm },
  legendRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  legendLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, flex: 1 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { ...TYPOGRAPHY.caption, flexShrink: 1 },
  legendValue: { ...TYPOGRAPHY.caption, fontWeight: '700' },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  activityDivider: { borderBottomWidth: StyleSheet.hairlineWidth },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityText: { flex: 1 },
  activityName: { ...TYPOGRAPHY.caption, fontWeight: '700' },
  activityTime: { ...TYPOGRAPHY.caption },
});