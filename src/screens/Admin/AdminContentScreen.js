import React, { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import * as adminService from '../../services/firebase/adminService';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../utils/theme';
import { showAlert } from '../../utils/showAlert';

export default function AdminContentScreen() {
  const { colors } = useTheme();
  const [scans, setScans] = useState([]);

  useEffect(() => {
    const unsubscribe = adminService.subscribeToAllScans(setScans);
    return unsubscribe;
  }, []);

  const handleDelete = (item) => {
    showAlert('Delete this scan record?', "This can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => adminService.deleteScan(item.id) },
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={[styles.scanCard, { backgroundColor: colors.surface }]}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.scanImage} />
      ) : (
        <View style={[styles.scanImagePlaceholder, { backgroundColor: colors.background }]}>
          <Ionicons name="image-outline" size={20} color={colors.textSecondary} />
        </View>
      )}
      <View style={styles.scanInfo}>
        <Text style={[styles.scanTitle, { color: colors.textPrimary }]}>
          {item.plantName || item.diagnosis || 'Scan result'}
        </Text>
        <Text style={[styles.scanSubtitle, { color: colors.textSecondary }]}>
          {item.userId ? `User: ${item.userId}` : 'Unknown user'}
        </Text>
      </View>
      <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteButton}>
        <Ionicons name="trash-outline" size={20} color={colors.danger || '#D14343'} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Manage Content</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {scans.length} scan records
        </Text>
      </View>
      <FlatList
        data={scans}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: SPACING.xl, paddingBottom: SPACING.md },
  title: { ...TYPOGRAPHY.h1 },
  subtitle: { ...TYPOGRAPHY.body },
  list: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xl },
  scanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  scanImage: { width: 48, height: 48, borderRadius: RADIUS.sm || 8 },
  scanImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.sm || 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanInfo: { flex: 1 },
  scanTitle: { ...TYPOGRAPHY.body, fontWeight: '600' },
  scanSubtitle: { ...TYPOGRAPHY.caption },
  deleteButton: { padding: SPACING.xs || 4 },
});