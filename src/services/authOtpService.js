/**
 * authOtpService.js
 * 
 * Official Production OTP Authentication Service:
 * 1. Email OTP via Official Supabase Auth (OTP Verification)
 * 2. Mobile Phone OTP via Official Firebase Phone Auth (SMS OTP)
 * 
 * Zero dummy codes, zero fake test banners - 100% authentic verification.
 */
import { auth as firebaseAuth } from '../lib/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { supabase } from '../lib/supabase';

// In-memory holder for Firebase phone confirmation result
let activeConfirmationResult = null;
let activeRecaptchaVerifier = null;

/**
 * Normalizes Indian mobile number to E.164 (+91XXXXXXXXXX)
 */
export function formatIndianPhone(rawPhone) {
  const digits = String(rawPhone || '').replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  if (digits.startsWith('0') && digits.length === 11) {
    return `+91${digits.slice(1)}`;
  }
  return digits.startsWith('+') ? digits : `+91${digits}`;
}

/**
 * Initialize or get invisible reCAPTCHA for Firebase Phone Auth
 */
export function setupRecaptcha(containerId = 'recaptcha-container') {
  if (typeof window === 'undefined') return null;

  try {
    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      container.style.position = 'fixed';
      container.style.bottom = '0';
      container.style.right = '0';
      container.style.zIndex = '999999';
      document.body.appendChild(container);
    }

    if (activeRecaptchaVerifier) {
      try {
        activeRecaptchaVerifier.clear();
      } catch (e) {}
      activeRecaptchaVerifier = null;
    }

    activeRecaptchaVerifier = new RecaptchaVerifier(firebaseAuth, containerId, {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved
      },
      'expired-callback': () => {
        console.warn('reCAPTCHA expired');
      }
    });

    return activeRecaptchaVerifier;
  } catch (err) {
    console.warn('Firebase reCAPTCHA setup warning:', err);
    return null;
  }
}

/**
 * Send 6-digit OTP code to Mobile Phone (via Firebase) or Email (via Supabase)
 * @param {Object} params
 * @param {'email'|'phone'} params.method
 * @param {string} params.identifier - email address or 10-digit phone
 * @param {string} [params.recaptchaContainerId]
 */
export async function sendOtp({ method, identifier, recaptchaContainerId = 'recaptcha-container' }) {
  if (!identifier) {
    throw new Error(`Please provide a valid ${method === 'email' ? 'email address' : 'mobile number'}.`);
  }

  const cleanId = method === 'email' ? identifier.trim().toLowerCase() : formatIndianPhone(identifier);

  if (method === 'phone') {
    // 1. Send SMS OTP via Official Firebase Phone Auth
    const appVerifier = setupRecaptcha(recaptchaContainerId);
    if (!appVerifier || !firebaseAuth) {
      throw new Error('SMS service is temporarily unavailable. Please verify with Email or Google.');
    }

    try {
      const confirmationResult = await signInWithPhoneNumber(firebaseAuth, cleanId, appVerifier);
      activeConfirmationResult = confirmationResult;

      return {
        success: true,
        method: 'phone',
        identifier: cleanId,
        provider: 'firebase',
        message: `Official SMS code sent to ${cleanId}`
      };
    } catch (fbErr) {
      console.error('Firebase Phone Auth error:', fbErr);
      if (fbErr.code === 'auth/invalid-phone-number') {
        throw new Error('The phone number is invalid. Please enter a valid 10-digit mobile number.');
      } else if (fbErr.code === 'auth/too-many-requests') {
        throw new Error('Too many attempts. Please wait a few minutes before requesting a new code.');
      } else if (fbErr.code === 'auth/quota-exceeded') {
        throw new Error('SMS quota exceeded for today. Please sign in using Email or Google.');
      }
      throw new Error(fbErr.message || 'Failed to send SMS verification code. Please try again.');
    }

  } else {
    // 2. Send Official Email OTP via Supabase Auth
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email: cleanId,
        options: {
          shouldCreateUser: true
        }
      });

      if (error) {
        console.error('Supabase signInWithOtp error:', error);
        if (error.message?.includes('confirmation email') || error.status === 500) {
          throw new Error('Failed to deliver verification email. Please verify your Supabase SMTP settings in Project Settings > Authentication > SMTP.');
        } else if (error.status === 429) {
          throw new Error('Too many email requests. Please wait a moment or sign in with Google.');
        }
        throw new Error(error.message || 'Unable to send verification email. Please try again.');
      }

      return {
        success: true,
        method: 'email',
        identifier: cleanId,
        provider: 'supabase',
        message: `Official 6-digit code sent to ${cleanId}`
      };
    } catch (err) {
      console.error('Email OTP send error:', err);
      throw err;
    }
  }
}

/**
 * Verify 6-digit OTP code entered by user
 * @param {Object} params
 * @param {'email'|'phone'} params.method
 * @param {string} params.identifier - email address or phone number
 * @param {string} params.token - 6-digit verification code
 */
export async function verifyOtp({ method, identifier, token }) {
  const cleanId = method === 'email' ? identifier.trim().toLowerCase() : formatIndianPhone(identifier);
  const cleanToken = String(token || '').trim();

  if (cleanToken.length !== 6) {
    throw new Error('Please enter all 6 digits of the verification code.');
  }

  // 1. If phone method with Firebase Phone Auth
  if (method === 'phone') {
    if (!activeConfirmationResult) {
      throw new Error('No pending SMS verification found. Please request a new code.');
    }

    try {
      const result = await activeConfirmationResult.confirm(cleanToken);
      activeConfirmationResult = null;
      return {
        success: true,
        user: {
          id: result.user.uid,
          phone: result.user.phoneNumber || cleanId,
          email: result.user.email || null,
          confirmed_at: new Date().toISOString()
        },
        message: 'Phone verified successfully!'
      };
    } catch (fbVerifyErr) {
      console.error('Firebase OTP verify error:', fbVerifyErr);
      if (fbVerifyErr.code === 'auth/invalid-verification-code') {
        throw new Error('Invalid verification code. Please check your SMS and enter the correct code.');
      } else if (fbVerifyErr.code === 'auth/code-expired') {
        throw new Error('This verification code has expired. Please request a new code.');
      }
      throw new Error(fbVerifyErr.message || 'Invalid verification code. Please check and try again.');
    }
  }

  // 2. If email method with Official Supabase Auth
  if (method === 'email') {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanId,
        token: cleanToken,
        type: 'email'
      });

      if (error) {
        console.error('Supabase verifyOtp error:', error);
        throw new Error(error.message || 'Invalid or expired verification code.');
      }

      return {
        success: true,
        session: data.session,
        user: data.user,
        message: 'Email verified successfully!'
      };
    } catch (sbErr) {
      console.error('Email verify error:', sbErr);
      throw sbErr;
    }
  }

  throw new Error('Invalid verification request.');
}
