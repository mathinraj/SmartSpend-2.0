import { useSyncExternalStore } from 'react';

/**
 * Cold-start state shared by the launch animation and the screens it covers: the animation waits for
 * `appReady`, and the lock screen waits for `finished` before showing the fingerprint prompt.
 */
let appReady = false;
let finished = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
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

/** The launch animation is gone and the app is fully visible. */
export function markLaunchFinished() {
  if (finished) return;
  finished = true;
  emit();
}

export function useAppReady(): boolean {
  return useSyncExternalStore(subscribe, () => appReady);
}

export function useLaunchFinished(): boolean {
  return useSyncExternalStore(subscribe, () => finished);
}
