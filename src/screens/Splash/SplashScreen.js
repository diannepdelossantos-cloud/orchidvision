import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, StyleSheet, Text, View } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../utils/theme';
import { getOnboardingComplete } from '../../utils/onboardingStorage';
import { useAuth } from '../../context/AuthContext';
import PrimaryButton from '../../components/PrimaryButton';

const LOGO = require('../../assets/orchidvision-logo-mark.png');
// Native aspect ratio of the cropped logo mark (270x169), used so the
// image scales without distortion at any target width.
const LOGO_ASPECT_RATIO = 270 / 169;

// Minimum time the bare splash stays up for returning/signed-in users
// before auto-navigating.
const SPLASH_DURATION_MS = 2000;
const FADE_DURATION_MS = 600;
// Delay before the tagline + Get Started button appear for new users.
const TAGLINE_DELAY_MS = 2000;
const TAGLINE_FADE_DURATION_MS = 500;

export default function SplashScreen({ navigation }) {
  const { user, initializing, isAdmin, needsTwoFactor } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const taglineFadeAnim = useRef(new Animated.Value(0)).current;
  const [minDurationElapsed, setMinDurationElapsed] = useState(false);
  // Resolved destination once we know whether the user is signed in and
  // whether onboarding was already completed: 'Admin' | 'Main' | 'SignIn' | 'Onboarding'.
  const [destination, setDestination] = useState(null);
  const [showOnboardingContent, setShowOnboardingContent] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: FADE_DURATION_MS,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => setMinDurationElapsed(true), SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, [fadeAnim]);

  // Resolve where this session should end up as soon as Firebase finishes
  // checking AsyncStorage for a persisted session.
  useEffect(() => {
    if (initializing) return;

    let isActive = true;

    (async () => {
      if (user) {
        if (isActive) setDestination(needsTwoFactor ? 'TwoFactor' : isAdmin ? 'Admin' : 'Main');
        return;
      }
      const onboardingComplete = await getOnboardingComplete();
      if (!isActive) return;
      setDestination(onboardingComplete ? 'SignIn' : 'Onboarding');
    })();

    return () => {
      isActive = false;
    };
  }, [user, initializing, isAdmin, needsTwoFactor]);

  // Returning/signed-in users: auto-navigate once the minimum splash time
  // has elapsed. New users headed to Onboarding wait for the button instead.
  useEffect(() => {
    if (!minDurationElapsed || !destination || destination === 'Onboarding') return;
    // NOTE: replace() so Splash is removed from the navigation stack
    // and the back button can never return to it.
    navigation.replace(destination);
  }, [minDurationElapsed, destination, navigation]);

  // New users only: reveal the tagline + Get Started button after a delay.
  useEffect(() => {
    if (destination !== 'Onboarding') return;

    const timer = setTimeout(() => {
      setShowOnboardingContent(true);
      Animated.timing(taglineFadeAnim, {
        toValue: 1,
        duration: TAGLINE_FADE_DURATION_MS,
        useNativeDriver: true,
      }).start();
    }, TAGLINE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [destination, taglineFadeAnim]);

  const handleGetStarted = () => {
    navigation.replace('Onboarding');
  };

  const isOnboarding = destination === 'Onboarding';

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.centerContent, { opacity: fadeAnim }]}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        {isOnboarding ? (
          showOnboardingContent && (
            <Animated.Text style={[styles.tagline, { opacity: taglineFadeAnim }]}>
              Smart Orchid Health Detection & Care Recommendations
            </Animated.Text>
          )
        ) : (
          <ActivityIndicator
            style={styles.loadingIndicator}
            size="small"
            color={COLORS.secondary}
          />
        )}
      </Animated.View>

      {isOnboarding && showOnboardingContent && (
        <Animated.View style={[styles.bottomContent, { opacity: taglineFadeAnim }]}>
          <PrimaryButton title="Get Started" onPress={handleGetStarted} />
        </Animated.View>
      )}
    </View>
  );
}

const LOGO_WIDTH = 240;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  bottomContent: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl || SPACING.xl,
  },
});