import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import SettingsScreen from '../screens/Settings/SettingsScreen';
import ScanScreen from '../screens/Main/ScanScreen';
import { useTheme } from '../context/ThemeContext';
import { SPACING, TYPOGRAPHY } from '../utils/theme';

const Tab = createBottomTabNavigator();

// My Orchids and OrchAi belong to other teammates' modules — these
// are placeholders so the tab bar matches the storyboard now, the same way
// Module 1's AppNavigator stubbed out Permissions/Sign In before they existed.
function ComingSoonScreen({ label, colors }) {
  return (
    <View style={[styles.placeholder, { backgroundColor: colors.background }]}>
      <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

export default function MainTabNavigator() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} /> }}
      />
      <Tab.Screen
        name="MyOrchids"
        options={{
          title: 'My Orchids',
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
        }}
      >
        {() => <ComingSoonScreen label="My Orchids — coming soon" colors={colors} />}
      </Tab.Screen>
      <Tab.Screen
        name="Scan"
        component={ScanScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="camera" size={size + 4} color={color} />,
        }}
      />
      <Tab.Screen
        name="OrchAi"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-ellipses-outline" size={size} color={color} />
          ),
        }}
      >
        {() => <ComingSoonScreen label="OrchAi — coming soon" colors={colors} />}
      </Tab.Screen>
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} /> }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  placeholderText: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
  },
});