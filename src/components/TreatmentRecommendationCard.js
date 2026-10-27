import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useDiseaseForLabel } from '../context/DiseasesContext';
import { normalizeLabel } from '../services/firebase/diseasesService';
import { HEALTHY_LABELS } from '../utils/modelLabels';
import { RADIUS, SPACING, TYPOGRAPHY } from '../utils/theme';

// Drop this under the scan result. Pass the raw label from the model.
// It reads the Disease Knowledge Base entry the admin manages, so editing
// an entry changes what users see here. Healthy results get a care card.
export default function TreatmentRecommendationCard({ label }) {
  const { colors } = useTheme();
  const { entry, isLoading } = useDiseaseForLabel(label);

  if (!label) return null;

  const isHealthy = HEALTHY_LABELS.includes(normalizeLabel(label));
  const heading = isHealthy ? 'CARE RECOMMENDATION' : 'TREATMENT RECOMMENDATION';
  const cardStyle = [styles.card, { backgroundColor: colors.surface, borderColor: colors.border }];

  if (isLoading) {
    return (
      <View style={cardStyle}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!entry) {
    return (
      <View style={cardStyle}>
        <Text style={[styles.title, { color: colors.textSecondary }]}>{heading}</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          {isHealthy
            ? 'Your orchid looks healthy. Keep up its regular care and inspect it routinely.'
            : 'No care guide is available for this result yet. Isolate the plant and consult a grower or agriculturist.'}
        </Text>
      </View>
    );
  }

  const Section = ({ icon, heading: sectionHeading, tint, items }) =>
    items?.length ? (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name={icon} size={16} color={tint} />
          <Text style={[styles.sectionTitle, { color: tint }]}>{sectionHeading}</Text>
        </View>
        {items.map((item, i) => (
          <Text key={i} style={[styles.body, { color: colors.textPrimary }]}>
            {items.length > 1 ? `• ${item}` : item}
          </Text>
        ))}
      </View>
    ) : null;

  return (
    <View style={cardStyle}>
      <Text style={[styles.title, { color: colors.textSecondary }]}>{heading}</Text>
      <Section icon="medkit-outline" heading="TREATMENT" tint={colors.warning || '#E8833A'} items={entry.protocols} />
      <Section
        icon="shield-checkmark-outline"
        heading={isHealthy ? 'CARE' : 'PREVENTION'}
        tint={colors.primary}
        items={entry.prevention}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.md, marginTop: SPACING.md },
  title: { ...TYPOGRAPHY.caption, fontWeight: '700', letterSpacing: 0.5, marginBottom: SPACING.sm },
  section: { marginBottom: SPACING.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  sectionTitle: { ...TYPOGRAPHY.caption, fontWeight: '700' },
  body: { ...TYPOGRAPHY.caption, lineHeight: 18 },
});
