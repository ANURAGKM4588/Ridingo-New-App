/**
 * nativeGoogleAuth.js
 * 
 * Native iOS & Android Google Sign-In using @codetrix-studio/capacitor-google-auth
 * Triggers iOS ASWebAuthenticationSession:
 *   "Ridingo" Wants to Use "accounts.google.com" to Sign In
 *   [ Cancel ]  [ Continue ]
 * Followed by the official accounts.google.com Account Chooser sheet.
 */
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

export const GOOGLE_CONFIG = {
  iosClientId: '496710932146-dff905ju49pr9j04ph4ii6u5c9moktge.apps.googleusercontent.com',
  serverClientId: '496710932146-0dc47l9jkgb584na7uu8ajh6bjtg98vu.apps.googleusercontent.com'
};

let initialized = false;

export async function initGoogleAuth() {
  if (initialized) return;
  try {
    const isIos = typeof window !== 'undefined' && (
      window.Capacitor?.getPlatform?.() === 'ios' ||
      /iPad|iPhone|iPod/.test(navigator?.userAgent)
    );

    // On iOS, GoogleSignIn requires clientId to exactly match GIDClientID in Info.plist
    const activeClientId = isIos ? GOOGLE_CONFIG.iosClientId : GOOGLE_CONFIG.serverClientId;

    await GoogleAuth.initialize({
      clientId: activeClientId,
      serverClientId: GOOGLE_CONFIG.serverClientId,
      scopes: ['profile', 'email'],
      grantOfflineAccess: true
    });
    initialized = true;
    console.log('✅ GoogleAuth initialized successfully with clientId:', activeClientId);
  } catch (err) {
    console.warn('GoogleAuth.initialize notice:', err);
  }
}

// Automatically pre-initialize Google Auth on module import so client is loaded before button tap
if (typeof window !== 'undefined') {
  initGoogleAuth();
}

/**
 * Triggers the official stock Google Sign-In flow:
 * iOS native permission popup -> accounts.google.com -> User Profile
 */
export async function performNativeGoogleSignIn() {
  await initGoogleAuth();

  try {
    const user = await GoogleAuth.signIn();
    if (!user) {
      throw new Error('Google sign-in was cancelled or returned empty');
    }

    const fullName = user.name || `${user.givenName || ''} ${user.familyName || ''}`.trim() || 'Ridingo Member';
    const fName = user.givenName || fullName.split(' ')[0] || 'Member';
    const lName = user.familyName || fullName.split(' ').slice(1).join(' ') || '';

    return {
      success: true,
      email: user.email,
      name: fullName,
      firstName: fName,
      lastName: lName,
      avatar: user.imageUrl || null,
      id: user.id || `goog_${Date.now()}`,
      idToken: user.authentication?.idToken,
      accessToken: user.authentication?.accessToken
    };
  } catch (err) {
    console.error('Google Sign-In error:', err);
    throw err;
  }
}

/**
 * Sign out native Google session
 */
export async function signOutNativeGoogle() {
  try {
    await GoogleAuth.signOut();
    return true;
  } catch (err) {
    console.warn('GoogleAuth.signOut error:', err);
    return false;
  }
}

