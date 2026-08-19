import React, { useEffect, useState } from 'react';
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
import {
  DISEASE_DISTRIBUTION,
  MODEL_VERSIONS,
  RECENT_ACTIVITY,
  SCAN_VOLUME_TREND,
} from '../../utils/adminMockData';

// Home tab of the Admin Control Center bottom tab bar. Total Users / Total
// Scans / Diseases come from live Firestore subscriptions; the scan-volume
// trend, disease distribution, and recent-activity feed are placeholder
// data (see adminMockData.js) until an activity-log collection exists.
export default function AdminDashboardScreen() {
  const { colors } = useTheme();
  const [userCount, setUserCount] = useState(0);
  const [scanCount, setScanCount] = useState(0);
  const [diseaseCount, setDiseaseCount] = useState(DISEASE_DISTRIBUTION.length);
  const activeModel = MODEL_VERSIONS.find((m) => m.status === 'Active') || MODEL_VERSIONS[0];

  useEffect(() => {
    const unsubscribeUsers = adminService.subscribeToAllUsers((users) => {
      setUserCount(users.length);
    });
    const unsubscribeScans = adminService.subscribeToAllScans((scans) => {
      setScanCount(scans.length);
    });
    const unsubscribeDiseases = diseasesService.subscribeToAllDiseases((diseases) => {
      if (diseases.length > 0) setDiseaseCount(diseases.length);
    });
    return () => {
      unsubscribeUsers();
      unsubscribeScans();
      unsubscribeDiseases();
    };
  }, []);

  const stats = [
    { label: 'Total Users', value: String(userCount), icon: 'people-outline' },
    { label: 'Total Scans', value: String(scanCount), icon: 'scan-outline' },
    { label: 'Diseases', value: `${diseaseCount} tracked`, icon: 'leaf-outline' },
    { label: 'Model', value: `${activeModel.version} · ${activeModel.accuracy}% acc`, icon: 'extension-puzzle-outline' },
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
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Scan Volume - 8 months</Text>
          <LineAreaChart data={SCAN_VOLUME_TREND} color={colors.primary} yMax={1400} textColor={colors.textSecondary} />
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Disease Distribution</Text>
          <View style={styles.donutRow}>
            <DonutChart data={DISEASE_DISTRIBUTION} size={120} strokeWidth={20} />
            <View style={styles.legend}>
              {DISEASE_DISTRIBUTION.map((item) => (
                <View key={item.label} style={styles.legendRow}>
                  <View style={styles.legendLeft}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <Text style={[styles.legendLabel, { color: colors.textPrimary }]}>{item.label}</Text>
                  </View>
                  <Text style={[styles.legendValue, { color: colors.textSecondary }]}>{item.value}%</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Recent Activity</Text>
          {RECENT_ACTIVITY.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.activityRow,
                index < RECENT_ACTIVITY.length - 1 && [styles.activityDivider, { borderColor: colors.border }],
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
              <Text style={[styles.activityTime, { color: colors.textSecondary }]}>{item.time}</Text>
            </View>
          ))}
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
  donutRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.lg },
  legend: { flex: 1, gap: SPACING.sm },
  legendRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  legendLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { ...TYPOGRAPHY.caption },
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