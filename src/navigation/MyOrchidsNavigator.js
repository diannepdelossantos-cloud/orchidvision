import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MyOrchidsScreen from '../screens/Main/MyOrchidsScreen';
import OrchidDetailScreen from '../screens/Main/OrchidDetailScreen';

const Stack = createNativeStackNavigator();

// Nested inside the My Orchids tab so the bottom tab bar stays visible on
// the list, and the detail screen gets its own back navigation. Both
// screens build their own header, so the native one stays hidden here.
export default function MyOrchidsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MyOrchidsList" component={MyOrchidsScreen} />
      <Stack.Screen name="OrchidDetail" component={OrchidDetailScreen} />
    </Stack.Navigator>
  );
}
