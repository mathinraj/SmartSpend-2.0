import { useSyncExternalStore } from 'react';

import type { IconName } from '@/components/ui/icon';

/** Same shape as React Native's `AlertButton`, so `showDialog` is a drop-in for `Alert.alert`. */
export interface DialogButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

export interface DialogOptions {
  /** Shown above the title; destructive dialogs get a warning icon by default. */
  icon?: IconName;
}

export interface DialogRequest {
  id: number;
  title: string;
  message?: string;
  buttons: DialogButton[];
  icon?: IconName;
}

let current: DialogRequest | null = null;
let nextId = 1;
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

/** Shows the app's themed dialog (rendered by `DialogHost`). Arguments match `Alert.alert`. */
export function showDialog(title: string, message?: string, buttons?: DialogButton[], options?: DialogOptions) {
  current = {
    id: nextId++,
    title,
    message,
    buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }],
    icon: options?.icon,
  };
  emit();
}

/** Closes the dialog, then runs the chosen button's handler (which may open another dialog). */
export function pressDialogButton(button: DialogButton | undefined) {
  current = null;
  emit();
  button?.onPress?.();
}

export function useDialog(): DialogRequest | null {
  return useSyncExternalStore(subscribe, () => current);
}
