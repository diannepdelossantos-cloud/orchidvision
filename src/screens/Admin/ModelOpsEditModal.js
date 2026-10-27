import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { saveModelOps } from '../../services/firebase/monitorService';
import { MODEL_LABELS } from '../../utils/modelLabels';
import { toDate } from '../../utils/adminStats';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../utils/theme';

// YYYY-MM-DD <-> Date, in local time. Empty string = no date.
const toInputDate = (value) => {
  const d = toDate(value);
  if (!d) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const parseInputDate = (text) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim());
  if (!match) return null;
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(d.getTime()) ? null : d;
};

// Admin form for the dataset & retraining record (modelOps/current).
// Class rows follow the model's classes (utils/modelLabels.js) plus any
// extra class already saved, so counts can be copied from Roboflow.
export default function ModelOpsEditModal({ visible, modelOps, colors, onClose }) {
  const [version, setVersion] = useState('');
  const [counts, setCounts] = useState({});
  const [lastTrained, setLastTrained] = useState('');
  const [nextRetrain, setNextRetrain] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const classKeys = [...new Set([...MODEL_LABELS, ...Object.keys(modelOps?.classCounts || {})])];

  useEffect(() => {
    if (!visible) return;
    setVersion(modelOps?.datasetVersion || '');
    const initial = {};
    classKeys.forEach((k) => {
      const n = modelOps?.classCounts?.[k];
      initial[k] = n != null ? String(n) : '';
    });
    setCounts(initial);
    setLastTrained(toInputDate(modelOps?.lastTrainedAt));
    setNextRetrain(toInputDate(modelOps?.nextRetrainAt));
    setNotes(modelOps?.notes || '');
    setError(null);
  }, [visible]);

  const total = Object.values(counts).reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0);

  const handleSave = async () => {
    if (!version.trim()) return setError('Enter a dataset version, e.g. v3.');
    if (lastTrained && !parseInputDate(lastTrained)) return setError('Last trained date must be YYYY-MM-DD.');
    if (nextRetrain && !parseInputDate(nextRetrain)) return setError('Next retraining date must be YYYY-MM-DD.');

    const classCounts = {};
    Object.entries(counts).forEach(([k, v]) => {
      const n = parseInt(v, 10);
      if (!Number.isNaN(n) && n >= 0) classCounts[k] = n;
    });

    setError(null);
    setSaving(true);
    try {
      await saveModelOps(
        {
          datasetVersion: version.trim(),
          classCounts,
          lastTrainedAt: lastTrained ? parseInputDate(lastTrained) : null,
          nextRetrainAt: nextRetrain ? parseInputDate(nextRetrain) : null,
          notes: notes.trim(),
        },
        modelOps?.datasetVersion,
      );
      onClose();
    } catch (e) {
      setError(e?.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = [styles.input, { borderColor: colors.border, color: colors.textPrimary }];
  const versionChanged = !!version.trim() && version.trim() !== (modelOps?.datasetVersion || '');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={saving ? undefined : onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Dataset & Retraining</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10} disabled={saving}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <Text style={[styles.label, { color: colors.textSecondary }]}>DATASET VERSION</Text>
            <TextInput style={inputStyle} value={version} onChangeText={setVersion} placeholder="e.g. v3" placeholderTextColor={colors.textSecondary} autoCapitalize="none" />
            {versionChanged && (
              <Text style={[styles.hint, { color: colors.primary }]}>
                New version — saving adds a point to the dataset growth chart.
              </Text>
            )}

            <Text style={[styles.label, { color: colors.textSecondary }]}>IMAGES PER CLASS · TOTAL {total}</Text>
            {classKeys.map((k) => (
              <View key={k} style={styles.countRow}>
                <Text style={[styles.countLabel, { color: colors.textPrimary }]}>{k}</Text>
                <TextInput
                  style={[inputStyle, styles.countInput]}
                  value={counts[k] ?? ''}
                  onChangeText={(t) => setCounts((prev) => ({ ...prev, [k]: t.replace(/[^0-9]/g, '') }))}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            ))}

            <Text style={[styles.label, { color: colors.textSecondary }]}>LAST TRAINED (YYYY-MM-DD)</Text>
            <TextInput style={inputStyle} value={lastTrained} onChangeText={setLastTrained} placeholder="2026-10-20" placeholderTextColor={colors.textSecondary} />

            <Text style={[styles.label, { color: colors.textSecondary }]}>NEXT RETRAINING (YYYY-MM-DD)</Text>
            <TextInput style={inputStyle} value={nextRetrain} onChangeText={setNextRetrain} placeholder="2026-11-20" placeholderTextColor={colors.textSecondary} />

            <Text style={[styles.label, { color: colors.textSecondary }]}>NOTES</Text>
            <TextInput
              style={[inputStyle, styles.notes]}
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Add more anthracnose images before next run"
              placeholderTextColor={colors.textSecondary}
              multiline
            />

            {!!error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.primary }, saving && styles.busy]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  title: { ...TYPOGRAPHY.h2 },
  scroll: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xxl },
  label: { ...TYPOGRAPHY.caption, fontWeight: '700', letterSpacing: 0.4, marginTop: SPACING.md, marginBottom: SPACING.xs },
  hint: { ...TYPOGRAPHY.caption, marginTop: 4 },
  input: { borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, ...TYPOGRAPHY.body },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xs },
  countLabel: { ...TYPOGRAPHY.caption, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', flex: 1 },
  countInput: { width: 90, textAlign: 'right' },
  notes: { minHeight: 70, textAlignVertical: 'top' },
  error: { ...TYPOGRAPHY.caption, textAlign: 'center', marginTop: SPACING.md },
  saveButton: { borderRadius: RADIUS.pill, paddingVertical: SPACING.md, alignItems: 'center', marginTop: SPACING.lg },
  busy: { opacity: 0.7 },
  saveText: { color: '#fff', fontWeight: '700' },
});
