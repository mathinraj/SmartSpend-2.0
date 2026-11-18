import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';

import type { DriveAccount } from '@/db/sync';
import { withLockSuppressed } from '@/lib/lock';

/** Only the hidden app folder in the user's Drive: SpendTrak can't see any other file. */
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';

/** The saved Google sign-in is gone or was revoked; the user has to connect again. */
export class GoogleSignInRequiredError extends Error {}

let configured = false;
function configure() {
  if (configured) return;
  GoogleSignin.configure({ scopes: [DRIVE_SCOPE] });
  configured = true;
}

function friendlyError(error: unknown): Error {
  if (isErrorWithCode(error)) {
    if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return new Error('Google Play services is missing or out of date on this phone.');
    }
    if (error.code === statusCodes.IN_PROGRESS) return new Error('Google sign-in is already open.');
    // Code 10 (DEVELOPER_ERROR): no Android OAuth client matches this app's package name and signing key.
    if (String(error.code) === '10' || /DEVELOPER_ERROR/.test(error.message)) {
      return new Error("Google sign-in isn't set up for this version of the app.");
    }
  }
  return error instanceof Error ? error : new Error(String(error));
}

/** Opens Google sign-in with Drive access. Returns null if the user backs out. */
export async function signInWithGoogle(): Promise<DriveAccount | null> {
  configure();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    let response = await withLockSuppressed(() => GoogleSignin.signIn());
    if (response.type !== 'success') return null;
    if (!response.data.scopes.includes(DRIVE_SCOPE)) {
      const granted = await withLockSuppressed(() => GoogleSignin.addScopes({ scopes: [DRIVE_SCOPE] }));
      if (!granted || granted.type !== 'success' || !granted.data.scopes.includes(DRIVE_SCOPE)) {
        throw new Error('SpendTrak needs permission to use its Google Drive folder to sync.');
      }
      response = granted;
    }
    const { email, name, photo } = response.data.user;
    return { email, name, photo };
  } catch (error) {
    throw friendlyError(error);
  }
}

/** A current access token for Drive, renewing the saved sign-in silently when needed. */
export async function getAccessToken(): Promise<string> {
  configure();
  if (!GoogleSignin.getCurrentUser()) {
    const silent = await GoogleSignin.signInSilently();
    if (silent.type !== 'success') throw new GoogleSignInRequiredError('Sign in to Google again to keep syncing.');
  }
  return (await GoogleSignin.getTokens()).accessToken;
}

/** Drops a token Drive rejected and gets a fresh one. */
export async function renewAccessToken(rejected: string): Promise<string> {
  configure();
  await GoogleSignin.clearCachedAccessToken(rejected);
  return getAccessToken();
}

/** Signs out and withdraws SpendTrak's Drive access. Best effort: it also runs when offline. */
export async function signOutOfGoogle() {
  configure();
  await GoogleSignin.revokeAccess().catch(() => undefined);
  await GoogleSignin.signOut().catch(() => undefined);
}
