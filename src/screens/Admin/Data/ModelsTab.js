import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import Badge from '../../../components/Badge';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../../utils/theme';
import { showAlert } from '../../../utils/showAlert';

// Model registry list. `models`/`onDeploy` are lifted to AdminDataScreen
// (placeholder in-memory state — see adminMockData.js) so the active
// version can also drive the Home dashboard's "Model" stat card and the
// Metrics tab's accuracy chart without duplicating state.
export default function ModelsTab({ models, onDeploy }) {
  const { colors } = useTheme();

  const handleDeploy = (model) => {
    showAlert('Deploy this version?', `${model.version} will become the active model for all scans.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Deploy', onPress: () => onDeploy(model.id) },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {models.map((model) => {
        const isActive = model.status === 'Active';
        return (
          <View
            key={model.id}
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: isActive ? colors.primary : 'transparent' },
              isActive && styles.activeCard,
            ]}
          >
            <View style={styles.topRow}>
              <Text style={[styles.version, { color: colors.textPrimary }]}>{model.version}</Text>
              <Badge label={model.status} tone={isActive ? 'active' : 'inactive'} />
            </View>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              Accuracy <Text style={{ color: colors.primary, fontWeight: '700' }}>{model.accuracy}%</Text>
              {'   '}Deployed {model.deployedOn}
            </Text>
            {!isActive && (
              <TouchableOpacity
                style={[styles.deployButton, { backgroundColor: colors.primary + '1A' }]}
                onPress={() => handleDeploy(model)}
              >
                <Text style={[styles.deployButtonText, { color: colors.primary }]}>Deploy this version</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACING.xl, gap: SPACING.sm },
  card: { borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1.5 },
  activeCard: {},
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs },
  version: { ...TYPOGRAPHY.h2 },
  meta: { ...TYPOGRAPHY.caption },
  deployButton: {
    alignSelf: 'flex-start',
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.pill,
  },
  deployButtonText: { ...TYPOGRAPHY.caption, fontWeight: '700' },
});