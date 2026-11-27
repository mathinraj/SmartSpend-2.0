import { useSyncExternalStore } from 'react';

/**
 * Launch state shared by the launch animation and the screens it covers: the animation waits for
 * `appReady` before leaving, and the lock screen holds its fingerprint prompt while `playing`.
 * The animation plays at cold start and again each time the app comes back from the background.
 */
let appReady = false;
let playing = true;
let introStarted = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

/** Mount the app anyway if the intro never starts (for example, the process started in the background). */
const INTRO_START_FALLBACK_MS = 1500;
setTimeout(() => markIntroStarted(), INTRO_START_FALLBACK_MS);

/**
 * The intro is on screen and the native splash is gone. The app tree waits for this so rendering it
 * doesn't hold the plain splash on screen at cold start; it then renders behind the animation.
 */
export function markIntroStarted() {
  if (introStarted) return;
  introStarted = true;
  emit();
}

export function useIntroStarted(): boolean {
  return useSyncExternalStore(subscribe, () => introStarted);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The first real screen has rendered, so the launch animation may leave. */
export function markAppReady() {
  if (appReady) return;
  appReady = true;
  emit();
}

export function setLaunchPlaying(value: boolean) {
  if (playing === value) return;
  playing = value;
  emit();
}

export function useAppReady(): boolean {
  return useSyncExternalStore(subscribe, () => appReady);
}

export function useLaunchPlaying(): boolean {
  return useSyncExternalStore(subscribe, () => playing);
}
