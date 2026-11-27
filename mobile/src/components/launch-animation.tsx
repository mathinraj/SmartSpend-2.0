import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from 'react';
import { AppState, Image, StyleSheet, Text } from 'react-native';
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
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { setLaunchPlaying, useAppReady } from '@/lib/launch';
import { isLockSuppressed } from '@/lib/lock';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Must match `backgroundColor` of the expo-splash-screen plugin in app.json (whose image is blank). */
const SPLASH_BACKGROUND = '#1C1245';
/** The finished mark, including the shadow where the ribbons cross; exported from branding/spendtrak-mark.svg. */
const MARK = require('@/assets/images/splash-icon.png');
/** The mark's coordinate box (branding/spendtrak-mark.svg), shared by the drawn ribbons and MARK. */
const MARK_VIEWBOX = '136 104 244 308';
const MARK_WIDTH = 84;
const MARK_HEIGHT = (MARK_WIDTH * 308) / 244;

/** The two ribbons of the S, drawn in order: lilac from its top end to the middle, then mint on to the bottom. */
const LILAC_PATH = 'M334 178 C306 140 222 140 198 184 C176 224 212 254 256 260';
const LILAC_LENGTH = 271;
const MINT_PATH = 'M256 260 C300 266 336 296 312 336 C288 376 204 374 178 334';
const MINT_LENGTH = 269;
const RIBBON_PATH = `${LILAC_PATH} ${MINT_PATH.slice(MINT_PATH.indexOf('C'))}`;
const RIBBON_LENGTH = LILAC_LENGTH + MINT_LENGTH;
const TRAIL_LENGTH = 80;

/** The mark sits above centre to leave room for the wordmark. */
const LIFT = -38;
const GLOW_SIZE = 340;
/** How long the intro plays before the app may appear, even if it is ready sooner. */
const INTRO_MS = 1250;
const EXIT_MS = 400;
/** Leave anyway if the app never reports ready, so a startup error can't hide behind the animation. */
const FALLBACK_MS = 8000;

function subscribeAppState(onChange: () => void) {
  const subscription = AppState.addEventListener('change', onChange);
  return () => subscription.remove();
}

let splashHidden = false;
function hideNativeSplash() {
  if (splashHidden) return;
  splashHidden = true;
  // Android fades the native splash out over 400ms by default, which would veil the first part of the
  // intro. It's the same colour as this layer, so removing it instantly is invisible.
  SplashScreen.setOptions({ duration: 0 });
  SplashScreen.hide();
}

/** How long the app must be away before returning to it replays the animation. */
const REPLAY_AFTER_MS = 30_000;

/**
 * Plays the animated logo at cold start, and again when the app comes back after at least 30 seconds
 * away (not after the file picker, share sheet, biometric prompt and similar, see `withLockSuppressed`).
 */
export function LaunchAnimation() {
  const [play, setPlay] = useState<number | null>(0);
  const leftAt = useRef<number | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        leftAt.current = isLockSuppressed() ? null : Date.now();
        return;
      }
      if (state !== 'active') return;
      const away = leftAt.current === null ? 0 : Date.now() - leftAt.current;
      leftAt.current = null;
      if (away < REPLAY_AFTER_MS) return;
      setLaunchPlaying(true);
      setPlay((current) => (current ?? 0) + 1);
    });
    return () => subscription.remove();
  }, []);

  const finish = useCallback(() => {
    setPlay(null);
    setLaunchPlaying(false);
  }, []);

  if (play === null) return null;
  return <LaunchIntro key={play} onDone={finish} />;
}

/**
 * One run of the intro, starting from the bare splash background: the lilac ribbon draws itself, the mint
 * ribbon flows on from it, a glow blooms, a light runs along the S and the wordmark rises. Once the app
 * is ready the layer zooms through and fades to reveal it.
 */
function LaunchIntro({ onDone }: { onDone: () => void }) {
  const appReady = useAppReady();
  const reduceMotion = useReducedMotion();
  const [laidOut, setLaidOut] = useState(false);
  // Read through useSyncExternalStore: an "active" event that lands between render and a useEffect
  // subscription would otherwise be missed, leaving the layer waiting (blank) forever.
  const foreground = useSyncExternalStore(subscribeAppState, () => AppState.currentState !== 'background');
  const [startAnyway, setStartAnyway] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const started = useRef(false);

  const pop = useSharedValue(0);
  const glow = useSharedValue(0);
  const lilac = useSharedValue(0);
  const mint = useSharedValue(0);
  const finished = useSharedValue(0);
  const trail = useSharedValue(0);
  const words = useSharedValue(0);
  const tagline = useSharedValue(0);
  const exit = useSharedValue(0);

  useEffect(() => {
    // The native splash must not stay up if layout never reports.
    const startTimer = setTimeout(() => setStartAnyway(true), 1000);
    return () => clearTimeout(startTimer);
  }, []);

  const start = useEffectEvent(() => {
    if (started.current) return;
    started.current = true;
    hideNativeSplash();
    setTimeout(() => setIntroDone(true), reduceMotion ? 0 : INTRO_MS);
    setTimeout(() => setTimedOut(true), FALLBACK_MS);
    if (reduceMotion) {
      pop.value = 1;
      glow.value = 1;
      finished.value = 1;
      words.value = 1;
      tagline.value = 1;
      return;
    }
    const out = Easing.out(Easing.cubic);
    pop.value = withSpring(1, { damping: 13, stiffness: 120, mass: 1 });
    glow.value = withTiming(1, { duration: 800, easing: out });
    lilac.value = withDelay(60, withTiming(1, { duration: 340, easing: Easing.in(Easing.quad) }));
    mint.value = withDelay(400, withTiming(1, { duration: 360, easing: Easing.out(Easing.quad) }));
    finished.value = withDelay(720, withTiming(1, { duration: 220 }));
    trail.value = withDelay(820, withTiming(1, { duration: 520, easing: Easing.inOut(Easing.cubic) }));
    words.value = withDelay(620, withTiming(1, { duration: 420, easing: out }));
    tagline.value = withDelay(800, withTiming(1, { duration: 400, easing: out }));
  });

  // Start once this layer is on screen and the app is in front (a replay is set up while it's away).
  const canStart = (laidOut || startAnyway) && foreground;
  useEffect(() => {
    if (canStart) start();
  }, [canStart]);

  const leave = useEffectEvent(() => {
    exit.value = withTiming(1, { duration: reduceMotion ? 220 : EXIT_MS, easing: Easing.inOut(Easing.quad) }, (done) => {
      if (done) scheduleOnRN(onDone);
    });
  });

  const canLeave = (introDone && appReady) || timedOut;
  useEffect(() => {
    if (canLeave) leave();
  }, [canLeave]);

  const layerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(exit.value, [0, 0.2, 1], [1, 1, 0]),
  }));

  const markStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pop.value, [0, 1], [0.86, 1]) * (1 + (reduceMotion ? 0 : exit.value * 0.7)) }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * (1 - exit.value),
    transform: [{ scale: interpolate(glow.value, [0, 1], [0.45, 1]) }],
  }));

  // Round caps would show a dot at the start of an undrawn ribbon, so each fades in as it starts.
  const lilacProps = useAnimatedProps(() => ({
    strokeDashoffset: (1 - lilac.value) * LILAC_LENGTH,
    opacity: interpolate(lilac.value, [0, 0.06], [0, 1], 'clamp'),
  }));

  const mintProps = useAnimatedProps(() => ({
    strokeDashoffset: (1 - mint.value) * MINT_LENGTH,
    opacity: interpolate(mint.value, [0, 0.06], [0, 1], 'clamp'),
  }));

  const finishedStyle = useAnimatedStyle(() => ({ opacity: finished.value }));

  const trailProps = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(trail.value, [0, 1], [TRAIL_LENGTH, -RIBBON_LENGTH]),
    strokeOpacity: interpolate(trail.value, [0, 0.12, 0.8, 1], [0, 0.55, 0.55, 0]),
  }));

  const wordsStyle = useAnimatedStyle(() => ({
    opacity: words.value * interpolate(exit.value, [0, 0.4], [1, 0], 'clamp'),
    transform: [{ translateY: interpolate(words.value, [0, 1], [16, 0]) }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: tagline.value,
    transform: [{ translateY: interpolate(tagline.value, [0, 1], [8, 0]) }],
  }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.layer, layerStyle]}
      pointerEvents={canLeave ? 'none' : 'auto'}
      onLayout={() => setLaidOut(true)}>
      <StatusBar style="light" />
      <Animated.View style={styles.lift}>
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
        <Animated.View style={[styles.mark, markStyle]}>
          <Svg style={StyleSheet.absoluteFill} viewBox={MARK_VIEWBOX}>
            <Defs>
              <LinearGradient id="launchLilac" gradientUnits="userSpaceOnUse" x1="334" y1="150" x2="226" y2="262">
                <Stop offset="0" stopColor="#DCD8FF" />
                <Stop offset="1" stopColor="#8F81FF" />
              </LinearGradient>
              <LinearGradient id="launchMint" gradientUnits="userSpaceOnUse" x1="300" y1="262" x2="190" y2="364">
                <Stop offset="0" stopColor="#52F5CB" />
                <Stop offset="1" stopColor="#0FB38B" />
              </LinearGradient>
            </Defs>
            <AnimatedPath
              d={LILAC_PATH}
              fill="none"
              stroke="url(#launchLilac)"
              strokeWidth={60}
              strokeLinecap="round"
              strokeDasharray={[LILAC_LENGTH, LILAC_LENGTH]}
              animatedProps={lilacProps}
            />
            <AnimatedPath
              d={MINT_PATH}
              fill="none"
              stroke="url(#launchMint)"
              strokeWidth={60}
              strokeLinecap="round"
              strokeDasharray={[MINT_LENGTH, MINT_LENGTH]}
              animatedProps={mintProps}
            />
          </Svg>
          <Animated.View style={[StyleSheet.absoluteFill, finishedStyle]}>
            <Image source={MARK} style={styles.markImage} fadeDuration={0} />
          </Animated.View>
          <Svg style={StyleSheet.absoluteFill} viewBox={MARK_VIEWBOX}>
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
  lift: {
    transform: [{ translateY: LIFT }],
  },
  mark: {
    width: MARK_WIDTH,
    height: MARK_HEIGHT,
  },
  markImage: {
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
    marginTop: LIFT + MARK_HEIGHT / 2 + 26,
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
