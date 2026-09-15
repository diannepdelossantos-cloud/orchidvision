import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { humanizeLabel, isHealthyLabel, TARGET_SPECIES } from '../utils/diseaseInfo';
import { SEVERITY_COLORS, SEVERITY_ORDER } from '../utils/severity';

// `diseaseEntry` is the matching document from the admin-managed Firestore
// disease knowledge base (see useDiseaseInfo), keyed by the classifier's raw
// label — undefined if nobody has added an entry for this label yet. Beyond
// `result` itself, nothing here is model output: name/category/severity/
// protocols are all admin-authored content, just no longer hardcoded into
// the app bundle.
export default function ScanResultCard({ result, overridden = false, diseaseEntry }) {
  if (!result) return null;

  const label = result.top.label;
  const isHealthy = isHealthyLabel(label);
  const confidence = (result.top.score * 100).toFixed(1);
  const statusColor = isHealthy ? '#2e7d32' : '#c62828';
  const severityIndex = diseaseEntry ? SEVERITY_ORDER.indexOf(diseaseEntry.severity) : -1;

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
          {isHealthy ? 'Healthy' : diseaseEntry?.name ?? humanizeLabel(label)}
        </Text>

        <Text style={styles.meta}>
          Confidence {confidence}% · {TARGET_SPECIES}
        </Text>

        {!!diseaseEntry?.category && (
          <View style={styles.chipRow}>
            <View style={styles.chip}>
              <Text style={styles.chipText}>{diseaseEntry.category}</Text>
            </View>
          </View>
        )}

        {severityIndex >= 0 && (
          <View style={styles.severityRow}>
            <Text style={styles.severityLabel}>SEVERITY</Text>
            <View style={styles.severityBar}>
              {SEVERITY_ORDER.map((level, i) => (
                <View
                  key={level}
                  style={[
                    styles.segment,
                    {
                      backgroundColor:
                        i <= severityIndex ? SEVERITY_COLORS[diseaseEntry.severity] : '#e0e0e0',
                    },
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.severityValue, { color: SEVERITY_COLORS[diseaseEntry.severity] }]}>
              {diseaseEntry.severity}
            </Text>
          </View>
        )}

        {!result.isConfident && (
          <Text style={styles.lowConfidence}>
            Low confidence — retake with the affected area closer and in even
            daylight.
          </Text>
        )}
      </View>

      {/* ---------------- Care recommendation ---------------- */}
      <View style={styles.card}>
        <Text style={styles.cardHeading}>CARE RECOMMENDATION</Text>

        {isHealthy ? (
          <Text style={styles.sectionBody}>No treatment needed. Keep monitoring regularly.</Text>
        ) : diseaseEntry?.protocols?.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Ionicons name="medkit-outline" size={16} color="#ef6c00" />
              <Text style={[styles.sectionTitle, { color: '#ef6c00' }]}>RECOMMENDED STEPS</Text>
            </View>
            {diseaseEntry.protocols.map((step, i) => (
              <Text key={i} style={styles.sectionBody}>
                • {step}
              </Text>
            ))}
          </View>
        ) : (
          <Text style={styles.sectionBody}>
            No care guidance has been added yet for "{diseaseEntry?.name ?? humanizeLabel(label)}" in
            the disease knowledge base.
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

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  chip: {
    backgroundColor: '#fdf3d8',
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: { fontSize: 12, color: '#6b5518' },

  severityRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  severityLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6d6d6d',
    letterSpacing: 0.5,
    marginRight: 10,
  },
  severityBar: { flexDirection: 'row', flex: 1 },
  segment: { flex: 1, height: 5, borderRadius: 3, marginRight: 4 },
  severityValue: { fontSize: 11, fontWeight: '600', marginLeft: 8 },

  lowConfidence: {
    fontSize: 12,
    color: '#8a5a00',
    marginTop: 12,
    lineHeight: 17,
  },

  section: { marginTop: 0 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  sectionBody: { fontSize: 13, color: '#3a3a3a', lineHeight: 19 },

  disclaimer: {
    fontSize: 11,
    color: '#8a8a8a',
    fontStyle: 'italic',
    lineHeight: 16,
    marginBottom: 24,
  },
});
