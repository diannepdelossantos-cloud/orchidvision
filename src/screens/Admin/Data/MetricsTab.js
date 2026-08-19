import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import BarChart from '../../../components/charts/BarChart';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../../utils/theme';
import { ACCURACY_BY_VERSION, DATA_METRICS_SUMMARY } from '../../../utils/adminMockData';

export default function MetricsTab({ pendingCount, currentAccuracy }) {
  const { colors } = useTheme();

  const rows = [
    { icon: 'server-outline', label: 'Total Labeled Images', value: DATA_METRICS_SUMMARY.totalLabeledImages.toLocaleString() },
    { icon: 'time-outline', label: 'Pending Review', value: String(pendingCount) },
    { icon: 'trending-up-outline', label: 'Current Accuracy', value: `${currentAccuracy}%` },
    { icon: 'refresh-outline', label: 'Next Retrain', value: DATA_METRICS_SUMMARY.nextRetrain },
  ];

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Accuracy by Model Version</Text>
        <BarChart data={ACCURACY_BY_VERSION} yMin={80} yMax={100} color={colors.primary} textColor={colors.textSecondary} />
      </View>

      {rows.map((row) => (
        <View key={row.label} style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.statIcon, { backgroundColor: colors.background }]}>
            <Ionicons name={row.icon} size={18} color={colors.primary} />
          </View>
          <View style={styles.statText}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{row.label}</Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{row.value}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACING.xl },
  card: { borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md },
  cardTitle: { ...TYPOGRAPHY.body, fontWeight: '700', marginBottom: SPACING.md },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  statIcon: { width: 36, height: 36, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  statText: { flex: 1 },
  statLabel: { ...TYPOGRAPHY.caption },
  statValue: { ...TYPOGRAPHY.h2, marginTop: 2 },
});