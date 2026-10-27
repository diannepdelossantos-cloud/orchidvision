import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { humanizeLabel, isHealthyLabel, TARGET_SPECIES } from '../utils/diseaseInfo';

// Everything shown here is model output: the classifier's raw label
// (formatted for display), its confidence score, and — via YOLOv8 —
// bounding boxes drawn separately on the photo above this card. No
// treatment/severity/symptom content is included.
export default function ScanResultCard({ result, overridden = false }) {
  if (!result) return null;

  const label = result.top.label;
  const isHealthy = isHealthyLabel(label);
  const confidence = (result.top.score * 100).toFixed(1);
  const statusColor = isHealthy ? '#2e7d32' : '#c62828';

  return (
    <View style={styles.wrap}>
      {overridden && (
        <View style={styles.overrideNotice}>
          <Ionicons name="alert-circle-outline" size={16} color="#ef6c00" />
          <Text style={styles.overrideText}>
            This image was not recognised as an orchid. Results below are
            unreliable.
          </Text>
        </View>
      )}

      {/* ---------------- Scan result detail ---------------- */}
      <View style={styles.card}>
        <Text style={styles.cardHeading}>SCAN RESULT DETAIL</Text>

        <Text style={[styles.title, { color: statusColor }]}>
          {isHealthy ? 'Healthy' : humanizeLabel(label)}
        </Text>

        <Text style={styles.meta}>
          Confidence {confidence}% · {TARGET_SPECIES}
        </Text>

        {!result.isConfident && (
          <Text style={styles.lowConfidence}>
            Low confidence — retake with the affected area closer and in even
            daylight.
          </Text>
        )}
      </View>

      <Text style={styles.disclaimer}>
        Preliminary model trained on a limited dataset. Confirm with a grower
        before treating.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16 },

  overrideNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff4e5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  overrideText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    color: '#8a5a00',
    lineHeight: 17,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ececec',
    padding: 16,
    marginBottom: 14,
  },
  cardHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3a3a3a',
    letterSpacing: 0.6,
    marginBottom: 10,
  },

  title: { fontSize: 17, fontWeight: '700' },
  meta: { fontSize: 13, color: '#6d6d6d', marginTop: 3 },

  lowConfidence: {
    fontSize: 12,
    color: '#8a5a00',
    marginTop: 12,
    lineHeight: 17,
  },

  disclaimer: {
    fontSize: 11,
    color: '#8a8a8a',
    fontStyle: 'italic',
    lineHeight: 16,
    marginBottom: 24,
  },
});
