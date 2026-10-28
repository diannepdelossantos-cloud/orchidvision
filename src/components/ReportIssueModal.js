import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { REPORT_TYPES, createReport } from '../services/firebase/reportService';
import { logError } from '../utils/errorLogger';

// "Report an issue" form for regular users.
//   <ReportIssueModal visible onClose scan={{ id, label, confidence, imageUrl }} />
// `scan` is optional — leave it out for a general app problem report (e.g.
// from Settings). `defaultType` preselects a reason.
export default function ReportIssueModal({ visible, onClose, scan = null, defaultType }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const typeKeys = scan
    ? ['wrong_diagnosis', 'inappropriate_image', 'app_problem', 'other']
    : ['app_problem', 'other'];

  const [type, setType] = useState(defaultType || typeKeys[0]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setType(defaultType || typeKeys[0]);
    setMessage('');
    setError(null);
    setSent(false);
    setSending(false);
  }, [visible]);

  const handleSend = async () => {
    if (!user) return setError('Please sign in to send a report.');
    if (type !== 'wrong_diagnosis' && !message.trim()) return setError('Tell us what happened.');
    setError(null);
    setSending(true);
    try {
      await createReport(user, { type, message: message.trim(), scan });
      setSent(true);
    } catch (e) {
      logError('reports.create', e);
      setError(
        e?.code === 'permission-denied'
          ? 'Your account cannot send reports right now.'
          : e?.message || 'Could not send the report.',
      );
    } finally {
      setSending(false);
    }
  };

  const primary = colors.primary || '#4caf50';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={sending ? undefined : onClose} />
        <View style={[styles.card, { backgroundColor: colors.surface || '#fff' }]}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {scan ? 'Report this result' : 'Report a problem'}
            </Text>
            <TouchableOpacity onPress={onClose} disabled={sending} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {sent ? (
            <View style={styles.sentWrap}>
              <Ionicons name="checkmark-circle" size={44} color={primary} />
              <Text style={[styles.sentTitle, { color: colors.textPrimary }]}>Report sent</Text>
              <Text style={[styles.sentBody, { color: colors.textSecondary }]}>
                Thanks — an admin will review it.
              </Text>
              <TouchableOpacity
                style={[styles.button, styles.doneButton, { backgroundColor: primary }]}
                onPress={onClose}
                activeOpacity={0.85}
              >
                <Text style={styles.buttonText}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={[styles.label, { color: colors.textSecondary }]}>REASON</Text>
              <View style={styles.chipRow}>
                {typeKeys.map((key) => {
                  const active = type === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => setType(key)}
                      style={[
                        styles.chip,
                        { borderColor: active ? primary : colors.border },
                        active && { backgroundColor: primary + '1A' },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: active ? primary : colors.textSecondary }]}>
                        {REPORT_TYPES[key]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.label, { color: colors.textSecondary }]}>DETAILS</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
                value={message}
                onChangeText={setMessage}
                placeholder={
                  type === 'wrong_diagnosis'
                    ? 'Optional — what do you think it actually is?'
                    : 'Describe the problem'
                }
                placeholderTextColor={colors.textSecondary}
                multiline
                maxLength={500}
              />

              {!!error && <Text style={[styles.error, { color: colors.error || colors.danger }]}>{error}</Text>}

              <TouchableOpacity
                style={[styles.button, { backgroundColor: primary }, sending && styles.busy]}
                onPress={handleSend}
                disabled={sending}
              >
                {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send report</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: 24 },
  card: { borderRadius: 18, padding: 18, width: '100%', maxWidth: 420, alignSelf: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  title: { fontSize: 17, fontWeight: '700' },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontSize: 12, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 90,
    textAlignVertical: 'top',
    fontSize: 14,
    marginBottom: 12,
  },
  error: { fontSize: 12, textAlign: 'center', marginBottom: 10 },
  button: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  busy: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  sentWrap: { alignItems: 'center', paddingTop: 4 },
  sentTitle: { fontSize: 16, fontWeight: '700', marginTop: 10 },
  sentBody: { fontSize: 13, lineHeight: 18, marginTop: 4, marginBottom: 20, textAlign: 'center' },
  // The success view centers its content, which made the button shrink to
  // the width of "Done"; stretch it to a full-width button like "Send report".
  doneButton: { alignSelf: 'stretch', width: '100%' },
});