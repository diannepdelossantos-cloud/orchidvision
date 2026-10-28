import React, { useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DetectionOverlay from './DetectionOverlay';
import ImageZoomModal from './ImageZoomModal';
import ScanResultCard from './ScanResultCard';
import { useTheme } from '../context/ThemeContext';
import { formatScanDate } from '../utils/formatDate';
import { RADIUS, SPACING, TYPOGRAPHY } from '../utils/theme';

// Same cut-off the scanner uses for its "low confidence" warning; only used
// when an older scan record didn't store isConfident itself.
const CONFIDENCE_THRESHOLD = 0.6;

// Full-screen view of a saved scan, shown exactly like a fresh scan result:
// photo + YOLO boxes, then ScanResultCard (name, tags, severity and the
// treatment/care card from the Disease Knowledge Base).
// Opened from Scan History with the scan record that screen already has,
// so it needs no extra route or Firestore read.
export default function ScanRecordDetailModal({ scan, orchidNickname, onClose }) {
  const { colors } = useTheme();
  const [zoomVisible, setZoomVisible] = useState(false);

  const visible = !!scan;
  const confidence = scan?.confidence || 0;
  const result = scan
    ? {
        top: { label: scan.label, score: confidence },
        isConfident: scan.isConfident ?? confidence >= CONFIDENCE_THRESHOLD,
      }
    : null;
  const imageUrl = scan?.imageUrl || scan?.imageUri;
  const detections = scan?.detections || [];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {scan && (
          <ScrollView contentContainerStyle={styles.scroll}>
            <View style={styles.titleRow}>
              <TouchableOpacity
                onPress={onClose}
                style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
              <View style={styles.titleTextWrap}>
                <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
                  {orchidNickname || 'Scan result'}
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Scanned {formatScanDate(scan.createdAt)}
                </Text>
              </View>
            </View>

            <View style={styles.imageWrap}>
              {imageUrl ? (
                <TouchableOpacity activeOpacity={0.9} onPress={() => setZoomVisible(true)}>
                  <Image source={{ uri: imageUrl }} style={styles.image} />
                  <DetectionOverlay imageUri={imageUrl} detections={detections} />
                </TouchableOpacity>
              ) : (
                <View style={[styles.image, styles.imagePlaceholder, { backgroundColor: colors.surface }]}>
                  <Ionicons name="image-outline" size={40} color={colors.textSecondary} />
                </View>
              )}
            </View>

            <ScanResultCard result={result} overridden={!!scan.overridden} />
          </ScrollView>
        )}

        {!!imageUrl && (
          <ImageZoomModal
            visible={zoomVisible}
            imageUri={imageUrl}
            detections={detections}
            onClose={() => setZoomVisible(false)}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingTop: SPACING.xl, paddingBottom: SPACING.xl },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.xl,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  titleTextWrap: { flex: 1 },
  title: { ...TYPOGRAPHY.h2 },
  subtitle: { ...TYPOGRAPHY.caption, marginTop: 2 },

  imageWrap: { paddingHorizontal: SPACING.xl, marginBottom: SPACING.md },
  image: { width: '100%', height: 260, borderRadius: RADIUS.lg, resizeMode: 'cover' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
});
