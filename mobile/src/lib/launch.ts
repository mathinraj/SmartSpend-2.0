import { useSyncExternalStore } from 'react';

/**
 * Launch state shared by the launch animation and the screens it covers: the animation waits for
 * `appReady` before leaving, and the lock screen holds its fingerprint prompt while `playing`.
 * The animation plays at cold start and again each time the app comes back from the background.
 */
let appReady = false;
let playing = true;
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
