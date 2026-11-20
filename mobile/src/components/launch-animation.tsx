import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Image, StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { markLaunchFinished, useAppReady } from '@/lib/launch';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Must match `backgroundColor` of the expo-splash-screen plugin in app.json. */
const SPLASH_BACKGROUND = '#1C1245';
const MARK = require('@/assets/images/splash-icon.png');
/** On-screen width of splash-icon.png in Android's native splash, measured on device, so the handoff doesn't jump. */
const MARK_WIDTH = 58;
const MARK_HEIGHT = (MARK_WIDTH * 616) / 488;

/** Centre line of the Ribbon S in the mark's coordinates (branding/spendtrak-mark.svg), top end to bottom end. */
const RIBBON_PATH =
  'M334 178 C306 140 222 140 198 184 C176 224 212 254 256 260 C300 266 336 296 312 336 C288 376 204 374 178 334';
const RIBBON_LENGTH = 539;
const TRAIL_LENGTH = 80;

const GROW = 1.45;
const LIFT = -38;
const GLOW_SIZE = 340;
/** How long the intro plays before the app may appear, even if it is ready sooner. */
const INTRO_MS = 1050;
const EXIT_MS = 420;
/** Leave anyway if the app never reports ready, so a startup error can't hide behind the animation. */
const FALLBACK_MS = 8000;

/**
 * Takes over from the native splash on the same frame (same background, same mark, same place), then:
 * the mark lifts and grows with a soft glow, a light runs along the ribbon, the wordmark rises,
 * and once the app is ready the whole layer zooms through and fades to reveal it.
 */
export function LaunchAnimation() {
  const appReady = useAppReady();
  const reduceMotion = useReducedMotion();
  const [introDone, setIntroDone] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [gone, setGone] = useState(false);
  const [laidOut, setLaidOut] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [startAnyway, setStartAnyway] = useState(false);
  const started = useRef(false);

  const rise = useSharedValue(0);
  const glow = useSharedValue(0);
  const trail = useSharedValue(0);
  const words = useSharedValue(0);
  const tagline = useSharedValue(0);
  const exit = useSharedValue(0);

  const start = useEffectEvent(() => {
    if (started.current) return;
    started.current = true;
    SplashScreen.hide();
    setTimeout(() => setIntroDone(true), reduceMotion ? 0 : INTRO_MS);
    if (reduceMotion) return;
    const out = Easing.out(Easing.cubic);
    rise.value = withDelay(120, withSpring(1, { damping: 15, stiffness: 140, mass: 1 }));
    glow.value = withDelay(120, withTiming(1, { duration: 700, easing: out }));
    trail.value = withDelay(300, withTiming(1, { duration: 760, easing: Easing.inOut(Easing.cubic) }));
    words.value = withDelay(460, withTiming(1, { duration: 440, easing: out }));
    tagline.value = withDelay(640, withTiming(1, { duration: 420, easing: out }));
  });

  // Swap out the native splash only once this layer is drawn with the mark in place.
  const canStart = (laidOut && imageLoaded) || startAnyway;
  useEffect(() => {
    if (canStart) start();
  }, [canStart]);

  useEffect(() => {
    // The native splash must not stay up if the image never reports loading.
    const startTimer = setTimeout(() => setStartAnyway(true), 1000);
    const giveUpTimer = setTimeout(() => setTimedOut(true), FALLBACK_MS);
    return () => {
      clearTimeout(startTimer);
      clearTimeout(giveUpTimer);
    };
  }, []);

  const leave = useEffectEvent(() => {
    const finish = () => {
      setGone(true);
      markLaunchFinished();
    };
    exit.value = withTiming(1, { duration: reduceMotion ? 220 : EXIT_MS, easing: Easing.inOut(Easing.quad) }, (done) => {
      if (done) scheduleOnRN(finish);
    });
  });

  const canLeave = (introDone && appReady) || timedOut;
  useEffect(() => {
    if (canLeave) leave();
  }, [canLeave]);

  const layerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(exit.value, [0, 0.2, 1], [1, 1, 0]),
  }));

  const liftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: rise.value * LIFT }],
  }));

  const markStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(rise.value, [0, 1], [1, GROW]) * (1 + (reduceMotion ? 0 : exit.value * 0.7)) }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * (1 - exit.value),
    transform: [{ scale: interpolate(glow.value, [0, 1], [0.45, 1]) }],
  }));

  const trailProps = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(trail.value, [0, 1], [TRAIL_LENGTH, -RIBBON_LENGTH]),
    strokeOpacity: interpolate(trail.value, [0, 0.12, 0.8, 1], [0, 0.6, 0.6, 0]),
  }));

  const wordsStyle = useAnimatedStyle(() => ({
    opacity: words.value * interpolate(exit.value, [0, 0.4], [1, 0], 'clamp'),
    transform: [{ translateY: interpolate(words.value, [0, 1], [16, 0]) }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: tagline.value,
    transform: [{ translateY: interpolate(tagline.value, [0, 1], [8, 0]) }],
  }));

  if (gone) return null;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.layer, layerStyle]}
      pointerEvents={canLeave ? 'none' : 'auto'}
      onLayout={() => setLaidOut(true)}>
      <StatusBar style="light" />
      <Animated.View style={liftStyle}>
        <Animated.View style={[styles.glow, glowStyle]}>
          <Svg width={GLOW_SIZE} height={GLOW_SIZE}>
            <Defs>
              <RadialGradient id="launchGlow" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor="#7C6CF5" stopOpacity={0.55} />
                <Stop offset="0.55" stopColor="#7C6CF5" stopOpacity={0.14} />
                <Stop offset="1" stopColor="#7C6CF5" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={GLOW_SIZE / 2} cy={GLOW_SIZE / 2} r={GLOW_SIZE / 2} fill="url(#launchGlow)" />
          </Svg>
        </Animated.View>
        <Animated.View style={markStyle}>
          <Image
            source={MARK}
            style={styles.mark}
            fadeDuration={0}
            onLoad={() => setImageLoaded(true)}
          />
          <Svg style={StyleSheet.absoluteFill} viewBox="136 104 244 308">
            <AnimatedPath
              d={RIBBON_PATH}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={20}
              strokeLinecap="round"
              strokeDasharray={[TRAIL_LENGTH, RIBBON_LENGTH + TRAIL_LENGTH]}
              animatedProps={trailProps}
            />
          </Svg>
        </Animated.View>
      </Animated.View>
      <Animated.View style={[styles.words, wordsStyle]} pointerEvents="none">
        <Text style={styles.name} maxFontSizeMultiplier={1.3}>
          SpendTrak
        </Text>
        <Animated.Text style={[styles.tagline, taglineStyle]} maxFontSizeMultiplier={1.3}>
          Know where your money goes.
        </Animated.Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: {
    backgroundColor: SPLASH_BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    elevation: 1000,
  },
  mark: {
    width: MARK_WIDTH,
    height: MARK_HEIGHT,
  },
  glow: {
    position: 'absolute',
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    left: (MARK_WIDTH - GLOW_SIZE) / 2,
    top: (MARK_HEIGHT - GLOW_SIZE) / 2,
  },
  words: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    marginTop: LIFT + (MARK_HEIGHT * GROW) / 2 + 26,
    alignItems: 'center',
  },
  name: {
    color: '#F4F2FF',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  tagline: {
    marginTop: 6,
    color: 'rgba(220, 216, 255, 0.66)',
    fontSize: 14,
    lineHeight: 20,
  },
});
