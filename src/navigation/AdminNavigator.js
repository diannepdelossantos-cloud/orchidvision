import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AdminDashboardScreen from '../screens/Admin/AdminDashboardScreen';
import AdminUsersScreen from '../screens/Admin/AdminUsersScreen';
import AdminDiseasesNavigator from './AdminDiseasesNavigator';
import AdminDataScreen from '../screens/Admin/Data/AdminDataScreen';
import AdminMonitorScreen from '../screens/Admin/AdminMonitorScreen';

// Content (scan record moderation) is intentionally not a tab: the
// storyboard specifies five, and six crowds the bar past readability. The
// screen itself still exists at screens/Admin/AdminContentScreen.js and is
// reachable by uncommenting the Tab.Screen block at the bottom of this file.
// import AdminContentScreen from '../screens/Admin/AdminContentScreen';

const Tab = createBottomTabNavigator();

// Bottom tab bar for the Admin Control Center: the storyboard's five tabs
// (Home, Users, Diseases, Data, Monitor). Each screen builds its own
// AdminHeader, so tab headers stay hidden here.
export default function AdminNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        // Five tabs is tight on narrow phones — shrink the label and let it
        // stay on one line rather than wrapping or truncating mid-word.
        tabBarLabelStyle: { fontSize: 10 },
        tabBarAllowFontScaling: false,
      }}
    >
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
        name="AdminDiseases"
        component={AdminDiseasesNavigator}
        options={{
          title: 'Diseases',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="leaf-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AdminData"
        component={AdminDataScreen}
        options={{
          title: 'Data',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="server-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AdminMonitor"
        component={AdminMonitorScreen}
        options={{
          title: 'Monitor',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="pulse-outline" size={size} color={color} />
          ),
        }}
      />

      {/*
      <Tab.Screen
        name="AdminContent"
        component={AdminContentScreen}
        options={{
          title: 'Content',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="images-outline" size={size} color={color} />
          ),
        }}
      />
      */}
    </Tab.Navigator>
  );
}