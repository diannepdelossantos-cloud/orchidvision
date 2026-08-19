import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AdminDashboardScreen from '../screens/Admin/AdminDashboardScreen';
import AdminUsersScreen from '../screens/Admin/AdminUsersScreen';
<<<<<<< HEAD
import AdminContentScreen from '../screens/Admin/AdminContentScreen';
=======
import AdminDiseasesNavigator from './AdminDiseasesNavigator';
import AdminDataScreen from '../screens/Admin/Data/AdminDataScreen';
import AdminMonitorScreen from '../screens/Admin/AdminMonitorScreen';
import { useTheme } from '../context/ThemeContext';
>>>>>>> 87299738aa3cf1e49ea8f59fcc23a4a0ab2db92a

const Tab = createBottomTabNavigator();

// Bottom tab bar for the Admin Control Center: Home, Users, Diseases,
// Data, Monitor — matching the storyboard's five-tab layout. Each screen
// builds its own AdminHeader, so native stack headers stay hidden here.
export default function AdminNavigator() {
  return (
<<<<<<< HEAD
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
      <Stack.Screen name="AdminContent" component={AdminContentScreen} />
    </Stack.Navigator>
=======
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tab.Screen
        name="AdminHome"
        component={AdminDashboardScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="AdminUsers"
        component={AdminUsersScreen}
        options={{
          title: 'Users',
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="AdminDiseases"
        component={AdminDiseasesNavigator}
        options={{
          title: 'Diseases',
          tabBarIcon: ({ color, size }) => <Ionicons name="leaf-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="AdminData"
        component={AdminDataScreen}
        options={{
          title: 'Data',
          tabBarIcon: ({ color, size }) => <Ionicons name="server-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="AdminMonitor"
        component={AdminMonitorScreen}
        options={{
          title: 'Monitor',
          tabBarIcon: ({ color, size }) => <Ionicons name="pulse-outline" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
>>>>>>> 87299738aa3cf1e49ea8f59fcc23a4a0ab2db92a
  );
}