import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import SplashScreen from '../screens/Splash/SplashScreen';
import OnboardingScreen from '../screens/Onboarding/OnboardingScreen';
import PermissionsScreen from '../screens/Permissions/PermissionsScreen';
import SignInScreen from '../screens/Auth/SignIn/SignInScreen';
import RegisterScreen from '../screens/Auth/Register/RegisterScreen';
import ForgotPasswordScreen from '../screens/Auth/ForgotPassword/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/Auth/ResetPassword/ResetPasswordScreen';
import PasswordUpdatedScreen from '../screens/Auth/ResetPassword/PasswordUpdatedScreen';
import MainTabNavigator from './MainTabNavigator';
import AdminNavigator from './AdminNavigator';
import TwoFactorScreen from '../screens/Auth/TwoFactor/TwoFactorScreen';
import { useAuth } from '../context/AuthContext';

const Stack = createNativeStackNavigator();

// Lets a password-reset email link (orchidvision://reset-password?oobCode=...)
// open directly on the Reset Password screen instead of a Firebase-hosted page.
const linking = {
  prefixes: [Linking.createURL('/'), 'orchidvision://'],
  config: {
    screens: {
      ResetPassword: 'reset-password',
    },
  },
};

export default function AppNavigator() {
  const { user, isAdmin, needsTwoFactor } = useAuth();

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* Always the first screen shown, on every launch, while Splash
            itself waits for Firebase to resolve the persisted session. */}
        <Stack.Screen name="Splash" component={SplashScreen} />
        {user ? (
          needsTwoFactor ? (
            <Stack.Screen name="TwoFactor" component={TwoFactorScreen} />
          ) : isAdmin ? (
            <Stack.Screen name="Admin" component={AdminNavigator} />
          ) : (
            <Stack.Screen name="Main" component={MainTabNavigator} />
          )
        ) : (
          <>
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Permissions" component={PermissionsScreen} />
            <Stack.Screen name="SignIn" component={SignInScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
            <Stack.Screen name="PasswordUpdated" component={PasswordUpdatedScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}