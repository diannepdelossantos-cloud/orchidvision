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
import { useTheme } from '../context/ThemeContext';
import { TARGET_SPECIES } from '../utils/diseaseInfo';

// "Register orchid" popup shown over the scan result.
//   <RegisterOrchidModal
//     visible={registerVisible}
//     onClose={() => setRegisterVisible(false)}
//     onSubmit={async ({ nickname, speciesName }) => { ...save... }}
//   />
// onSubmit may throw; the message is shown inside the modal.
export default function RegisterOrchidModal({ visible, onClose, onSubmit, defaultSpecies = TARGET_SPECIES }) {
  const { colors } = useTheme();
  const [nickname, setNickname] = useState('');
  const [speciesName, setSpeciesName] = useState(defaultSpecies || '');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setNickname('');
    setSpeciesName(defaultSpecies || '');
    setError(null);
    setSaving(false);
  }, [visible, defaultSpecies]);

  const handleSave = async () => {
    if (!nickname.trim()) return setError('Give your orchid a nickname.');
    setError(null);
    setSaving(true);
    try {
      await onSubmit({ nickname: nickname.trim(), speciesName: speciesName.trim() || defaultSpecies });
    } catch (e) {
      setError(e?.message || 'Could not save this orchid.');
    } finally {
      setSaving(false);
    }
  };

  const primary = colors.primary || '#4caf50';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={saving ? undefined : onClose} />

        <View style={styles.sheetWrap}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose} disabled={saving} hitSlop={10}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>

          <View style={[styles.sheet, { backgroundColor: colors.surface || '#fff' }]}>
            <View style={styles.header}>
              <View style={styles.headerShade} />
              <Text style={styles.headerTitle}>Register orchid</Text>
            </View>

            <View style={styles.body}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>ORCHID NICKNAME</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
                value={nickname}
                onChangeText={setNickname}
                placeholder="e.g. Pink-maroon"
                placeholderTextColor={colors.textSecondary}
                maxLength={40}
                autoFocus
                returnKeyType="next"
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>SPECIES NAME</Text>
              <TextInput
                style={[styles.input, styles.italic, { borderColor: colors.border, color: colors.textPrimary }]}
                value={speciesName}
                onChangeText={setSpeciesName}
                placeholder="Vanda sanderiana"
                placeholderTextColor={colors.textSecondary}
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />

              {!!error && <Text style={[styles.error, { color: colors.error || '#c62828' }]}>{error}</Text>}

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: primary }, saving && styles.saving]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save as new orchid</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  sheetWrap: { width: '100%', maxWidth: 420, alignSelf: 'center' },
  closeButton: { alignSelf: 'flex-end', marginBottom: 10, padding: 2 },

  sheet: {
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },

  // Dark-to-green header. Two layers fake the gradient so no extra
  // dependency is needed; swap for expo-linear-gradient if you add it.
  header: {
    backgroundColor: '#2f8f3a',
    paddingVertical: 18,
    alignItems: 'center',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  headerShade: {
    ...StyleSheet.absoluteFillObject,
    bottom: '50%',
    backgroundColor: '#1b5e20',
    opacity: 0.55,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },

  body: { padding: 18, paddingTop: 22 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: 15,
    marginBottom: 16,
  },
  italic: { fontStyle: 'italic' },
  error: { fontSize: 12, textAlign: 'center', marginTop: -6, marginBottom: 10 },

  saveButton: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  saving: { opacity: 0.7 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
