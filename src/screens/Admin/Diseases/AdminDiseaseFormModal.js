import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import FormModal from '../../../components/FormModal';
import AuthTextField from '../../../components/AuthTextField';
import PrimaryButton from '../../../components/PrimaryButton';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../../utils/theme';

const CATEGORIES = ['Fungal', 'Bacterial', 'Viral'];
const SEVERITIES = ['Mild', 'Moderate', 'Severe'];

const emptyForm = {
  name: '',
  classificationLabel: '',
  category: 'Fungal',
  severity: 'Moderate',
  protocolsText: '',
  sampleTreatment: '',
};

// Shared Add/Edit form for the Disease Knowledge Base. `initialValue` is a
// disease record (or null when adding a new one); `onSubmit` receives the
// entry shaped for diseasesService.addDisease/updateDisease.
export default function AdminDiseaseFormModal({ visible, initialValue, onClose, onSubmit }) {
  const { colors } = useTheme();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (initialValue) {
      setForm({
        name: initialValue.name || '',
        classificationLabel: initialValue.classificationLabel || '',
        category: initialValue.category || 'Fungal',
        severity: initialValue.severity || 'Moderate',
        protocolsText: (initialValue.protocols || []).join('\n'),
        sampleTreatment: initialValue.sampleTreatment || (initialValue.protocols || []).join(' '),
      });
    } else {
      setForm(emptyForm);
    }
    setError(null);
  }, [visible, initialValue]);

  const update = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.name.trim()) return setError('Enter a disease name.');
    if (!form.classificationLabel.trim()) return setError('Enter a classification label.');
    setError(null);
    setIsSaving(true);
    try {
      const protocols = form.protocolsText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      await onSubmit({
        name: form.name.trim(),
        classificationLabel: form.classificationLabel.trim(),
        category: form.category,
        severity: form.severity,
        protocols,
        sampleTreatment: form.sampleTreatment.trim() || protocols.join(' '),
      });
    } catch (submitError) {
      setError(submitError.message || 'Could not save this entry.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderChipRow = (options, selected, onSelect) => (
    <View style={styles.chipRow}>
      {options.map((option) => {
        const active = selected === option;
        return (
          <TouchableOpacity
            key={option}
            onPress={() => onSelect(option)}
            style={[
              styles.chip,
              { borderColor: active ? colors.primary : colors.border },
              active && { backgroundColor: colors.primary + '1A' },
            ]}
          >
            <Text style={[styles.chipText, { color: active ? colors.primary : colors.textSecondary }]}>
              {option}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <FormModal
      visible={visible}
      title={initialValue ? 'Edit Disease Entry' : 'Add Disease Entry'}
      onClose={onClose}
    >
      <AuthTextField
        label="Disease name"
        icon="leaf-outline"
        value={form.name}
        onChangeText={update('name')}
        placeholder="Leaf Spot"
        colors={colors}
      />
      <AuthTextField
        label="Classification label"
        icon="pricetag-outline"
        value={form.classificationLabel}
        onChangeText={update('classificationLabel')}
        placeholder="leaf_spot"
        autoCapitalize="none"
        colors={colors}
      />

      <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Category</Text>
      {renderChipRow(CATEGORIES, form.category, update('category'))}

      <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Severity</Text>
      {renderChipRow(SEVERITIES, form.severity, update('severity'))}

      <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Treatment protocols</Text>
      <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>One step per line</Text>
      <TextInput
        style={[styles.textArea, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background }]}
        value={form.protocolsText}
        onChangeText={update('protocolsText')}
        placeholder={'Remove affected tissue.\nApply copper-based fungicide every 7 days.\nIsolate plant to prevent spread.'}
        placeholderTextColor={colors.textSecondary}
        multiline
        numberOfLines={4}
      />

      {!!error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}

      <PrimaryButton
        title={initialValue ? 'Save Changes' : 'Add Disease Entry'}
        onPress={handleSubmit}
        loading={isSaving}
        colors={colors}
        style={styles.submit}
      />
    </FormModal>
  );
}

const styles = StyleSheet.create({
  fieldLabel: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: SPACING.xs,
  },
  fieldHint: { ...TYPOGRAPHY.caption, marginBottom: SPACING.xs },
  chipRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  chip: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.pill, borderWidth: 1 },
  chipText: { ...TYPOGRAPHY.caption, fontWeight: '700' },
  textArea: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    minHeight: 100,
    textAlignVertical: 'top',
    ...TYPOGRAPHY.body,
    marginBottom: SPACING.md,
  },
  error: { ...TYPOGRAPHY.caption, textAlign: 'center', marginBottom: SPACING.sm },
  submit: { marginBottom: SPACING.lg },
});