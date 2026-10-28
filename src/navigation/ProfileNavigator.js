import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import ScanDetailScreen from '../screens/Profile/ScanDetailScreen';

const Stack = createNativeStackNavigator();

// Nested inside the Profile tab so the bottom tab bar stays visible on the
// account/history screen, and the scan detail view gets its own back
// navigation — same pattern as MyOrchidsNavigator. Both screens build their
// own header, so the native one stays hidden here.
export default function ProfileNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="ScanDetail" component={ScanDetailScreen} />
    </Stack.Navigator>
  );
}
