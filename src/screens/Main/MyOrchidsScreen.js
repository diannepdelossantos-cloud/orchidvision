import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Badge from '../../components/Badge';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import * as orchidService from '../../services/firebase/orchidService';
import { DISEASE_INFO } from '../../utils/diseaseInfo';
import { formatShortDate } from '../../utils/formatDate';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../utils/theme';

function StatBox({ value, label, colors }) {
  return (
    <View style={[styles.statBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function OrchidCard({ orchid, colors, onPress }) {
  const info = DISEASE_INFO[orchid.lastLabel];
  const isHealthy = !!info?.isHealthy;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
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

      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

export default function MyOrchidsScreen({ navigation }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [orchids, setOrchids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

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

  const stats = useMemo(() => {
    const healthy = orchids.filter((o) => DISEASE_INFO[o.lastLabel]?.isHealthy).length;
    return {
      registered: orchids.length,
      healthy,
      diseased: orchids.length - healthy,
    };
  }, [orchids]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>My Orchids</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Tap an orchid to view all health records
        </Text>

        <View style={styles.statsRow}>
          <StatBox value={stats.registered} label="Registered" colors={colors} />
          <StatBox value={stats.healthy} label="Healthy" colors={colors} />
          <StatBox value={stats.diseased} label="Diseased" colors={colors} />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Registered Orchids</Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.loading} />
        ) : loadError ? (
          <View style={styles.emptyState}>
            <Ionicons name="alert-circle-outline" size={40} color={colors.error} />
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
              onPress={() => navigation.navigate('OrchidDetail', { orchidId: orchid.id })}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: SPACING.xl },
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

  sectionLabel: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
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
});
