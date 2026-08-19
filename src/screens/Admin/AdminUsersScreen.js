import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import * as adminService from '../../services/firebase/adminService';
import AdminHeader from '../../components/AdminHeader';
import Badge from '../../components/Badge';
import FormModal from '../../components/FormModal';
import AuthTextField from '../../components/AuthTextField';
import PrimaryButton from '../../components/PrimaryButton';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../utils/theme';
import { showAlert } from '../../utils/showAlert';
import { isValidEmail } from '../../utils/validators';

// Users tab of the Admin Control Center. Live-subscribes to the `users`
// collection (adminService). Fields like scan count / last-active date
// aren't tracked in Firestore yet, so they fall back to placeholder text
// below until that data is written by the scan/session flows.
export default function AdminUsersScreen() {
  const { colors } = useTheme();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isAddVisible, setIsAddVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  React.useEffect(() => {
    const unsubscribe = adminService.subscribeToAllUsers(setUsers);
    return unsubscribe;
  }, []);

  const adminCount = users.filter((u) => u.role === 'admin').length;
  const userCount = users.length - adminCount;

  const filteredUsers = useMemo(() => {
    return users.filter((item) => {
      const matchesRole = roleFilter === 'all' || (item.role || 'user') === roleFilter;
      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        (item.fullName || '').toLowerCase().includes(query) ||
        (item.email || '').toLowerCase().includes(query);
      return matchesRole && matchesSearch;
    });
  }, [users, roleFilter, search]);

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

  const resetAddForm = () => {
    setNewName('');
    setNewEmail('');
    setNewRole('user');
    setFormError(null);
  };

  const handleAddUser = async () => {
    if (!newName.trim()) return setFormError('Enter a full name.');
    if (!isValidEmail(newEmail)) return setFormError('Enter a valid email address.');
    setFormError(null);
    setIsSaving(true);
    try {
      await adminService.addUserPlaceholder({ fullName: newName.trim(), email: newEmail.trim(), role: newRole });
      setIsAddVisible(false);
      resetAddForm();
    } catch (error) {
      setFormError(error.message || 'Could not add user.');
    } finally {
      setIsSaving(false);
    }
  };

  const initials = (name, email) => {
    const source = (name || email || '?').trim();
    const parts = source.split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return source.slice(0, 2).toUpperCase();
  };

  const renderItem = ({ item }) => {
    const role = item.role === 'admin' ? 'admin' : 'user';
    const status = item.status || 'Active'; // placeholder — no presence tracking yet
    const scanLabel = item.scanCount != null ? `${item.scanCount} scans` : 'No scans yet';
    const activeLabel = item.lastActiveLabel || 'Active date unavailable';

    return (
      <View style={[styles.userCard, { backgroundColor: colors.surface }]}>
        <View style={styles.userTopRow}>
          <View style={[styles.avatar, { backgroundColor: colors.background }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {initials(item.fullName, item.email)}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.textPrimary }]}>
              {item.fullName || 'Unnamed'}
            </Text>
            <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{item.email}</Text>
          </View>
          <View style={styles.badgeStack}>
            <Badge label={status} tone={status === 'Active' ? 'active' : 'inactive'} />
            <Badge label={role === 'admin' ? 'Admin' : 'User'} tone={role} style={styles.badgeGap} />
          </View>
        </View>

        <View style={[styles.userBottomRow, { borderColor: colors.border }]}>
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            {scanLabel} · {activeLabel}
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={() => handleToggleRole(item)}
              style={[styles.roleToggle, { borderColor: colors.border }]}
            >
              <Ionicons name="shield-outline" size={14} color={colors.textPrimary} />
              <Ionicons name="arrow-forward" size={12} color={colors.textSecondary} style={styles.arrowIcon} />
              <Text style={[styles.roleToggleText, { color: colors.textPrimary }]}>
                {role === 'admin' ? 'User' : 'Admin'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionButton}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <AdminHeader title="User Management" subtitle="View and manage user accounts" />

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, styles.summaryCardDark, { backgroundColor: colors.primaryDark }]}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.textInverse} />
          <Text style={[styles.summaryValue, { color: colors.textInverse }]}>{adminCount}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textInverseMuted }]}>Admins</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
          <Ionicons name="people-outline" size={16} color={colors.textPrimary} />
          <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{userCount}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Users</Text>
        </View>
      </View>

      <View style={[styles.searchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder="Search users..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.filterRow}>
        <View style={styles.filterChips}>
          {[
            { key: 'all', label: 'All' },
            { key: 'admin', label: 'Admin' },
            { key: 'user', label: 'User' },
          ].map((chip) => {
            const active = roleFilter === chip.key;
            return (
              <TouchableOpacity
                key={chip.key}
                onPress={() => setRoleFilter(chip.key)}
                style={[
                  styles.chip,
                  { borderColor: active ? colors.primary : colors.border },
                  active && { backgroundColor: colors.primary + '1A' },
                ]}
              >
                <Text style={[styles.chipText, { color: active ? colors.primary : colors.textSecondary }]}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => setIsAddVisible(true)}
        >
          <Ionicons name="add" size={16} color={colors.textInverse} />
          <Text style={[styles.addButtonText, { color: colors.textInverse }]}>Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No users match your filters.</Text>
        }
      />

      <FormModal
        visible={isAddVisible}
        title="Add User"
        onClose={() => {
          setIsAddVisible(false);
          resetAddForm();
        }}
      >
        <AuthTextField
          label="Full name"
          icon="person-outline"
          value={newName}
          onChangeText={setNewName}
          placeholder="Juan Dela Cruz"
          colors={colors}
        />
        <AuthTextField
          label="Email"
          icon="mail-outline"
          value={newEmail}
          onChangeText={setNewEmail}
          placeholder="user@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          colors={colors}
        />
        <Text style={[styles.roleLabel, { color: colors.textPrimary }]}>Role</Text>
        <View style={styles.roleOptionsRow}>
          {['user', 'admin'].map((option) => {
            const active = newRole === option;
            return (
              <TouchableOpacity
                key={option}
                onPress={() => setNewRole(option)}
                style={[
                  styles.roleOption,
                  { borderColor: active ? colors.primary : colors.border },
                  active && { backgroundColor: colors.primary + '1A' },
                ]}
              >
                <Text style={[styles.roleOptionText, { color: active ? colors.primary : colors.textSecondary }]}>
                  {option === 'admin' ? 'Admin' : 'User'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {!!formError && <Text style={[styles.formError, { color: colors.danger }]}>{formError}</Text>}
        <PrimaryButton title="Add User" onPress={handleAddUser} loading={isSaving} colors={colors} style={styles.submitButton} />
        <Text style={[styles.helperNote, { color: colors.textSecondary }]}>
          Creates a profile only — the person still needs to register or reset their password to sign in.
        </Text>
      </FormModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  summaryRow: { flexDirection: 'row', gap: SPACING.md, paddingHorizontal: SPACING.xl, marginBottom: SPACING.md },
  summaryCard: { flex: 1, borderRadius: RADIUS.lg, padding: SPACING.md },
  summaryCardDark: {},
  summaryValue: { ...TYPOGRAPHY.h1, marginTop: SPACING.xs },
  summaryLabel: { ...TYPOGRAPHY.caption },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
  },
  searchInput: { flex: 1, paddingVertical: SPACING.sm, ...TYPOGRAPHY.body },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
  },
  filterChips: { flexDirection: 'row', gap: SPACING.sm },
  chip: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.pill, borderWidth: 1 },
  chipText: { ...TYPOGRAPHY.caption, fontWeight: '700' },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.pill,
  },
  addButtonText: { ...TYPOGRAPHY.caption, fontWeight: '700' },
  list: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xl },
  emptyText: { ...TYPOGRAPHY.body, textAlign: 'center', marginTop: SPACING.xl },
  userCard: { borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm },
  userTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  avatar: { width: 40, height: 40, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...TYPOGRAPHY.caption, fontWeight: '700' },
  userInfo: { flex: 1 },
  userName: { ...TYPOGRAPHY.body, fontWeight: '700' },
  userEmail: { ...TYPOGRAPHY.caption },
  badgeStack: { alignItems: 'flex-end', gap: 4 },
  badgeGap: { marginTop: 2 },
  userBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metaText: { ...TYPOGRAPHY.caption },
  actions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  roleToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  arrowIcon: { marginHorizontal: 2 },
  roleToggleText: { ...TYPOGRAPHY.caption, fontWeight: '700' },
  actionButton: { padding: 4 },
  roleLabel: { ...TYPOGRAPHY.caption, fontWeight: '700', textTransform: 'uppercase', marginBottom: SPACING.xs },
  roleOptionsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  roleOption: { flex: 1, alignItems: 'center', paddingVertical: SPACING.sm, borderRadius: RADIUS.md, borderWidth: 1 },
  roleOptionText: { ...TYPOGRAPHY.body, fontWeight: '700' },
  formError: { ...TYPOGRAPHY.caption, marginBottom: SPACING.sm, textAlign: 'center' },
  submitButton: { marginTop: SPACING.xs },
  helperNote: { ...TYPOGRAPHY.caption, textAlign: 'center', marginTop: SPACING.md, marginBottom: SPACING.lg },
});