import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import FormModal from './FormModal';
import AuthTextField from './AuthTextField';
import PrimaryButton from './PrimaryButton';
import { useTheme } from '../context/ThemeContext';
import { SPACING } from '../utils/theme';

// The "Register orchid" bottom sheet opened from the Save button on a scan
// result. Only asks for a nickname — species is pre-filled from the scan
// (the model only targets one species today) but stays editable.
export default function SaveOrchidModal({ visible, defaultSpeciesName, saving, onClose, onSubmit }) {
  const { colors } = useTheme();
  const [nickname, setNickname] = useState('');
  const [speciesName, setSpeciesName] = useState(defaultSpeciesName);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setNickname('');
      setSpeciesName(defaultSpeciesName);
      setError('');
    }
  }, [visible, defaultSpeciesName]);

  const handleSubmit = () => {
    if (!nickname.trim()) {
      setError('Give this orchid a nickname.');
      return;
    }
    onSubmit({ nickname: nickname.trim(), speciesName: speciesName.trim() });
  };

  return (
    <FormModal visible={visible} title="Register orchid" onClose={onClose}>
      <AuthTextField
        label="Orchid nickname"
        icon="pricetag-outline"
        value={nickname}
        onChangeText={(text) => {
          setNickname(text);
          if (error) setError('');
        }}
        placeholder="e.g. Pink-maroon"
        error={error}
        colors={colors}
      />
      <AuthTextField
        label="Species name"
        icon="leaf-outline"
        value={speciesName}
        onChangeText={setSpeciesName}
        colors={colors}
      />
      <PrimaryButton
        title="Save as new orchid"
        onPress={handleSubmit}
        loading={saving}
        colors={colors}
        style={styles.submitButton}
      />
    </FormModal>
  );
}

const styles = StyleSheet.create({
  submitButton: { marginTop: SPACING.sm },
});
