import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import * as adminService from '../../services/firebase/adminService';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../utils/theme';
import { showAlert } from '../../utils/showAlert';

export default function AdminDashboardScreen({ navigation }) {
  const { colors } = useTheme();
  const { signOutUser } = useAuth();
  const [userCount, setUserCount] = useState(0);
  const [adminCount, setAdminCount] = useState(0);
  const [scanCount, setScanCount] = useState(0);

  useEffect(() => {
    const unsubscribeUsers = adminService.subscribeToAllUsers((users) => {
      setUserCount(users.length);
      setAdminCount(users.filter((u) => u.role === 'admin').length);
    });
    const unsubscribeScans = adminService.subscribeToAllScans((scans) => {
      setScanCount(scans.length);
    });
    return () => {
      unsubscribeUsers();
      unsubscribeScans();
    };
  }, []);

  const handleSignOut = () => {
    showAlert('Sign out?', 'You can sign back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOutUser },
    ]);
  };

  const stats = [
    { label: 'Total Users', value: userCount, icon: 'people-outline' },
    { label: 'Admins', value: adminCount, icon: 'shield-checkmark-outline' },
    { label: 'Total Scans', value: scanCount, icon: 'scan-outline' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Admin Dashboard</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              OrchidVision overview
            </Text>
          </View>
          <TouchableOpacity onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          {stats.map((stat) => (
            <View key={stat.label} style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <Ionicons name={stat.icon} size={22} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Manage</Text>

        <TouchableOpacity
          style={[styles.navCard, { backgroundColor: colors.surface }]}
          onPress={() => navigation.navigate('AdminUsers')}
        >
          <Ionicons name="people-outline" size={20} color={colors.primary} />
          <View style={styles.navCardText}>
            <Text style={[styles.navCardTitle, { color: colors.textPrimary }]}>Manage Users</Text>
            <Text style={[styles.navCardSubtitle, { color: colors.textSecondary }]}>
              View, edit roles, or remove accounts
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navCard, { backgroundColor: colors.surface }]}
          onPress={() => navigation.navigate('AdminContent')}
        >
          <Ionicons name="leaf-outline" size={20} color={colors.primary} />
          <View style={styles.navCardText}>
            <Text style={[styles.navCardTitle, { color: colors.textPrimary }]}>Manage Content</Text>
            <Text style={[styles.navCardSubtitle, { color: colors.textSecondary }]}>
              Review and remove scan records
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: SPACING.xl },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.xl,
  },
  title: { ...TYPOGRAPHY.h1 },
  subtitle: { ...TYPOGRAPHY.body },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  statCard: {
    flex: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'flex-start',
  },
  statValue: {
    ...TYPOGRAPHY.h2,
    marginTop: SPACING.sm,
  },
  statLabel: {
    ...TYPOGRAPHY.caption,
  },
  sectionLabel: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  navCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  navCardText: { flex: 1 },
  navCardTitle: { ...TYPOGRAPHY.body, fontWeight: '600' },
  navCardSubtitle: { ...TYPOGRAPHY.caption },
});