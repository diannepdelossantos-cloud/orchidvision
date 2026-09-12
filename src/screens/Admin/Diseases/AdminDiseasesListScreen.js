import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import * as diseasesService from '../../../services/firebase/diseasesService';
import AdminHeader from '../../../components/AdminHeader';
import Badge from '../../../components/Badge';
import PrimaryButton from '../../../components/PrimaryButton';
import AdminDiseaseFormModal from './AdminDiseaseFormModal';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../../utils/theme';
import { showAlert } from '../../../utils/showAlert';

const categoryTone = { Fungal: 'fungal', Bacterial: 'bacterial', Viral: 'viral' };
const severityTone = { Mild: 'mild', Moderate: 'moderate', Severe: 'severe' };

export default function AdminDiseasesListScreen({ navigation }) {
  const { colors } = useTheme();
  const [diseases, setDiseases] = useState([]);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingDisease, setEditingDisease] = useState(null);

  useEffect(() => {
    const unsubscribe = diseasesService.subscribeToAllDiseases(setDiseases);
    return unsubscribe;
  }, []);

  const openAdd = () => {
    setEditingDisease(null);
    setIsFormVisible(true);
  };

  const openEdit = (disease) => {
    setEditingDisease(disease);
    setIsFormVisible(true);
  };

  const handleSubmit = async (entry) => {
    if (editingDisease) {
      await diseasesService.updateDisease(editingDisease.id, entry);
    } else {
      await diseasesService.addDisease(entry);
    }
    setIsFormVisible(false);
  };

  const handleDelete = (disease) => {
    showAlert('Delete this entry?', `"${disease.name}" will be removed from the knowledge base.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => diseasesService.deleteDisease(disease.id) },
    ]);
  };

  const formatUpdated = (disease) => {
    if (disease.updatedLabel) return disease.updatedLabel;
    if (disease.updatedAt?.toDate) {
      return disease.updatedAt.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
    return '—';
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface }]}
      onPress={() => navigation.navigate('AdminDiseaseDetail', { disease: item })}
      activeOpacity={0.8}
    >
      <View style={[styles.iconBadge, { backgroundColor: colors.background }]}>
        <Ionicons name="leaf-outline" size={18} color={colors.primary} />
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{item.name}</Text>
        <View style={styles.badgeRow}>
          <Badge label={item.category} tone={categoryTone[item.category] || 'info'} />
          <Badge label={item.severity} tone={severityTone[item.severity] || 'moderate'} style={styles.badgeGap} />
        </View>
        <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
          {item.classificationLabel}   {(item.protocols || []).length} protocols   Updated {formatUpdated(item)}
        </Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity
          onPress={() => openEdit(item)}
          style={[styles.iconButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
        >
          <Ionicons name="pencil-outline" size={16} color={colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleDelete(item)}
          style={[styles.iconButton, styles.deleteButton, { borderColor: '#F7CFCB' }]}
        >
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <AdminHeader title="Disease Knowledge Base" subtitle="Manage disease entries" />

      <View style={styles.addWrapper}>
        <PrimaryButton title="+ Add Disease Entry" onPress={openAdd} colors={colors} />
      </View>

      <FlatList
        data={diseases}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No diseases yet — tap "Add Disease Entry" to create the first one.
          </Text>
        }
      />

      <AdminDiseaseFormModal
        visible={isFormVisible}
        initialValue={editingDisease}
        onClose={() => setIsFormVisible(false)}
        onSubmit={handleSubmit}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  addWrapper: { paddingHorizontal: SPACING.xl, marginBottom: SPACING.md },
  list: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xl },
  emptyText: { ...TYPOGRAPHY.body, textAlign: 'center', marginTop: SPACING.xl },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardTitle: { ...TYPOGRAPHY.body, fontWeight: '700', marginBottom: 4 },
  badgeRow: { flexDirection: 'row', marginBottom: 6 },
  badgeGap: { marginLeft: SPACING.xs },
  cardMeta: { ...TYPOGRAPHY.caption },
  cardActions: { gap: SPACING.xs },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: { backgroundColor: '#FDECEA' },
});