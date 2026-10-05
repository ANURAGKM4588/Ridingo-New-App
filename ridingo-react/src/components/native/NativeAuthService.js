/**
 * NativeAuthService.js
 * 
 * Production-ready authentication service for React Native combining:
 * 1. Google Sign-In via '@react-native-google-signin/google-signin'
 * 2. Apple Authentication via '@invertase/react-native-apple-authentication'
 * 3. Optional Supabase OAuth Token Exchange
 */

import { Platform } from 'react-native';

// Optional Supabase client import if configured in project
let supabase = null;
try {
  const sbModule = require('../../lib/supabase');
  supabase = sbModule.supabase;
} catch (e) {
  // Supabase optional
}

// 1. Google Sign-In Module
let GoogleSignin = null;
let statusCodes = {};
try {
  const gModule = require('@react-native-google-signin/google-signin');
  GoogleSignin = gModule.GoogleSignin;
  statusCodes = gModule.statusCodes || {};
} catch (e) {
  console.warn('@react-native-google-signin/google-signin is not linked yet');
}

// 2. Apple Authentication Module
let appleAuth = null;
let AppleButton = null;
try {
  const aModule = require('@invertase/react-native-apple-authentication');
  appleAuth = aModule.appleAuth;
  AppleButton = aModule.AppleButton;
} catch (e) {
  console.warn('@invertase/react-native-apple-authentication is not linked yet');
}

/**
 * Configure Google Sign-In options
 * Call this in your App.js or root component mount
 */
export function configureGoogleSignIn({
  webClientId = 'YOUR_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com',
  iosClientId = 'YOUR_GOOGLE_IOS_CLIENT_ID.apps.googleusercontent.com',
  offlineAccess = true,
  scopes = ['profile', 'email']
} = {}) {
  if (GoogleSignin) {
    try {
      GoogleSignin.configure({
        webClientId,
        iosClientId: Platform.OS === 'ios' ? iosClientId : undefined,
        offlineAccess,
        scopes,
        forceCodeForRefreshToken: true
      });
      console.log('✅ Google Sign-In initialized successfully');
    } catch (err) {
      console.error('Google Sign-In configuration error:', err);
    }
  }
}

/**
 * Trigger Real Native Google Account Selection Dialog
 * Pops up the official Google Account Selector sheet on device
 */
export async function signInWithGoogle() {
  if (!GoogleSignin) {
    throw new Error('Google Sign-In library is not installed. Run: npm install @react-native-google-signin/google-signin');
  }

  try {
    // 1. Check Google Play Services availability on Android
    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }

    // 2. Sign out any lingering session to force fresh account selection dialog
    try {
      await GoogleSignin.signOut();
    } catch (_) {}

    // 3. Trigger native account selection modal
    const signInResult = await GoogleSignin.signIn();

    // Support both modern (v11+) and legacy result structures
    const userObj = signInResult.data ? signInResult.data.user : (signInResult.user || signInResult);
    const tokens = signInResult.data ? signInResult.data : await GoogleSignin.getTokens();
    const idToken = tokens.idToken || signInResult.idToken;

    const userPayload = {
      provider: 'google',
      id: userObj.id,
      email: userObj.email,
      name: userObj.name || `${userObj.givenName || ''} ${userObj.familyName || ''}`.trim(),
      givenName: userObj.givenName,
      familyName: userObj.familyName,
      photo: userObj.photo,
      idToken: idToken,
      serverAuthCode: signInResult.serverAuthCode
    };

    // 4. Optionally exchange with Supabase
    if (supabase && idToken) {
      try {
        const { data: sbData, error: sbError } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: idToken
        });
        if (!sbError && sbData?.session) {
          userPayload.supabaseSession = sbData.session;
          userPayload.supabaseUser = sbData.user;
        }
      } catch (sbErr) {
        console.warn('Supabase token exchange warning:', sbErr);
      }
    }

    return userPayload;
  } catch (error) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      const cancelErr = new Error('Google Sign-In cancelled by user');
      cancelErr.isCancelled = true;
      throw cancelErr;
    } else if (error.code === statusCodes.IN_PROGRESS) {
      throw new Error('Google Sign-In already in progress');
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error('Google Play Services not available or outdated on this device');
    }
    throw error;
  }
}

/**
 * Trigger Real Native Apple Authentication Sheet
 * Uses official Apple ID modal on iOS 13+ devices
 */
export async function signInWithApple() {
  if (Platform.OS !== 'ios') {
    throw new Error('Sign in with Apple is only supported on iOS devices.');
  }

  if (!appleAuth) {
    throw new Error('Apple Authentication library is not installed. Run: npm install @invertase/react-native-apple-authentication');
  }

  if (!appleAuth.isSupported) {
    throw new Error('Sign in with Apple is not supported on this version of iOS.');
  }

  try {
    // 1. Perform native Apple ID login request
    const appleAuthResponse = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME]
    });

    // 2. Query credential state to verify valid token
    const credentialState = await appleAuth.getCredentialStateForUser(appleAuthResponse.user);
    if (credentialState !== appleAuth.State.AUTHORIZED) {
      throw new Error('Apple Sign-In authorization failed or was revoked.');
    }

    const { identityToken, authorizationCode, fullName, email, user: appleUserId } = appleAuthResponse;

    let formattedName = 'Apple User';
    if (fullName) {
      const parts = [fullName.givenName, fullName.middleName, fullName.familyName].filter(Boolean);
      if (parts.length > 0) formattedName = parts.join(' ');
    }

    const userPayload = {
      provider: 'apple',
      id: appleUserId,
      email: email || null,
      name: formattedName,
      givenName: fullName?.givenName || null,
      familyName: fullName?.familyName || null,
      identityToken,
      authorizationCode
    };

    // 3. Optionally exchange with Supabase
    if (supabase && identityToken) {
      try {
        const { data: sbData, error: sbError } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: identityToken
        });
        if (!sbError && sbData?.session) {
          userPayload.supabaseSession = sbData.session;
          userPayload.supabaseUser = sbData.user;
        }
      } catch (sbErr) {
        console.warn('Supabase Apple token exchange warning:', sbErr);
      }
    }

    return userPayload;
  } catch (error) {
    if (error.code === appleAuth.Error.CANCELED) {
      const cancelErr = new Error('Apple Sign-In cancelled by user');
      cancelErr.isCancelled = true;
      throw cancelErr;
    }
    throw error;
  }
}

/**
 * Register Apple credential revocation listener
 * Apple requires apps to handle credential revocation
 */
export function setupAppleRevocationListener(onRevoked) {
  if (Platform.OS === 'ios' && appleAuth) {
    return appleAuth.onCredentialRevoked(async () => {
      console.warn('Apple credentials revoked for current user');
      if (typeof onRevoked === 'function') {
        onRevoked();
      }
    });
  }
  return () => {};
}

export { GoogleSignin, statusCodes, appleAuth, AppleButton };
