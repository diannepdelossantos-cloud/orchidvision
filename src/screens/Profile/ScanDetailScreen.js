import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DetectionOverlay from '../../components/DetectionOverlay';
import ImageZoomModal from '../../components/ImageZoomModal';
import ScanResultCard from '../../components/ScanResultCard';
import { useScanHistory } from '../../context/ScanHistoryContext';
import { CONFIDENCE_THRESHOLD } from '../../services/predictionService';

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

// Reuses ScanScreen's exact result-view styling (light background, same
// back button, same image treatment) so opening a scan from history looks
// identical to the screen it was originally shown on — just without the
// capture/save actions, which don't apply to an already-saved record.
export default function ScanDetailScreen({ route, navigation }) {
  const { scanId } = route.params;
  const { records, deletedRecords } = useScanHistory();
  const [zoomVisible, setZoomVisible] = useState(false);

  const scan = records.find((r) => r.id === scanId) || deletedRecords.find((r) => r.id === scanId);

  if (!scan) {
    return (
      <View style={[styles.resultContainer, styles.centered]}>
        <Ionicons name="alert-circle-outline" size={40} color="#c62828" />
        <Text style={styles.emptyTitle}>Couldn't find this scan</Text>
        <Text style={styles.emptySubtitle}>It may have been permanently deleted.</Text>
      </View>
    );
  }

  return (
    <View style={styles.resultContainer}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#1b3a1e" />
        </TouchableOpacity>

        <View style={styles.imageWrap}>
          {scan.imageUrl ? (
            <TouchableOpacity activeOpacity={0.9} onPress={() => setZoomVisible(true)}>
              <Image source={{ uri: scan.imageUrl }} style={styles.resultImage} />
              <DetectionOverlay imageUri={scan.imageUrl} detections={scan.detections || []} />
            </TouchableOpacity>
          ) : (
            <View style={[styles.resultImage, styles.imagePlaceholder]}>
              <Ionicons name="flower-outline" size={40} color="#8a8a8a" />
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
    </View>
  );
}

const styles = StyleSheet.create({
  resultContainer: { flex: 1, backgroundColor: '#f5f7f5', paddingTop: 50 },
  centered: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },

  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
    marginBottom: 12,
  },

  imageWrap: { marginHorizontal: 16, marginBottom: 56 },
  resultImage: { width: '100%', height: 220, borderRadius: 14, resizeMode: 'cover' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#e8e8e8' },

  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#1b3a1e', marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: '#6d6d6d', marginTop: 4, textAlign: 'center' },
});
