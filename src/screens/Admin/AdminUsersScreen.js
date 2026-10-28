import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import * as adminService from '../../services/firebase/adminService';
import AdminHeader from '../../components/AdminHeader';
import AdminReportsPanel from './AdminReportsPanel';
import { subscribeToAllReports } from '../../services/firebase/reportService';
import Badge from '../../components/Badge';
import FormModal from '../../components/FormModal';
import AuthTextField from '../../components/AuthTextField';
import PrimaryButton from '../../components/PrimaryButton';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../utils/theme';
import { showAlert } from '../../utils/showAlert';
import { isValidEmail } from '../../utils/validators';
import {
  buildUserScanSummary,
  formatShortDate,
  isRecentlyActive,
  toDate,
} from '../../utils/adminStats';

// Account statuses an admin can set from the status badge.
const STATUS_ORDER = ['active', 'inactive', 'deactivated'];
const STATUS_META = {
  active: { label: 'Active', tone: 'active', hint: 'Can use the app normally' },
  inactive: { label: 'Inactive', tone: 'inactive', hint: 'Marked inactive; can still sign in and scan' },
  deactivated: { label: 'Deactivated', tone: 'severe', hint: 'Blocked from scanning and saving orchids' },
};

// Users tab of the Admin Control Center. Live-subscribes to both `users` and
// `scans`: per-user scan totals and last-active dates are counted from the
// scans collection rather than read off users/{uid}.scanCount, which is a
// naming sequence for scan titles and never goes down (see adminStats.js).
export default function AdminUsersScreen() {
  const { colors } = useTheme();
  const { user: currentUser } = useAuth();
  // User whose status picker is open (null = closed).
  const [statusTarget, setStatusTarget] = useState(null);
  // 'users' = the user list, 'reports' = user-reported issues / flagged content.
  const [view, setView] = useState('users');
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [scans, setScans] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isAddVisible, setIsAddVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    const unsubscribeUsers = adminService.subscribeToAllUsers(setUsers, setLoadError);
    const unsubscribeScans = adminService.subscribeToAllScans(setScans, setLoadError);
    const unsubscribeReports = subscribeToAllReports(setReports, setLoadError);
    return () => {
      unsubscribeUsers();
      unsubscribeScans();
      unsubscribeReports();
    };
  }, []);

  const scanSummary = useMemo(() => buildUserScanSummary(scans), [scans]);

  const adminCount = users.filter((u) => u.role === 'admin').length;
  const openReportCount = reports.filter((r) => r.status === 'open').length;
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

  const openStatusPicker = (item, currentStatus) => {
    if ((item.uid || item.id) === currentUser?.uid) {
      showAlert('Not allowed', "You can't change your own account status.");
      return;
    }
    setStatusTarget({ item, currentStatus });
  };

  const applyStatus = async (status) => {
    const target = statusTarget;
    setStatusTarget(null);
    if (!target) return;
    try {
      await adminService.setUserStatus(target.item.id, status);
    } catch (error) {
      showAlert('Could not update', error?.message || 'Please try again.');
    }
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
    const summary = scanSummary.get(item.uid || item.id) || { count: 0, lastScanAt: null };
    const joinedAt = toDate(item.createdAt);
    // Admin-set status wins; accounts never set by an admin fall back to the
    // automatic 30-day activity check. Older docs that only have
    // disabled: true still read as Deactivated.
    const status = item.disabled
      ? 'deactivated'
      : STATUS_META[item.accountStatus]
        ? item.accountStatus
        : isRecentlyActive(summary.lastScanAt, joinedAt)
          ? 'active'
          : 'inactive';

    const scanLabel = summary.count === 1 ? '1 scan' : `${summary.count} scans`;
    const lastScanLabel = formatShortDate(summary.lastScanAt);
    const joinedLabel = formatShortDate(joinedAt);
    const activityLabel = lastScanLabel
      ? `Last scan ${lastScanLabel}`
      : joinedLabel
        ? `Joined ${joinedLabel}`
        : 'No activity yet';

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
            <TouchableOpacity
              onPress={() => openStatusPicker(item, status)}
              style={styles.statusTouch}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel="Change account status"
            >
              <Badge label={STATUS_META[status].label} tone={STATUS_META[status].tone} />
              <Ionicons name="chevron-down" size={12} color={colors.textSecondary} style={styles.statusIcon} />
            </TouchableOpacity>
            <Badge label={role === 'admin' ? 'Admin' : 'User'} tone={role} style={styles.badgeGap} />
          </View>
        </View>

        <View style={[styles.userBottomRow, { borderColor: colors.border }]}>
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            {scanLabel} · {activityLabel}
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

      {!!loadError && (
        <Text style={[styles.loadError, { color: colors.danger }]}>
          Couldn't load user data. Check your connection and admin permissions.
        </Text>
      )}

      <View style={[styles.segment, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {[
          { key: 'users', label: 'Users', icon: 'people-outline' },
          { key: 'reports', label: 'Reports', icon: 'flag-outline' },
        ].map((tab) => {
          const active = view === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.segmentTab, active && { backgroundColor: colors.primary }]}
              onPress={() => setView(tab.key)}
            >
              <Ionicons name={tab.icon} size={15} color={active ? colors.textInverse : colors.textSecondary} />
              <Text style={[styles.segmentText, { color: active ? colors.textInverse : colors.textSecondary }]}>
                {tab.label}
              </Text>
              {tab.key === 'reports' && openReportCount > 0 && (
                <View style={[styles.countPill, { backgroundColor: active ? colors.textInverse : colors.danger }]}>
                  <Text style={[styles.countText, { color: active ? colors.primary : '#fff' }]}>{openReportCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {view === 'reports' ? (
        <AdminReportsPanel reports={reports} users={users} />
      ) : (
      <>
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
      </>
      )}

      {/* ---------- Status picker: shows the two statuses it isn't ---------- */}
      <Modal
        visible={!!statusTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusTarget(null)}
      >
        <Pressable style={styles.pickerBackdrop} onPress={() => setStatusTarget(null)}>
          <Pressable style={[styles.pickerCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.pickerTitle, { color: colors.textPrimary }]}>Change status</Text>
            <Text style={[styles.pickerSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {statusTarget?.item.fullName || statusTarget?.item.email} · currently{' '}
              {statusTarget ? STATUS_META[statusTarget.currentStatus].label : ''}
            </Text>

            {statusTarget &&
              STATUS_ORDER.filter((key) => key !== statusTarget.currentStatus).map((key) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.pickerOption, { borderColor: colors.border }]}
                  onPress={() => applyStatus(key)}
                >
                  <Badge label={STATUS_META[key].label} tone={STATUS_META[key].tone} />
                  <Text style={[styles.pickerHint, { color: colors.textSecondary }]}>
                    {STATUS_META[key].hint}
                  </Text>
                </TouchableOpacity>
              ))}

            <TouchableOpacity style={styles.pickerCancel} onPress={() => setStatusTarget(null)}>
              <Text style={[styles.pickerCancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

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
  loadError: { ...TYPOGRAPHY.caption, paddingHorizontal: SPACING.xl, marginBottom: SPACING.sm },
  segment: {
    flexDirection: 'row',
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    padding: 3,
  },
  segmentTab: {
    flex: 1,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: RADIUS.pill,
  },
  segmentText: { ...TYPOGRAPHY.caption, fontWeight: '700', lineHeight: 16 },
  countPill: { minWidth: 18, height: 18, paddingHorizontal: 5, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: 11, lineHeight: 13, fontWeight: '800' },
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
  statusTouch: { flexDirection: 'row', alignItems: 'center' },
  statusIcon: { marginLeft: 3 },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  pickerCard: { borderRadius: RADIUS.lg, padding: SPACING.lg, width: '100%', maxWidth: 380, alignSelf: 'center' },
  pickerTitle: { ...TYPOGRAPHY.body, fontWeight: '700', textAlign: 'center' },
  pickerSubtitle: { ...TYPOGRAPHY.caption, marginTop: 2, marginBottom: SPACING.md, textAlign: 'center' },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  pickerHint: { ...TYPOGRAPHY.caption, flex: 1 },
  pickerCancel: { alignItems: 'center', paddingVertical: SPACING.sm, marginTop: SPACING.xs },
  pickerCancelText: { ...TYPOGRAPHY.body, fontWeight: '700' },
  userBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metaText: { ...TYPOGRAPHY.caption, flexShrink: 1 },
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