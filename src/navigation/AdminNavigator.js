import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminDashboardScreen from '../screens/Admin/AdminDashboardScreen';
import AdminUsersScreen from '../screens/Admin/AdminUsersScreen';
import AdminContentScreen from '../screens/Admin/AdminContentScreen';
<<<<<<< HEAD
=======
import { useTheme } from '../context/ThemeContext';
>>>>>>> 18cf3e604744173e06bdb69d02798de7208d020d

const Stack = createNativeStackNavigator();

export default function AdminNavigator() {
<<<<<<< HEAD
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
      <Stack.Screen name="AdminContent" component={AdminContentScreen} />
    </Stack.Navigator>
  );
}
=======
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
      }}
    >
      {/* AdminDashboardScreen builds its own header, so the native one stays hidden here. */}
      <Stack.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminUsers"
        component={AdminUsersScreen}
        options={{ title: 'Manage Users' }}
      />
      <Stack.Screen
        name="AdminContent"
        component={AdminContentScreen}
        options={{ title: 'Manage Content' }}
      />
    </Stack.Navigator>
  );
}
>>>>>>> 18cf3e604744173e06bdb69d02798de7208d020d
