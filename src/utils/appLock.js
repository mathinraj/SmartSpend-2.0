// App lock storage and fingerprint unlock. The lock is a privacy screen for this browser: the PIN or
// password (stored hashed) always works, and fingerprint is an optional faster way past it using the
// device's own sensor (Touch ID, Windows Hello, or a phone's fingerprint/face unlock) through WebAuthn.

export const LOCK_KEY = 'spendtraq_app_lock';
export const LOCK_TYPE_KEY = 'spendtraq_lock_type';
export const BIOMETRIC_KEY = 'spendtraq_lock_biometric';

export function hashValue(val) {
  let hash = 0;
  for (let i = 0; i < val.length; i++) {
    const char = val.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'pin_' + Math.abs(hash).toString(36);
}

function toBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function fromBase64(text) {
  return Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
}

function randomBytes(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

/** Whether this device has a built-in fingerprint/face sensor the browser can use. */
export async function isBiometricAvailable() {
  if (typeof window === 'undefined' || !window.PublicKeyCredential || !window.isSecureContext) return false;
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function hasBiometric() {
  return typeof window !== 'undefined' && !!localStorage.getItem(BIOMETRIC_KEY);
}

/** Asks for a fingerprint once to create this browser's unlock key. Throws if cancelled or unsupported. */
export async function registerBiometric(displayName) {
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: randomBytes(32),
      rp: { name: 'SpendTrak' },
      user: { id: randomBytes(16), name: 'spendtrak-app-lock', displayName: displayName || 'SpendTrak app lock' },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },
        { alg: -257, type: 'public-key' },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'discouraged',
      },
      timeout: 60000,
      attestation: 'none',
    },
  });
  localStorage.setItem(BIOMETRIC_KEY, toBase64(credential.rawId));
}

/** Resolves true once the fingerprint is verified; rejects if the prompt was cancelled or failed. */
export async function verifyBiometric() {
  const id = localStorage.getItem(BIOMETRIC_KEY);
  if (!id) return false;
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: randomBytes(32),
      allowCredentials: [{ id: fromBase64(id), type: 'public-key', transports: ['internal'] }],
      userVerification: 'required',
      timeout: 60000,
    },
  });
  return !!assertion;
}

export function removeBiometric() {
  localStorage.removeItem(BIOMETRIC_KEY);
}

export function clearAppLock() {
  localStorage.removeItem(LOCK_KEY);
  localStorage.removeItem(LOCK_TYPE_KEY);
  removeBiometric();
}
