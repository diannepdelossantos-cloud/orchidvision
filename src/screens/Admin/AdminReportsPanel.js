import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useDiseases } from '../../context/DiseasesContext';
import * as adminService from '../../services/firebase/adminService';
import {
  REPORT_STATUSES,
  REPORT_STATUS_META,
  REPORT_TYPES,
  deleteReport,
  updateReport,
} from '../../services/firebase/reportService';
import Badge from '../../components/Badge';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../utils/theme';
import { showAlert } from '../../utils/showAlert';
import {
  buildLabelNameMap,
  formatConfidence,
  formatRelativeTime,
  resolveLabelName,
  toDate,
} from '../../utils/adminStats';

// Reports view inside the Users tab: user-reported issues and flagged
// content. `reports` and `users` come from AdminUsersScreen, which already
// subscribes to both.
export default function AdminReportsPanel({ reports, users }) {
  const { colors } = useTheme();
  const { user: currentUser } = useAuth();
  const { diseases } = useDiseases();
  const [filter, setFilter] = useState('open');
  const [selectedId, setSelectedId] = useState(null);

  const nameMap = useMemo(() => buildLabelNameMap(diseases), [diseases]);
  const usersById = useMemo(() => {
    const map = new Map();
    users.forEach((u) => map.set(u.uid || u.id, u));
    return map;
  }, [users]);

  const counts = useMemo(() => {
    const c = { all: reports.length };
    REPORT_STATUSES.forEach((s) => (c[s] = 0));
    reports.forEach((r) => {
      if (c[r.status] != null) c[r.status] += 1;
    });
    return c;
  }, [reports]);

  const visible = filter === 'all' ? reports : reports.filter((r) => r.status === filter);
  const selected = reports.find((r) => r.id === selectedId) || null;
  const now = new Date();

  const reporterName = (r) =>
    usersById.get(r.reporterId)?.fullName || r.reporterName || r.reporterEmail || 'Unknown user';

  const renderItem = ({ item }) => {
    const meta = REPORT_STATUS_META[item.status] || REPORT_STATUS_META.open;
    const date = toDate(item.createdAt);
    return (
      <TouchableOpacity
        style={[styles.reportCard, { backgroundColor: colors.surface }]}
        onPress={() => setSelectedId(item.id)}
        activeOpacity={0.8}
      >
        {item.scanImageUrl ? (
          <Image source={{ uri: item.scanImageUrl }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbIcon, { backgroundColor: colors.background }]}>
            <Ionicons
              name={item.type === 'app_problem' ? 'bug-outline' : 'flag-outline'}
              size={18}
              color={colors.textSecondary}
            />
          </View>
        )}
        <View style={styles.reportBody}>
          <View style={styles.reportTopRow}>
            <Text style={[styles.reportType, { color: colors.textPrimary }]} numberOfLines={1}>
              {REPORT_TYPES[item.type] || 'Report'}
            </Text>
            <Badge label={meta.label} tone={meta.tone} />
          </View>
          <Text style={[styles.reportMeta, { color: colors.textSecondary }]} numberOfLines={1}>
            {reporterName(item)}
            {item.scanLabel ? ` · ${resolveLabelName(item.scanLabel, nameMap)}` : ''}
            {date ? ` · ${formatRelativeTime(date, now)}` : ''}
          </Text>
          {!!item.message && (
            <Text style={[styles.reportMessage, { color: colors.textPrimary }]} numberOfLines={2}>
              {item.message}
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Status tiles double as the filter: tap one to show only that
          status, tap it again (or "Show all") to see every report. */}
      <View style={styles.tileRow}>
        {REPORT_STATUSES.map((key) => {
          const active = filter === key;
          const meta = REPORT_STATUS_META[key];
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setFilter(active ? 'all' : key)}
              activeOpacity={0.8}
              style={[
                styles.tile,
                { backgroundColor: colors.surface, borderColor: active ? colors.primary : colors.border },
                active && { backgroundColor: colors.primary + '14' },
              ]}
            >
              <Text style={[styles.tileValue, { color: active ? colors.primary : colors.textPrimary }]}>
                {counts[key] ?? 0}
              </Text>
              <Text
                style={[styles.tileLabel, { color: active ? colors.primary : colors.textSecondary }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {meta.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.listHeader}>
        <Text style={[styles.listTitle, { color: colors.textSecondary }]}>
          {filter === 'all' ? `All reports · ${counts.all}` : `${REPORT_STATUS_META[filter].label} reports`}
        </Text>
        {filter !== 'all' && (
          <TouchableOpacity onPress={() => setFilter('all')} hitSlop={8}>
            <Text style={[styles.showAll, { color: colors.primary }]}>Show all</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="checkmark-done-outline" size={36} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {filter === 'open' ? 'No open reports. All caught up.' : 'No reports here.'}
            </Text>
          </View>
        }
      />

      <ReportDetailModal
        report={selected}
        reporter={selected ? usersById.get(selected.reporterId) : null}
        reportedUser={selected ? usersById.get(selected.reportedUserId) : null}
        reporterLabel={selected ? reporterName(selected) : ''}
        conditionName={selected?.scanLabel ? resolveLabelName(selected.scanLabel, nameMap) : null}
        currentUid={currentUser?.uid}
        colors={colors}
        onClose={() => setSelectedId(null)}
      />
    </View>
  );
}

function ReportDetailModal({ report, reporter, reportedUser, reporterLabel, conditionName, currentUid, colors, onClose }) {
  const [status, setStatus] = useState('open');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!report) return;
    setStatus(report.status || 'open');
    setNote(report.adminNote || '');
  }, [report?.id]);

  if (!report) return null;

  const date = toDate(report.createdAt);
  const dirty = status !== report.status || note !== (report.adminNote || '');

  const save = async () => {
    setSaving(true);
    try {
      await updateReport(report.id, { status, adminNote: note.trim() });
      onClose();
    } catch (e) {
      showAlert('Could not update', e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const remove = () =>
    showAlert('Delete this report?', 'It will be removed permanently.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteReport(report.id);
            onClose();
          } catch (e) {
            showAlert('Could not delete', e?.message || 'Please try again.');
          }
        },
      },
    ]);

  // Deactivate the account whose content was flagged, or the reporter if the
  // report itself is abusive. Uses the same status as the Users list.
  const deactivate = (target, who) => {
    const uid = target?.uid || target?.id;
    if (!uid) return;
    if (uid === currentUid) {
      showAlert('Not allowed', "You can't deactivate your own account.");
      return;
    }
    const name = target.fullName || target.email || who;
    showAlert(`Deactivate ${name}?`, 'They will be blocked from scanning and saving orchids.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Deactivate',
        style: 'destructive',
        onPress: () =>
          adminService
            .setUserStatus(target.id, 'deactivated')
            .catch((e) => showAlert('Could not update', e?.message || 'Please try again.')),
      },
    ]);
  };

  const sameUser = (reportedUser?.uid || reportedUser?.id) === (reporter?.uid || reporter?.id);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.sheetBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={saving ? undefined : onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
              {REPORT_TYPES[report.type] || 'Report'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.sheetScroll} keyboardShouldPersistTaps="handled">
            <Text style={[styles.metaLine, { color: colors.textSecondary }]}>
              From {reporterLabel}
              {date ? ` · ${date.toLocaleString()}` : ''}
            </Text>

            {!!report.message && (
              <View style={[styles.quote, { backgroundColor: colors.background }]}>
                <Text style={[styles.quoteText, { color: colors.textPrimary }]}>{report.message}</Text>
              </View>
            )}

            {(report.scanImageUrl || conditionName) && (
              <View style={styles.scanBox}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>FLAGGED SCAN</Text>
                {!!report.scanImageUrl && <Image source={{ uri: report.scanImageUrl }} style={styles.scanImage} />}
                <Text style={[styles.scanMeta, { color: colors.textPrimary }]}>
                  {conditionName || 'Unknown result'}
                  {formatConfidence(report.scanConfidence) ? ` · ${formatConfidence(report.scanConfidence)}` : ''}
                </Text>
                {!report.scanId && (
                  <Text style={[styles.hint, { color: colors.textSecondary }]}>
                    This scan wasn't saved, so only the result was attached.
                  </Text>
                )}
              </View>
            )}

            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>STATUS</Text>
            <View style={styles.statusRow}>
              {REPORT_STATUSES.map((s) => {
                const active = status === s;
                return (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setStatus(s)}
                    style={[
                      styles.chip,
                      { borderColor: active ? colors.primary : colors.border },
                      active && { backgroundColor: colors.primary + '1A' },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: active ? colors.primary : colors.textSecondary }]}>
                      {REPORT_STATUS_META[s].label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>ADMIN NOTE</Text>
            <TextInput
              style={[styles.noteInput, { borderColor: colors.border, color: colors.textPrimary }]}
              value={note}
              onChangeText={setNote}
              placeholder="What was done (visible to admins only)"
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={500}
            />

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.primary }, (!dirty || saving) && styles.disabled]}
              onPress={save}
              disabled={!dirty || saving}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save changes</Text>}
            </TouchableOpacity>

            <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: SPACING.lg }]}>
              ACTIONS
            </Text>
            {!!reportedUser && !sameUser && (
              <TouchableOpacity
                style={[styles.actionRow, { borderColor: colors.border }]}
                onPress={() => deactivate(reportedUser, 'the reported user')}
              >
                <Ionicons name="person-remove-outline" size={16} color={colors.danger} />
                <Text style={[styles.actionText, { color: colors.danger }]}>
                  Deactivate reported user ({reportedUser.fullName || reportedUser.email})
                </Text>
              </TouchableOpacity>
            )}
            {!!reporter && (
              <TouchableOpacity
                style={[styles.actionRow, { borderColor: colors.border }]}
                onPress={() => deactivate(reporter, 'the reporter')}
              >
                <Ionicons name="person-remove-outline" size={16} color={colors.danger} />
                <Text style={[styles.actionText, { color: colors.danger }]}>
                  Deactivate reporter ({reporter.fullName || reporter.email})
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.actionRow, { borderColor: colors.border }]} onPress={remove}>
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
              <Text style={[styles.actionText, { color: colors.danger }]}>Delete report</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tileRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.sm,
    paddingHorizontal: 4,
    minHeight: 64,
  },
  tileValue: { ...TYPOGRAPHY.h2, fontSize: 20, lineHeight: 24 },
  tileLabel: { ...TYPOGRAPHY.caption, fontSize: 11, fontWeight: '700', marginTop: 2 },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.sm,
  },
  listTitle: { ...TYPOGRAPHY.caption, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  showAll: { ...TYPOGRAPHY.caption, fontWeight: '700' },
  chip: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.pill, borderWidth: 1 },
  chipText: { ...TYPOGRAPHY.caption, fontWeight: '700' },
  list: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xl },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  thumb: { width: 44, height: 44, borderRadius: RADIUS.md },
  thumbIcon: { alignItems: 'center', justifyContent: 'center' },
  reportBody: { flex: 1 },
  reportTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
  reportType: { ...TYPOGRAPHY.body, fontWeight: '700', flexShrink: 1 },
  reportMeta: { ...TYPOGRAPHY.caption, marginTop: 2 },
  reportMessage: { ...TYPOGRAPHY.caption, marginTop: 4 },
  empty: { alignItems: 'center', marginTop: SPACING.xl },
  emptyText: { ...TYPOGRAPHY.body, marginTop: SPACING.sm, textAlign: 'center' },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '88%' },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  sheetTitle: { ...TYPOGRAPHY.h2 },
  sheetScroll: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xxl },
  metaLine: { ...TYPOGRAPHY.caption, marginBottom: SPACING.md },
  quote: { borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md },
  quoteText: { ...TYPOGRAPHY.body },
  scanBox: { marginBottom: SPACING.md },
  scanImage: { width: '100%', height: 180, borderRadius: RADIUS.md, marginBottom: SPACING.xs },
  scanMeta: { ...TYPOGRAPHY.body, fontWeight: '700' },
  hint: { ...TYPOGRAPHY.caption, marginTop: 2 },
  sectionLabel: { ...TYPOGRAPHY.caption, fontWeight: '700', letterSpacing: 0.4, marginBottom: SPACING.xs },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  noteInput: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    minHeight: 80,
    textAlignVertical: 'top',
    ...TYPOGRAPHY.body,
    marginBottom: SPACING.md,
  },
  saveButton: { borderRadius: RADIUS.pill, paddingVertical: SPACING.md, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.45 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  actionText: { ...TYPOGRAPHY.caption, fontWeight: '700', flex: 1 },
});