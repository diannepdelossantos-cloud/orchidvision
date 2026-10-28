import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { isHealthyLabel, TARGET_SPECIES } from '../utils/diseaseInfo';
import { useDiseaseForLabel } from '../context/DiseasesContext';
import TreatmentRecommendationCard from './TreatmentRecommendationCard';

// The diagnosis itself (label, confidence) is model output. The disease
// name, symptoms, severity and treatment come from the admin-managed
// Disease Knowledge Base, matched on the model's classification label.
const SEVERITY_LEVELS = ['Mild', 'Moderate', 'Severe'];
const SEVERITY_COLORS = { Mild: '#7cb342', Moderate: '#ef8c2f', Severe: '#c62828' };

export default function ScanResultCard({ result, overridden = false }) {
  const label = result?.top?.label;
  const { entry, isLoading } = useDiseaseForLabel(label); // hooks must run before any early return

  if (!result) return null;

  const isHealthy = isHealthyLabel(label);
  const confidence = (result.top.score * 100).toFixed(1);
  // Only diseases entered in the admin Disease Knowledge Base are named.
  // A model label with no entry (e.g. a class the admin hasn't added, or
  // has removed) is shown as unrecognized instead of its raw model name.
  const isUnrecognized = !isHealthy && !isLoading && !entry;
  const statusColor = isHealthy ? '#2e7d32' : isUnrecognized ? '#8a5a00' : '#c62828';
  const title = isHealthy
    ? 'Healthy'
    : isLoading
      ? 'Checking result…'
      : entry
        ? `Diseased · ${entry.name}`
        : 'Unrecognized condition';
  const severityIndex = entry ? SEVERITY_LEVELS.indexOf(entry.severity) : -1;

  // Don't recommend treatment or care for a non-orchid photo, or for a
  // result that doesn't match any knowledge-base entry.
  const showTreatment = !overridden && !isUnrecognized;

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
          {title}
        </Text>

        <Text style={styles.meta}>
          Confidence {confidence}% · {TARGET_SPECIES}
        </Text>

        {entry?.symptoms?.length > 0 && (
          <View style={styles.tagRow}>
            {entry.symptoms.map((symptom) => (
              <View key={symptom} style={[styles.tag, isHealthy && styles.tagHealthy]}>
                <Text style={[styles.tagText, isHealthy && styles.tagTextHealthy]}>{symptom}</Text>
              </View>
            ))}
          </View>
        )}

        {!isHealthy && severityIndex >= 0 && (
          <View style={styles.severityRow}>
            <Text style={styles.severityLabel}>SEVERITY</Text>
            <View style={styles.severityTrack}>
              {SEVERITY_LEVELS.map((level, i) => (
                <View
                  key={level}
                  style={[
                    styles.severitySegment,
                    { backgroundColor: i <= severityIndex ? SEVERITY_COLORS[entry.severity] : '#e6e6e6' },
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.severityValue, { color: SEVERITY_COLORS[entry.severity] }]}>
              {entry.severity}
            </Text>
          </View>
        )}

        {isUnrecognized && (
          <Text style={styles.lowConfidence}>
            This result doesn't match any disease in the OrchidVision knowledge
            base. Retake the photo, or consult a grower or agriculturist.
          </Text>
        )}

        {!result.isConfident && !isUnrecognized && (
          <Text style={styles.lowConfidence}>
            Low confidence — retake with the affected area closer and in even
            daylight.
          </Text>
        )}
      </View>

      {/* ---------------- Treatment recommendation ---------------- */}
      {showTreatment && <TreatmentRecommendationCard label={label} />}

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

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  // maxWidth keeps a long symptom inside the card: it wraps onto a second
  // line instead of running past the edge.
  tag: {
    backgroundColor: '#fff1dc',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: '100%',
  },
  tagText: { fontSize: 11, lineHeight: 15, fontWeight: '600', color: '#9a5b00', flexShrink: 1 },
  tagHealthy: { backgroundColor: '#e7f4e8' },
  tagTextHealthy: { color: '#2e7d32' },

  severityRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  severityLabel: { fontSize: 11, fontWeight: '700', color: '#3a3a3a', letterSpacing: 0.6, width: 70 },
  severityTrack: { flex: 1, flexDirection: 'row', gap: 4 },
  severitySegment: { flex: 1, height: 5, borderRadius: 3 },
  severityValue: { fontSize: 11, fontWeight: '700', marginLeft: 8, width: 62, textAlign: 'right' },

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
    marginTop: 14,
    marginBottom: 24,
  },
});