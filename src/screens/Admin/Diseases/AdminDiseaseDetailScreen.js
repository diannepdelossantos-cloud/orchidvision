import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import * as diseasesService from '../../../services/firebase/diseasesService';
import Badge from '../../../components/Badge';
import AdminDiseaseFormModal from './AdminDiseaseFormModal';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../../utils/theme';
import { showAlert } from '../../../utils/showAlert';
import { exportDiseaseCsv, exportDiseasePdf } from '../../../utils/diseaseExport';

const categoryTone = { None: 'info', Fungal: 'fungal', Bacterial: 'bacterial', Viral: 'viral', Physiological: 'info' };
const severityTone = { None: 'mild', Mild: 'mild', Moderate: 'moderate', Severe: 'severe' };

// Detail view for a single Disease Knowledge Base entry. "Edit Entry"
// reuses the same Add/Edit modal as the list screen; the record shown
// here is passed in via route params, which is fine since diseasesService
// keeps this screen's Firestore doc in sync whenever it re-mounts.
export default function AdminDiseaseDetailScreen({ route, navigation }) {
  const { colors } = useTheme();
  const [disease, setDisease] = useState(route.params?.disease);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [exportMenuVisible, setExportMenuVisible] = useState(false);
  const [exporting, setExporting] = useState(null); // 'pdf' | 'csv' | null

  useEffect(() => {
    if (route.params?.disease) setDisease(route.params.disease);
  }, [route.params?.disease]);

  if (!disease) return null;

  const handleSubmit = async (entry) => {
    await diseasesService.updateDisease(disease.id, entry);
    setDisease({ ...disease, ...entry });
    setIsFormVisible(false);
  };

  const runExport = async (format) => {
    setExportMenuVisible(false);
    setExporting(format);
    try {
      if (format === 'pdf') await exportDiseasePdf(disease);
      else await exportDiseaseCsv(disease);
    } catch (error) {
      showAlert('Export failed', error?.message || 'Could not export this entry.');
    } finally {
      setExporting(null);
    }
  };

  const formatUpdated = () => {
    if (disease.updatedLabel) return disease.updatedLabel;
    if (disease.updatedAt?.toDate) {
      return disease.updatedAt.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
    return '—';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={16} color={colors.primary} />
          <Text style={[styles.backText, { color: colors.primary }]}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.titleRow}>
            <View style={[styles.iconBadge, { backgroundColor: colors.background }]}>
              <Ionicons name="leaf-outline" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.diseaseName, { color: colors.textPrimary }]}>{disease.name}</Text>
          </View>

          <View style={styles.badgeRow}>
            <Badge label={disease.category} tone={categoryTone[disease.category] || 'info'} />
            <Badge label={disease.severity} tone={severityTone[disease.severity] || 'moderate'} style={styles.badgeGap} />
          </View>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Classification label</Text>
          <Text style={[styles.mono, { color: colors.textPrimary }]}>{disease.classificationLabel}</Text>

          <View style={styles.divider} />

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Preventive protocols</Text>
          {(disease.prevention || []).length > 0 ? (
            (disease.prevention || []).map((tip, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={[styles.bullet, { color: colors.primary }]}>•</Text>
                <Text style={[styles.value, styles.bulletText, { color: colors.textPrimary }]}>{tip}</Text>
              </View>
            ))
          ) : (
            <Text style={[styles.value, { color: colors.textSecondary }]}>
              No preventive protocols yet — tap Edit Entry to add them.
            </Text>
          )}

          <View style={styles.divider} />

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Last updated</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{formatUpdated()}</Text>

          <View style={[styles.sampleBox, { backgroundColor: colors.background }]}>
            <Text style={[styles.sampleLabel, { color: colors.primary }]}>Treatment Recommendation</Text>
            {(disease.protocols || []).length > 0 ? (
              (disease.protocols || []).map((step, i) => (
                <View key={i} style={styles.bulletRow}>
                  {disease.protocols.length > 1 && (
                    <Text style={[styles.sampleText, styles.stepNumber, { color: colors.primary }]}>{i + 1}.</Text>
                  )}
                  <Text style={[styles.sampleText, styles.bulletText, { color: colors.textSecondary }]}>{step}</Text>
                </View>
              ))
            ) : (
              <Text style={[styles.sampleText, { color: colors.textSecondary }]}>
                {disease.sampleTreatment || 'No treatment needed.'}
              </Text>
            )}
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: colors.primary }]}
              onPress={() => setIsFormVisible(true)}
            >
              <Ionicons name="pencil-outline" size={16} color={colors.textInverse} />
              <Text style={[styles.editButtonText, { color: colors.textInverse }]}>Edit Entry</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.downloadButton, { borderColor: colors.border }]}
              onPress={() => setExportMenuVisible(true)}
              disabled={!!exporting}
            >
              {exporting ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="download-outline" size={18} color={colors.textPrimary} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={exportMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setExportMenuVisible(false)}
      >
        <Pressable style={styles.menuBackdrop} onPress={() => setExportMenuVisible(false)}>
          <Pressable style={[styles.menuCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>Export entry</Text>
            <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>{disease.name}</Text>
            {[
              { key: 'pdf', icon: 'document-text-outline', label: 'PDF', hint: 'Formatted sheet to print or share' },
              { key: 'csv', icon: 'grid-outline', label: 'CSV', hint: 'Spreadsheet (Excel, Google Sheets)' },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.menuOption, { borderColor: colors.border }]}
                onPress={() => runExport(opt.key)}
              >
                <Ionicons name={opt.icon} size={20} color={colors.primary} />
                <View style={styles.menuOptionText}>
                  <Text style={[styles.menuOptionLabel, { color: colors.textPrimary }]}>{opt.label}</Text>
                  <Text style={[styles.menuOptionHint, { color: colors.textSecondary }]}>{opt.hint}</Text>
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.menuCancel} onPress={() => setExportMenuVisible(false)}>
              <Text style={[styles.menuCancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <AdminDiseaseFormModal
        visible={isFormVisible}
        initialValue={disease}
        onClose={() => setIsFormVisible(false)}
        onSubmit={handleSubmit}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.md },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  backText: { ...TYPOGRAPHY.body, fontWeight: '700' },
  scroll: { padding: SPACING.xl },
  card: { borderRadius: RADIUS.lg, padding: SPACING.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  iconBadge: { width: 40, height: 40, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  diseaseName: { ...TYPOGRAPHY.h2 },
  badgeRow: { flexDirection: 'row', marginBottom: SPACING.lg },
  badgeGap: { marginLeft: SPACING.xs },
  fieldLabel: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
  },
  mono: { ...TYPOGRAPHY.body, fontFamily: 'monospace' },
  value: { ...TYPOGRAPHY.body },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E0E0E0', marginVertical: SPACING.md },
  sampleBox: { borderRadius: RADIUS.md, padding: SPACING.md, marginTop: SPACING.lg },
  sampleLabel: { ...TYPOGRAPHY.caption, fontWeight: '700', marginBottom: SPACING.xs },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  bullet: { ...TYPOGRAPHY.body, width: 14 },
  stepNumber: { width: 18, fontWeight: '700' },
  bulletText: { flex: 1 },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  menuCard: { borderRadius: RADIUS.lg, padding: SPACING.lg, width: '100%', maxWidth: 380, alignSelf: 'center' },
  menuTitle: { ...TYPOGRAPHY.body, fontWeight: '700', textAlign: 'center' },
  menuSubtitle: { ...TYPOGRAPHY.caption, textAlign: 'center', marginTop: 2, marginBottom: SPACING.md },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  menuOptionText: { flex: 1 },
  menuOptionLabel: { ...TYPOGRAPHY.body, fontWeight: '700' },
  menuOptionHint: { ...TYPOGRAPHY.caption, marginTop: 2 },
  menuCancel: { alignItems: 'center', paddingVertical: SPACING.sm, marginTop: SPACING.xs },
  menuCancelText: { ...TYPOGRAPHY.body, fontWeight: '700' },
  sampleText: { ...TYPOGRAPHY.caption, lineHeight: 18 },
  actionsRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.pill,
  },
  editButtonText: { ...TYPOGRAPHY.button },
  downloadButton: {
    width: 48,
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});