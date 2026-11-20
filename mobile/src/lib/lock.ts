import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const PIN_KEY = 'spendtrak.pin';

interface StoredPin {
  salt: string;
  hash: string;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

/**
 * Saves the lock PIN or password. Only a salted hash is stored, in the platform keystore rather than the
 * app database.
 */
export async function savePin(pin: string) {
  const salt = toHex(Crypto.getRandomBytes(16));
  const stored: StoredPin = { salt, hash: await hashPin(pin, salt) };
  await SecureStore.setItemAsync(PIN_KEY, JSON.stringify(stored));
}

export async function verifyPin(pin: string): Promise<boolean> {
  const raw = await SecureStore.getItemAsync(PIN_KEY);
  if (!raw) return false;
  const stored = JSON.parse(raw) as StoredPin;
  return (await hashPin(pin, stored.salt)) === stored.hash;
}

export async function clearPin() {
  await SecureStore.deleteItemAsync(PIN_KEY);
}

export async function biometricsAvailable(): Promise<boolean> {
  return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
}

export async function authenticateWithBiometrics(cancelLabel = 'Use PIN'): Promise<boolean> {
  const result = await withLockSuppressed(() =>
    LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock SpendTrak',
      cancelLabel,
      disableDeviceFallback: true,
    })
  );
  return result.success;
}

let suppressCount = 0;

/**
 * Runs a task that opens system UI (share sheet, file picker, biometric prompt, permission dialog). Android
 * briefly sends the app to the background for these, which must not count as leaving the app (for the app
 * lock or the launch animation).
 */
export async function withLockSuppressed<T>(task: () => Promise<T>): Promise<T> {
  suppressCount += 1;
  try {
    return await task();
  } finally {
    // The "active" event can arrive just after the task settles.
    setTimeout(() => {
      suppressCount -= 1;
    }, 1500);
  }
}

export function isLockSuppressed(): boolean {
  return suppressCount > 0;
}
