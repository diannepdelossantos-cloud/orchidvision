import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import * as diseasesService from '../../../services/firebase/diseasesService';
import Badge from '../../../components/Badge';
import AdminDiseaseFormModal from './AdminDiseaseFormModal';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../../utils/theme';
import { showAlert } from '../../../utils/showAlert';

const categoryTone = { Fungal: 'fungal', Bacterial: 'bacterial', Viral: 'viral' };
const severityTone = { Mild: 'mild', Moderate: 'moderate', Severe: 'severe' };

// Detail view for a single Disease Knowledge Base entry. "Edit Entry"
// reuses the same Add/Edit modal as the list screen; the record shown
// here is passed in via route params, which is fine since diseasesService
// keeps this screen's Firestore doc in sync whenever it re-mounts.
export default function AdminDiseaseDetailScreen({ route, navigation }) {
  const { colors } = useTheme();
  const [disease, setDisease] = useState(route.params?.disease);
  const [isFormVisible, setIsFormVisible] = useState(false);

  useEffect(() => {
    if (route.params?.disease) setDisease(route.params.disease);
  }, [route.params?.disease]);

  if (!disease) return null;

  const handleSubmit = async (entry) => {
    await diseasesService.updateDisease(disease.id, entry);
    setDisease({ ...disease, ...entry });
    setIsFormVisible(false);
  };

  const handleExport = () => {
    showAlert('Export entry', 'Exporting disease entries as PDF/CSV is coming soon.');
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

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Treatment protocols</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>
            {(disease.protocols || []).length} entries
          </Text>

          <View style={styles.divider} />

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Last updated</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{formatUpdated()}</Text>

          <View style={[styles.sampleBox, { backgroundColor: colors.background }]}>
            <Text style={[styles.sampleLabel, { color: colors.primary }]}>Sample treatment: </Text>
            <Text style={[styles.sampleText, { color: colors.textSecondary }]}>
              {disease.sampleTreatment || (disease.protocols || []).join(' ')}
            </Text>
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
              onPress={handleExport}
            >
              <Ionicons name="download-outline" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

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
  sampleLabel: { ...TYPOGRAPHY.caption, fontWeight: '700' },
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