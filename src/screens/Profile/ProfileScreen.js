import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import AuthTextField from '../../components/AuthTextField';
import PrimaryButton from '../../components/PrimaryButton';
import DangerButton from '../../components/DangerButton';
import HistoryTab from './HistoryTab';
import RestoreScreen from './RestoreScreen';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../context/ProfileContext';
import { getAuthErrorMessage } from '../../utils/authErrors';
import { showAlert } from '../../utils/showAlert';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../utils/theme';

function getInitials(fullName) {
  const words = (fullName || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  return (words[0][0] + (words[1]?.[0] || '')).toUpperCase();
}

const TABS = [
  { key: 'account', label: 'Account', icon: 'person-outline' },
  { key: 'history', label: 'History', icon: 'time-outline' },
];

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { user, signOutUser } = useAuth();
  const { profile, loading, updateProfile, uploadAvatar } = useProfile();

  const [fullName, setFullName] = useState('');
  const [location, setLocation] = useState('');
  const [stationId, setStationId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [activeTab, setActiveTab] = useState('account');
  const [showRestore, setShowRestore] = useState(false);

  // Seed the editable fields once the Firestore document arrives; profile
  // updates from elsewhere (another device/tab) also flow through here.
  useEffect(() => {
    if (!profile) return;
    setFullName(profile.fullName || '');
    setLocation(profile.location || '');
    setStationId(profile.stationId || '');
  }, [profile]);

  const selectTab = (tabKey) => {
    setActiveTab(tabKey);
    setShowRestore(false);
  };

  const handlePickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert('Photo access needed', 'Enable photo library access to change your profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled) return;

    setIsUploadingAvatar(true);
    try {
      await uploadAvatar(result.assets[0].uri);
    } catch (error) {
      showAlert('Upload failed', getAuthErrorMessage(error));
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({ fullName: fullName.trim(), location: location.trim(), stationId: stationId.trim() });
      showAlert('Saved', 'Your profile has been updated.');
    } catch (error) {
      showAlert('Could not save', getAuthErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = () => {
    showAlert('Sign out?', 'You can sign back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOutUser },
    ]);
  };

  if (loading || !profile) {
    return (
      <SafeAreaView style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.titleRow}>
          {showRestore && (
            <TouchableOpacity
              onPress={() => setShowRestore(false)}
              style={styles.backButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          )}
          <Text style={[styles.title, { color: colors.textPrimary }]}>Profile</Text>
        </View>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Manage your OrchidVision account
        </Text>

        <View style={styles.tabRow}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tabButton,
                  isActive
                    ? { backgroundColor: colors.primary }
                    : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
                ]}
                onPress={() => selectTab(tab.key)}
              >
                <Ionicons name={tab.icon} size={16} color={isActive ? colors.textInverse : colors.textSecondary} />
                <Text style={[styles.tabButtonText, { color: isActive ? colors.textInverse : colors.textSecondary }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {showRestore ? (
          <RestoreScreen colors={colors} />
        ) : activeTab === 'history' ? (
          <HistoryTab colors={colors} onOpenRestore={() => setShowRestore(true)} />
        ) : (
          <>
            <View style={[styles.headerCard, { backgroundColor: colors.surface }]}>
              <View style={styles.avatarWrap}>
                {profile.photoURL ? (
                  <Image source={{ uri: profile.photoURL }} style={styles.avatarImage} />
                ) : (
                  <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
                    <Text style={styles.avatarInitials}>{getInitials(profile.fullName)}</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={[styles.avatarBadge, { backgroundColor: colors.primary, borderColor: colors.surface }]}
                  onPress={handlePickAvatar}
                  disabled={isUploadingAvatar}
                >
                  {isUploadingAvatar ? (
                    <ActivityIndicator size="small" color={colors.textInverse} />
                  ) : (
                    <Ionicons name="camera" size={14} color={colors.textInverse} />
                  )}
                </TouchableOpacity>
              </View>

              <Text style={[styles.name, { color: colors.textPrimary }]}>{profile.fullName}</Text>
              <Text style={[styles.email, { color: colors.textSecondary }]}>{user?.email}</Text>

              {!!profile.stationId && (
                <View style={[styles.stationBadge, { borderColor: colors.primary }]}>
                  <Text style={[styles.stationBadgeText, { color: colors.primary }]}>{profile.stationId}</Text>
                </View>
              )}
            </View>

            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Account Info</Text>

            <AuthTextField
              label="Full Name"
              icon="person-outline"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              colors={colors}
            />
            <AuthTextField
              label="Email"
              icon="mail-outline"
              value={user?.email || ''}
              editable={false}
              colors={colors}
            />
            <AuthTextField
              label="Location"
              icon="location-outline"
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. Greenhouse A"
              colors={colors}
            />
            <AuthTextField
              label="Station ID"
              icon="pricetag-outline"
              value={stationId}
              onChangeText={setStationId}
              placeholder="e.g. Lab Station #1"
              colors={colors}
            />

            <PrimaryButton title="Save changes" onPress={handleSave} loading={isSaving} colors={colors} />

            <DangerButton
              title="Sign Out"
              icon="log-out-outline"
              variant="outline"
              onPress={handleSignOut}
              colors={colors}
              style={styles.signOutButton}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    padding: SPACING.xl,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: SPACING.sm,
  },
  title: {
    ...TYPOGRAPHY.h1,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    marginBottom: SPACING.lg,
  },
  tabRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.pill,
    paddingVertical: SPACING.sm,
  },
  tabButtonText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    marginLeft: 6,
  },
  headerCard: {
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  avatarWrap: {
    marginBottom: SPACING.md,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarInitials: {
    ...TYPOGRAPHY.h1,
    color: '#FFFFFF',
  },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    ...TYPOGRAPHY.h2,
  },
  email: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  stationBadge: {
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
  },
  stationBadgeText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
  },
  sectionLabel: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  signOutButton: {
    marginTop: SPACING.md,
  },
});
