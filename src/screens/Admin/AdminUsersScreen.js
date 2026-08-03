import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import * as adminService from '../../services/firebase/adminService';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../utils/theme';
import { showAlert } from '../../utils/showAlert';

export default function AdminUsersScreen() {
  const { colors } = useTheme();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const unsubscribe = adminService.subscribeToAllUsers(setUsers);
    return unsubscribe;
  }, []);

  const handleToggleRole = (item) => {
    const nextRole = item.role === 'admin' ? 'user' : 'admin';
    showAlert(
      nextRole === 'admin' ? 'Make admin?' : 'Remove admin access?',
      `${item.fullName || item.email} will become ${nextRole === 'admin' ? 'an admin' : 'a regular user'}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => adminService.updateUserRole(item.id, nextRole) },
      ],
    );
  };

  const handleDelete = (item) => {
    if (item.id === currentUser?.uid) {
      showAlert('Not allowed', "You can't delete your own account from here.");
      return;
    }
    showAlert(
      'Delete this user?',
      `This removes ${item.fullName || item.email}'s profile data. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => adminService.deleteUserProfile(item.id) },
      ],
    );
  };

  const renderItem = ({ item }) => (
    <View style={[styles.userCard, { backgroundColor: colors.surface }]}>
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: colors.textPrimary }]}>
          {item.fullName || 'Unnamed'}
        </Text>
        <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{item.email}</Text>
        {!!item.role && item.role === 'admin' && (
          <View style={[styles.roleBadge, { borderColor: colors.primary }]}>
            <Text style={[styles.roleBadgeText, { color: colors.primary }]}>Admin</Text>
          </View>
        )}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => handleToggleRole(item)} style={styles.actionButton}>
          <Ionicons name="shield-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionButton}>
          <Ionicons name="trash-outline" size={20} color={colors.danger || '#D14343'} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Manage Users</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {users.length} total
        </Text>
      </View>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: SPACING.xl, paddingBottom: SPACING.md },
  title: { ...TYPOGRAPHY.h1 },
  subtitle: { ...TYPOGRAPHY.body },
  list: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xl },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  userInfo: { flex: 1 },
  userName: { ...TYPOGRAPHY.body, fontWeight: '600' },
  userEmail: { ...TYPOGRAPHY.caption },
  roleBadge: {
    marginTop: SPACING.xs || 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  roleBadgeText: { ...TYPOGRAPHY.caption, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: SPACING.sm },
  actionButton: { padding: SPACING.xs || 4 },
});