import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DetectionOverlay from '../../components/DetectionOverlay';
import ImageZoomModal from '../../components/ImageZoomModal';
import ScanResultCard from '../../components/ScanResultCard';
import { useScanHistory } from '../../context/ScanHistoryContext';
import { useTheme } from '../../context/ThemeContext';
import { CONFIDENCE_THRESHOLD } from '../../services/predictionService';
import { formatScanDate } from '../../utils/formatDate';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../utils/theme';

// Reconstructs a ScanResultCard-shaped result from a saved Firestore record.
// A live scan produces { top: {label, score}, ranked, isConfident } from
// predictDisease(); a stored record only kept label + confidence, so this
// rebuilds just enough of that shape for the card to render the same way it
// did right after the scan.
function toResult(scan) {
  return {
    top: { label: scan.label, score: scan.confidence || 0 },
    isConfident: (scan.confidence || 0) >= CONFIDENCE_THRESHOLD,
  };
}

export default function ScanDetailScreen({ route, navigation }) {
  const { scanId } = route.params;
  const { colors } = useTheme();
  const { records, deletedRecords } = useScanHistory();
  const [zoomVisible, setZoomVisible] = useState(false);

  const scan = records.find((r) => r.id === scanId) || deletedRecords.find((r) => r.id === scanId);

  if (!scan) {
    return (
      <SafeAreaView style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.error} />
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Couldn't find this scan</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          It may have been permanently deleted.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.titleRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.titleTextWrap}>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
              {scan.name}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {formatScanDate(scan.createdAt)} · {scan.source}
            </Text>
          </View>
        </View>

        <View style={styles.imageWrap}>
          {scan.imageUrl ? (
            <TouchableOpacity activeOpacity={0.9} onPress={() => setZoomVisible(true)}>
              <Image source={{ uri: scan.imageUrl }} style={styles.image} />
              <DetectionOverlay imageUri={scan.imageUrl} detections={scan.detections || []} />
            </TouchableOpacity>
          ) : (
            <View style={[styles.image, styles.imagePlaceholder, { backgroundColor: colors.surface }]}>
              <Ionicons name="flower-outline" size={40} color={colors.textSecondary} />
            </View>
          )}
        </View>

        <ScanResultCard result={toResult(scan)} />
      </ScrollView>

      <ImageZoomModal
        visible={zoomVisible}
        imageUri={scan.imageUrl}
        detections={scan.detections || []}
        onClose={() => setZoomVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.xl },
  scroll: { padding: SPACING.xl },

  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.lg },
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

  imageWrap: { marginBottom: SPACING.md },
  image: { width: '100%', height: 220, borderRadius: RADIUS.lg, resizeMode: 'cover' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },

  emptyTitle: { ...TYPOGRAPHY.body, fontWeight: '700', marginTop: SPACING.sm },
  emptySubtitle: { ...TYPOGRAPHY.caption, marginTop: 4, textAlign: 'center' },
});
