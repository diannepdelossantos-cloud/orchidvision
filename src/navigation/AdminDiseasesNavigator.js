import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminDiseasesListScreen from '../screens/Admin/Diseases/AdminDiseasesListScreen';
import AdminDiseaseDetailScreen from '../screens/Admin/Diseases/AdminDiseaseDetailScreen';

const Stack = createNativeStackNavigator();

// Nested inside the Diseases tab so the bottom tab bar stays visible on
// the list, and the detail screen gets its own back navigation (matching
// the storyboard's "< Back" link) without a native header bar.
export default function AdminDiseasesNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminDiseasesList" component={AdminDiseasesListScreen} />
      <Stack.Screen name="AdminDiseaseDetail" component={AdminDiseaseDetailScreen} />
    </Stack.Navigator>
  );
}