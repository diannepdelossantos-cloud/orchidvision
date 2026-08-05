import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  DISEASE_INFO,
  SEVERITY_LEVELS,
  TARGET_SPECIES,
} from '../utils/diseaseInfo';

const SEVERITY_SEGMENTS = 4;

export default function ScanResultCard({ result, overridden = false }) {
  if (!result) return null;

  const info = DISEASE_INFO[result.top.label];
  const confidence = (result.top.score * 100).toFixed(1);
  const severity = SEVERITY_LEVELS[info?.severity];

  const statusColor = info?.isHealthy ? '#2e7d32' : '#c62828';

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
          {info?.status} · {info?.displayName ?? result.top.label}
        </Text>

        <Text style={styles.meta}>
          Confidence {confidence}% · {TARGET_SPECIES}
        </Text>

        {info?.tags?.length > 0 && (
          <View style={styles.chipRow}>
            {info.tags.map((t) => (
              <View key={t} style={styles.chip}>
                <Text style={styles.chipText}>{t}</Text>
              </View>
            ))}
          </View>
        )}

        {info?.severity > 0 && (
          <View style={styles.severityRow}>
            <Text style={styles.severityLabel}>SEVERITY</Text>
            <View style={styles.severityBar}>
              {Array.from({ length: SEVERITY_SEGMENTS }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.segment,
                    {
                      backgroundColor:
                        i < info.severity ? severity.color : '#e0e0e0',
                    },
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.severityValue, { color: severity.color }]}>
              {severity.label}
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

      {/* ---------------- Treatment ---------------- */}
      {(info?.treatment || info?.prevention) && (
        <View style={styles.card}>
          <Text style={styles.cardHeading}>TREATMENT RECOMMENDATION</Text>

          {!!info.treatment && (
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Ionicons name="medkit-outline" size={16} color="#ef6c00" />
                <Text style={[styles.sectionTitle, { color: '#ef6c00' }]}>
                  TREATMENT
                </Text>
              </View>
              <Text style={styles.sectionBody}>{info.treatment}</Text>
            </View>
          )}

          {!!info.prevention && (
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={16}
                  color="#2e7d32"
                />
                <Text style={[styles.sectionTitle, { color: '#2e7d32' }]}>
                  PREVENTION
                </Text>
              </View>
              <Text style={styles.sectionBody}>{info.prevention}</Text>
            </View>
          )}
        </View>
      )}

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

  section: { marginTop: 12 },
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