import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../../utils/theme';
import { showAlert } from '../../../utils/showAlert';

// Images tab: upload picks real files via expo-image-picker (already a
// project dependency) and drops them into the pending-review queue.
// Approve/Reject here only update local state — wiring uploads to actual
// storage + a training-images collection is a follow-up backend task.
export default function ImagesTab({ pendingImages, onAddImages, onApprove, onReject }) {
  const { colors } = useTheme();
  const { user } = useAuth();

  const handleUpload = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert('Permission needed', 'Allow photo library access to upload training images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (result.canceled) return;

    const newEntries = result.assets.map((asset, index) => ({
      id: `${Date.now()}-${index}`,
      fileName: asset.fileName || `upload_${Date.now()}_${index}.jpg`,
      uploader: user?.displayName || user?.email || 'You',
      predictedLabel: 'Pending classification',
      uri: asset.uri,
    }));
    onAddImages(newEntries);
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <TouchableOpacity
        style={[styles.dropzone, { borderColor: colors.primary, backgroundColor: colors.primary + '0D' }]}
        onPress={handleUpload}
        activeOpacity={0.8}
      >
        <Ionicons name="cloud-upload-outline" size={28} color={colors.primary} />
        <Text style={[styles.dropzoneTitle, { color: colors.textPrimary }]}>Upload training images</Text>
        <Text style={[styles.dropzoneSubtitle, { color: colors.textSecondary }]}>
          JPG, PNG · Max 50MB per batch
        </Text>
      </TouchableOpacity>

      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
        PENDING REVIEW ({pendingImages.length})
      </Text>

      {pendingImages.map((item) => (
        <View key={item.id} style={[styles.reviewCard, { backgroundColor: colors.surface }]}>
          <View style={styles.reviewTopRow}>
            <View style={[styles.thumb, { backgroundColor: colors.background }]}>
              <Ionicons name="flask-outline" size={16} color={colors.primary} />
            </View>
            <View style={styles.reviewInfo}>
              <Text style={[styles.fileName, { color: colors.textPrimary }]}>{item.fileName}</Text>
              <Text style={[styles.reviewMeta, { color: colors.textSecondary }]}>
                by {item.uploader} · <Text style={{ color: colors.primary, fontWeight: '700' }}>{item.predictedLabel}</Text>
              </Text>
            </View>
          </View>
          <View style={styles.reviewActions}>
            <TouchableOpacity
              style={[styles.approveButton, { backgroundColor: colors.primary }]}
              onPress={() => onApprove(item.id)}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.textInverse} />
              <Text style={[styles.approveText, { color: colors.textInverse }]}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rejectButton, { borderColor: colors.danger }]}
              onPress={() => onReject(item.id)}
            >
              <Ionicons name="close" size={16} color={colors.danger} />
              <Text style={[styles.rejectText, { color: colors.danger }]}>Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {pendingImages.length === 0 && (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Nothing pending review.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACING.xl },
  dropzone: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
    marginBottom: SPACING.lg,
    gap: 4,
  },
  dropzoneTitle: { ...TYPOGRAPHY.body, fontWeight: '700', marginTop: SPACING.xs },
  dropzoneSubtitle: { ...TYPOGRAPHY.caption },
  sectionLabel: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  reviewCard: { borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm },
  reviewTopRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  thumb: { width: 36, height: 36, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  reviewInfo: { flex: 1 },
  fileName: { ...TYPOGRAPHY.body, fontWeight: '700' },
  reviewMeta: { ...TYPOGRAPHY.caption },
  reviewActions: { flexDirection: 'row', gap: SPACING.sm },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
  },
  approveText: { ...TYPOGRAPHY.caption, fontWeight: '700' },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  rejectText: { ...TYPOGRAPHY.caption, fontWeight: '700' },
  emptyText: { ...TYPOGRAPHY.body, textAlign: 'center', marginTop: SPACING.lg },
});