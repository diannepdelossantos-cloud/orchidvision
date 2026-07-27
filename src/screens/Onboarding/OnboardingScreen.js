import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import OnboardingSlide from './OnboardingSlide';
import { ONBOARDING_SLIDES } from './onboardingSlides';
import { setOnboardingComplete } from '../../utils/onboardingStorage';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../utils/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const LAST_INDEX = ONBOARDING_SLIDES.length - 1;

export default function OnboardingScreen({ navigation }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const isLastSlide = currentIndex === LAST_INDEX;

  // Marks onboarding as seen so relaunching the app goes straight to Sign In.
  const finishOnboarding = useCallback(async () => {
    await setOnboardingComplete();
    navigation.replace('Permissions');
  }, [navigation]);

  const handleNext = () => {
    if (isLastSlide) {
      finishOnboarding();
      return;
    }
    // scrollToOffset (pixel-based) instead of scrollToIndex: the latter
    // needs getItemLayout to be reliable and behaves inconsistently on
    // react-native-web. Updating currentIndex directly (rather than only
    // via onMomentumScrollEnd) keeps the dots/button label correct even if
    // the scroll-end event fires late or not at all.
    const nextIndex = currentIndex + 1;
    flatListRef.current?.scrollToOffset({ offset: nextIndex * SCREEN_WIDTH, animated: true });
    setCurrentIndex(nextIndex);
  };

  const handleSkip = () => {
    finishOnboarding();
  };

  const handleMomentumScrollEnd = (event) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {!isLastSlide ? (
          <TouchableOpacity onPress={handleSkip} hitSlop={styles.hitSlop}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={ONBOARDING_SLIDES}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => <OnboardingSlide slide={item} />}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
      />

      <View style={styles.pagination}>
        {ONBOARDING_SLIDES.map((slide, index) => (
          <View
            key={slide.key}
            style={[styles.dot, index === currentIndex && styles.dotActive]}
          />
        ))}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>
            {isLastSlide ? 'Get Started' : 'Next'}
          </Text>
          {!isLastSlide && (
            <Ionicons name="arrow-forward" size={18} color={COLORS.textInverse} />
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  hitSlop: { top: 10, bottom: 10, left: 10, right: 10 },
  skipText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  pagination: {
    flexDirection: 'row',
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.border,
    marginHorizontal: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: COLORS.primary,
  },
  footer: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xl,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.pill,
  },
  buttonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.textInverse,
  },
});
