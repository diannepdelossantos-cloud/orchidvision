import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, StyleSheet, Text, View } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../utils/theme';
import { getOnboardingComplete } from '../../utils/onboardingStorage';
import { useAuth } from '../../context/AuthContext';

const LOGO = require('../../assets/orchidvision-logo-mark.png');
// Native aspect ratio of the cropped logo mark (270x169), used so the
// image scales without distortion at any target width.
const LOGO_ASPECT_RATIO = 270 / 169;

// Total time the splash screen stays on screen before auto-navigating.
const SPLASH_DURATION_MS = 2000;
const FADE_DURATION_MS = 600;

export default function SplashScreen({ navigation }) {
  const { user, initializing } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [minDurationElapsed, setMinDurationElapsed] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: FADE_DURATION_MS,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => setMinDurationElapsed(true), SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, [fadeAnim]);

  // Only navigate once both the minimum splash time has elapsed AND Firebase
  // has finished checking AsyncStorage for a persisted session, so a slow
  // session check extends the splash instead of flashing a bare spinner.
  useEffect(() => {
    if (!minDurationElapsed || initializing) return;

    let isActive = true;

    (async () => {
      // NOTE: replace() so Splash is removed from the navigation stack
      // and the back button can never return to it.
      if (user) {
        navigation.replace('Main');
        return;
      }
      const onboardingComplete = await getOnboardingComplete();
      if (!isActive) return;
      navigation.replace(onboardingComplete ? 'SignIn' : 'Onboarding');
    })();

    return () => {
      isActive = false;
    };
  }, [minDurationElapsed, initializing, user, navigation]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        <Text style={styles.tagline}>
          An Intelligent Mobile-Based Orchid Health Detection and Care
          Recommendation Application
        </Text>
        <ActivityIndicator
          style={styles.loadingIndicator}
          size="small"
          color={COLORS.secondary}
        />
      </Animated.View>
    </View>
  );
}

const LOGO_WIDTH = 240;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryDark,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  logo: {
    width: LOGO_WIDTH,
    height: LOGO_WIDTH / LOGO_ASPECT_RATIO,
    marginBottom: SPACING.lg,
  },
  tagline: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textInverseMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  loadingIndicator: {
    marginTop: SPACING.lg,
  },
});
