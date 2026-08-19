import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../context/ThemeContext';
import AdminHeader from '../../../components/AdminHeader';
import ModelsTab from './ModelsTab';
import ImagesTab from './ImagesTab';
import MetricsTab from './MetricsTab';
import { SPACING, TYPOGRAPHY } from '../../../utils/theme';
import { MODEL_VERSIONS, PENDING_REVIEW_IMAGES } from '../../../utils/adminMockData';

const TABS = ['Models', 'Images', 'Metrics'];

// Dataset & Model screen. Model registry and the pending-review queue are
// placeholder in-memory state (see adminMockData.js) shared across the
// three sub-tabs — swap useState for real Firestore subscriptions once a
// `models` / `trainingImages` collection exists, the tabs themselves don't
// need to change.
export default function AdminDataScreen() {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState('Models');
  const [models, setModels] = useState(MODEL_VERSIONS);
  const [pendingImages, setPendingImages] = useState(PENDING_REVIEW_IMAGES);

  const activeModel = models.find((m) => m.status === 'Active') || models[0];

  const handleDeploy = (modelId) => {
    setModels((prev) =>
      prev.map((model) => ({ ...model, status: model.id === modelId ? 'Active' : 'Archived' })),
    );
  };

  const handleAddImages = (entries) => {
    setPendingImages((prev) => [...entries, ...prev]);
  };

  const handleApprove = (id) => {
    setPendingImages((prev) => prev.filter((item) => item.id !== id));
  };

  const handleReject = (id) => {
    setPendingImages((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <AdminHeader title="Dataset & Model" subtitle="Datasets, versions, and metrics" />

      <View style={[styles.tabRow, { borderColor: colors.border }]}>
        {TABS.map((tab) => {
          const active = activeTab === tab;
          return (
            <TouchableOpacity key={tab} style={styles.tabButton} onPress={() => setActiveTab(tab)}>
              <Text style={[styles.tabText, { color: active ? colors.primary : colors.textSecondary }]}>
                {tab}
              </Text>
              {active && <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {activeTab === 'Models' && <ModelsTab models={models} onDeploy={handleDeploy} />}
      {activeTab === 'Images' && (
        <ImagesTab
          pendingImages={pendingImages}
          onAddImages={handleAddImages}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
      {activeTab === 'Metrics' && (
        <MetricsTab pendingCount={pendingImages.length} currentAccuracy={activeModel.accuracy} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabButton: { marginRight: SPACING.lg, paddingBottom: SPACING.sm, alignItems: 'center' },
  tabText: { ...TYPOGRAPHY.body, fontWeight: '700' },
  tabIndicator: { height: 2, width: '100%', borderRadius: 1, marginTop: SPACING.sm },
});