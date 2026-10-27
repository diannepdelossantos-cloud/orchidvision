import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase/firebaseConfig';
import DetectionOverlay from '../../components/DetectionOverlay';
import ImageZoomModal from '../../components/ImageZoomModal';
import ScanResultCard from '../../components/ScanResultCard';
import { useTheme } from '../../context/ThemeContext';
import { formatScanDate } from '../../utils/formatDate';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../utils/theme';

// Same confidence cut-off the scanner uses for its "low confidence" warning.
// Only used when an older scan record didn't store isConfident itself.
const CONFIDENCE_THRESHOLD = 0.6;

// Re-opens a saved scan and shows it exactly like a fresh scan result:
// photo + YOLO boxes, then ScanResultCard (name, tags, severity, and the
// treatment/care card from the Disease Knowledge Base).
export default function ScanRecordDetailScreen({ route, navigation }) {
  const { scanId, orchidNickname } = route.params;
  const { colors } = useTheme();

  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [zoomVisible, setZoomVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getDoc(doc(db, 'scans', scanId))
      .then((snap) => {
        if (cancelled) return;
        if (snap.exists()) setScan({ id: snap.id, ...snap.data() });
        else setLoadError('This scan record no longer exists.');
      })
      .catch((error) => !cancelled && setLoadError(error?.message || 'Could not load this scan.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [scanId]);

  const header = (
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
          {orchidNickname || 'Scan result'}
        </Text>
        {!!scan && (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Scanned {formatScanDate(scan.createdAt)}
          </Text>
        )}
      </View>
    </View>
  );

  if (loading || loadError || !scan) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.headerPad}>{header}</View>
        <View style={styles.centered}>
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <>
              <Ionicons name="alert-circle-outline" size={40} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.textSecondary }]}>{loadError}</Text>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Adapt the stored record to the shape ScanResultCard expects from a live scan.
  const confidence = scan.confidence || 0;
  const result = {
    top: { label: scan.label, score: confidence },
    isConfident: scan.isConfident ?? confidence >= CONFIDENCE_THRESHOLD,
  };
  const imageUrl = scan.imageUrl || scan.imageUri;
  const detections = scan.detections || [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView>
        <View style={styles.headerPad}>{header}</View>

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

      {!!imageUrl && (
        <ImageZoomModal
          visible={zoomVisible}
          imageUri={imageUrl}
          detections={detections}
          onClose={() => setZoomVisible(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerPad: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.xl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.xl },
  errorText: { ...TYPOGRAPHY.caption, marginTop: SPACING.sm, textAlign: 'center' },

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

  imageWrap: { paddingHorizontal: SPACING.xl, marginBottom: SPACING.md },
  image: { width: '100%', height: 260, borderRadius: RADIUS.lg, resizeMode: 'cover' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
});
