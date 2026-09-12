import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AdminDashboardScreen from '../screens/Admin/AdminDashboardScreen';
import AdminUsersScreen from '../screens/Admin/AdminUsersScreen';
import AdminContentScreen from '../screens/Admin/AdminContentScreen';

const Tab = createBottomTabNavigator();

// Bottom tab bar for the Admin Control Center. The storyboard calls for
// five tabs (Home, Users, Diseases, Data, Monitor); Data and Monitor are
// not built yet. Each screen builds its own AdminHeader, so tab headers
// stay hidden here.
export default function AdminNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AdminUsers"
        component={AdminUsersScreen}
        options={{
          title: 'Users',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AdminContent"
        component={AdminContentScreen}
        options={{
          title: 'Diseases',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="leaf-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}