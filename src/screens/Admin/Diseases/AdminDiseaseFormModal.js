import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import FormModal from '../../../components/FormModal';
import AuthTextField from '../../../components/AuthTextField';
import PrimaryButton from '../../../components/PrimaryButton';
import { normalizeLabel } from '../../../services/firebase/diseasesService';
import { HEALTHY_LABELS, MODEL_LABELS } from '../../../utils/modelLabels';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../../utils/theme';

// "None" is for the healthy class (and any future non-disease class).
const CATEGORIES = ['None', 'Fungal', 'Bacterial', 'Viral', 'Physiological'];
const SEVERITIES = ['None', 'Mild', 'Moderate', 'Severe'];

const emptyForm = {
  name: '',
  classificationLabel: '',
  category: 'Fungal',
  severity: 'Moderate',
  symptomsText: '',
  protocolsText: '',
  preventionText: '',
};

const toLines = (text) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);


// Shared Add/Edit form for the Disease Knowledge Base. `initialValue` is a
// disease record (or null when adding); `onSubmit` receives the entry shaped
// for diseasesService.addDisease/updateDisease.
export default function AdminDiseaseFormModal({ visible, initialValue, onClose, onSubmit }) {
  const { colors } = useTheme();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const { height: windowHeight } = useWindowDimensions();

  useEffect(() => {
    if (!visible) return;
    if (initialValue) {
      setForm({
        name: initialValue.name || '',
        classificationLabel: initialValue.classificationLabel || '',
        category: initialValue.category || 'Fungal',
        severity: initialValue.severity || 'Moderate',
        symptomsText: (initialValue.symptoms || []).join('\n'),
        protocolsText: (initialValue.protocols || []).join('\n'),
        preventionText: (initialValue.prevention || []).join('\n'),
      });
    } else {
      setForm(emptyForm);
    }
    setError(null);
  }, [visible, initialValue]);

  const update = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  // Picking a healthy label presets Category/Severity to None.
  const pickLabel = (l) =>
    setForm((prev) =>
      HEALTHY_LABELS.includes(l)
        ? { ...prev, classificationLabel: l, category: 'None', severity: 'None' }
        : { ...prev, classificationLabel: l }
    );

  const label = normalizeLabel(form.classificationLabel);
  const labelIsKnown = !label || MODEL_LABELS.includes(label);
  const isHealthyEntry = HEALTHY_LABELS.includes(label) || form.severity === 'None';

  const handleSubmit = async () => {
    if (!form.name.trim()) return setError('Enter a disease name.');
    if (!label) return setError('Enter a classification label.');
    const protocols = toLines(form.protocolsText);
    if (protocols.length === 0 && form.severity !== 'None') {
      return setError('Add at least one treatment step.');
    }

    setError(null);
    setIsSaving(true);
    try {
      await onSubmit({
        name: form.name.trim(),
        classificationLabel: label,
        category: form.category,
        severity: form.severity,
        symptoms: toLines(form.symptomsText),
        protocols,
        prevention: toLines(form.preventionText),
        sampleTreatment: protocols.join(' '),
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

  // Fixed-height text areas that scroll inside themselves (scrollbar
  // hidden), so long lists stay reachable without stretching the form.
  const renderTextArea = (key, placeholder) => (
    <TextInput
      style={[
        styles.textArea,
        { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background },
      ]}
      value={form[key]}
      onChangeText={update(key)}
      placeholder={placeholder}
      placeholderTextColor={colors.textSecondary}
      multiline
      scrollEnabled
      textAlignVertical="top"
    />
  );

  return (
    <FormModal
      visible={visible}
      title={initialValue ? 'Edit Disease Entry' : 'Add Disease Entry'}
      onClose={onClose}
    >
      {/* The whole form scrolls (scrollbar hidden), so every field is
          reachable on any screen size without shrinking the window. */}
      <ScrollView
        style={{ maxHeight: Math.round(windowHeight * 0.72) }}
        contentContainerStyle={styles.formScroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
      <AuthTextField
        label="Disease name"
        icon="leaf-outline"
        value={form.name}
        onChangeText={update('name')}
        placeholder="Bacterial Brown Spot"
        colors={colors}
      />
      <AuthTextField
        label="Classification label"
        icon="pricetag-outline"
        value={form.classificationLabel}
        onChangeText={update('classificationLabel')}
        placeholder="bacterial_brown_spot"
        autoCapitalize="none"
        colors={colors}
      />
      <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
        Must match the model's output label. Tap one:
      </Text>
      <View style={styles.labelHintRow}>
        {MODEL_LABELS.map((l) => (
          <TouchableOpacity key={l} onPress={() => pickLabel(l)}>
            <Text style={[styles.labelHint, { color: l === label ? colors.primary : colors.textSecondary }]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {!labelIsKnown && (
        <Text style={[styles.warning, { color: colors.warning || '#B7791F' }]}>
          The current model doesn't output "{label}". You can still save it — it will match once a model with this class
          is bundled.
        </Text>
      )}

      <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Category</Text>
      {renderChipRow(CATEGORIES, form.category, update('category'))}

      <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Severity</Text>
      {renderChipRow(SEVERITIES, form.severity, update('severity'))}

      <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
        {isHealthyEntry ? 'Signs of a healthy plant' : 'Symptoms'}
      </Text>
      <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>One per line (each line becomes a tag on the scan)</Text>
      {renderTextArea('symptomsText', 'Leaf discoloration\nDark lesions')}

      <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Treatment protocols</Text>
      <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
        {isHealthyEntry ? 'Optional — e.g. "None needed."' : 'One step per line'}
      </Text>
      {renderTextArea('protocolsText', 'Remove affected leaves.\nApply copper-based fungicide every 7 days.')}

      <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
        {isHealthyEntry ? 'Prevention / care' : 'Prevention'}
      </Text>
      <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>One tip per line</Text>
      {renderTextArea('preventionText', 'Isolate plant.\nImprove air circulation.\nReduce leaf wetness.')}

      {!!error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}

      <PrimaryButton
        title={initialValue ? 'Save Changes' : 'Add Disease Entry'}
        onPress={handleSubmit}
        loading={isSaving}
        colors={colors}
        style={styles.submit}
      />
      </ScrollView>
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
  labelHintRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  labelHint: { ...TYPOGRAPHY.caption, fontFamily: 'monospace', textDecorationLine: 'underline' },
  warning: { ...TYPOGRAPHY.caption, marginBottom: SPACING.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  chip: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.pill, borderWidth: 1 },
  chipText: { ...TYPOGRAPHY.caption, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    ...TYPOGRAPHY.body,
    marginBottom: SPACING.md,
  },
  formScroll: { paddingBottom: 0 },
  textArea: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    height: 110,
    // Hides the inner scrollbar on web; ignored on phones, which already
    // hide it until you scroll.
    scrollbarWidth: 'none',
    textAlignVertical: 'top',
    ...TYPOGRAPHY.body,
    marginBottom: SPACING.md,
  },
  error: { ...TYPOGRAPHY.caption, textAlign: 'center', marginBottom: SPACING.sm },
  submit: { marginBottom: SPACING.xs },
});