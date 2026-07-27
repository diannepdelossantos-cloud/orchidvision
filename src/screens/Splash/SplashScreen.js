import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../utils/theme';
import { getOnboardingComplete } from '../../utils/onboardingStorage';

const LOGO = require('../../assets/orchidvision-logo-mark.png');
// Native aspect ratio of the cropped logo mark (270x169), used so the
// image scales without distortion at any target width.
const LOGO_ASPECT_RATIO = 270 / 169;

// Total time the splash screen stays on screen before auto-navigating.
const SPLASH_DURATION_MS = 2000;
const FADE_DURATION_MS = 600;

export default function SplashScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: FADE_DURATION_MS,
      useNativeDriver: true,
    }).start();

    let isActive = true;

    const timer = setTimeout(async () => {
      const onboardingComplete = await getOnboardingComplete();
      if (!isActive) return;
      // NOTE: replace() so Splash is removed from the navigation stack
      // and the back button can never return to it.
      navigation.replace(onboardingComplete ? 'SignIn' : 'Onboarding');
    }, SPLASH_DURATION_MS);

    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [fadeAnim, navigation]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        <Text style={styles.tagline}>
          An Intelligent Mobile-Based Orchid Health Detection and Care
          Recommendation Application
        </Text>
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
});
