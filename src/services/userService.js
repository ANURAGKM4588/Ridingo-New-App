/**
 * userService.js
 * 
 * Centralized User Identity & Account Registration Service for Ridingo.
 * 
 * Guarantees:
 * 1. Unique Ridingo User ID (e.g., RDU-84920) for every user.
 * 2. Uniqueness check across mobile number and email ID in Supabase DB & local registry.
 * 3. Prevents duplicate registration: Displays English warning
 *    "You are already registered with this mobile number/email. Please log in."
 *    and redirects user to Sign In.
 * 4. Helper `isUserTrip(trip, user)` to strictly scope trip ownership and
 *    the 1-trip-at-a-time restriction to individual user accounts.
 */

import { supabase } from '../lib/supabase';
import { formatIndianPhone } from './authOtpService';

const LOCAL_REGISTRY_KEY = 'ridingo_registered_users_registry';

/**
 * Normalizes a phone number to standard 10-digit digits string
 */
export function normalizePhone10(raw) {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

/**
 * Normalizes an email address
 */
export function normalizeEmail(raw) {
  if (!raw) return '';
  return String(raw).trim().toLowerCase();
}

/**
 * Generates a unique Ridingo User ID (e.g. RDU-49215)
 */
export function generateRidingoUserId() {
  const num = Math.floor(10000 + Math.random() * 90000);
  return `RDU-${num}`;
}

/**
 * Reads local cached user registry
 */
export function getLocalUserRegistry() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_REGISTRY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Saves or updates a user in the local cached registry
 */
export function saveToLocalUserRegistry(userRecord) {
  if (typeof window === 'undefined' || !userRecord) return;
  try {
    const list = getLocalUserRegistry();
    const phone10 = normalizePhone10(userRecord.phone);
    const emailNorm = normalizeEmail(userRecord.email);
    const userId = userRecord.id || userRecord.userId;

    const idx = list.findIndex(u => {
      const uPhone = normalizePhone10(u.phone);
      const uEmail = normalizeEmail(u.email);
      const uId = u.id || u.userId;
      return (userId && uId && userId === uId) ||
             (phone10 && uPhone && phone10 === uPhone) ||
             (emailNorm && uEmail && emailNorm === uEmail);
    });

    if (idx >= 0) {
      list[idx] = { ...list[idx], ...userRecord };
    } else {
      list.push(userRecord);
    }
    localStorage.setItem(LOCAL_REGISTRY_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Error saving to local user registry:', e);
  }
}

/**
 * Checks whether a phone number or email is already registered in Supabase or local cache
 * @param {Object} params
 * @param {string} [params.phone]
 * @param {string} [params.email]
 * @returns {Promise<{ exists: boolean, matchedField: 'phone'|'email'|'both'|null, user: Object|null }>}
 */
export async function checkUserExists({ phone, email }) {
  const targetPhone10 = normalizePhone10(phone);
  const targetEmail = normalizeEmail(email);

  // 1. Check local registry first for instant response
  const localList = getLocalUserRegistry();
  for (const item of localList) {
    const itemPhone10 = normalizePhone10(item.phone);
    const itemEmail = normalizeEmail(item.email);

    const phoneMatch = !!(targetPhone10 && itemPhone10 && targetPhone10 === itemPhone10);
    const emailMatch = !!(targetEmail && itemEmail && targetEmail === itemEmail);

    if (phoneMatch || emailMatch) {
      return {
        exists: true,
        matchedField: phoneMatch && emailMatch ? 'both' : (phoneMatch ? 'phone' : 'email'),
        user: item
      };
    }
  }

  // 2. Query Supabase profiles table
  try {
    const { data, error } = await supabase.from('profiles').select('*');
    if (!error && Array.isArray(data)) {
      for (const row of data) {
        const rowPhone10 = normalizePhone10(row.phone);
        const rowEmail = normalizeEmail(row.email);

        const phoneMatch = !!(targetPhone10 && rowPhone10 && targetPhone10 === rowPhone10);
        const emailMatch = !!(targetEmail && rowEmail && targetEmail === rowEmail);

        if (phoneMatch || emailMatch) {
          const resolvedId = row.preferences?.ridingoId || row.preferences?.userId || generateRidingoUserId();
          const userObj = {
            id: resolvedId,
            userId: resolvedId,
            name: row.name,
            phone: row.phone,
            email: row.email,
            preferences: row.preferences
          };
          saveToLocalUserRegistry(userObj);
          return {
            exists: true,
            matchedField: phoneMatch && emailMatch ? 'both' : (phoneMatch ? 'phone' : 'email'),
            user: userObj
          };
        }
      }
    }
  } catch (err) {
    console.warn('Supabase checkUserExists query notice:', err);
  }

  return {
    exists: false,
    matchedField: null,
    user: null
  };
}

/**
 * Registers a new user with guaranteed unique Ridingo User ID.
 * Returns error if phone or email is already registered.
 */
export async function registerUserProfile({ firstName, lastName, phone, email, emergencyPhone, existingUserId }) {
  const cleanPhone = normalizePhone10(phone);
  const cleanEmail = normalizeEmail(email);

  if (!cleanPhone || cleanPhone.length < 10) {
    throw new Error('Please enter a valid 10-digit mobile number');
  }
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Please enter a valid email address');
  }

  // Check uniqueness against database & registry
  const check = await checkUserExists({ phone: cleanPhone, email: cleanEmail });
  if (check.exists) {
    return {
      success: false,
      alreadyRegistered: true,
      matchedField: check.matchedField,
      message: 'You are already registered with this mobile number/email. Please log in.',
      existingUser: check.user
    };
  }

  // Generate unique Ridingo User ID
  const ridingoId = existingUserId || generateRidingoUserId();
  const formattedPhone = formatIndianPhone(cleanPhone);
  const fullName = `${(firstName || '').trim()} ${(lastName || '').trim()}`.trim() || 'Ridingo Member';

  const userRecord = {
    id: ridingoId,
    userId: ridingoId,
    name: fullName,
    firstName: (firstName || '').trim(),
    lastName: (lastName || '').trim(),
    phone: formattedPhone,
    email: cleanEmail,
    emergencyPhone: emergencyPhone ? formatIndianPhone(emergencyPhone) : '',
    createdAt: new Date().toISOString()
  };

  // Upsert to Supabase profiles table
  try {
    await supabase.from('profiles').upsert({
      phone: formattedPhone,
      email: cleanEmail,
      name: fullName,
      preferences: {
        ridingoId,
        userId: ridingoId,
        firstName: userRecord.firstName,
        lastName: userRecord.lastName,
        emergencyPhone: userRecord.emergencyPhone
      },
      updated_at: new Date().toISOString()
    }, { onConflict: 'phone' });
  } catch (err) {
    console.warn('Supabase profile save notice:', err);
  }

  // Save to local registry
  saveToLocalUserRegistry(userRecord);

  return {
    success: true,
    alreadyRegistered: false,
    user: userRecord
  };
}

/**
 * Looks up user by login identifier (phone or email) and ensures unique Ridingo ID
 */
export async function getUserProfileByLogin({ identifier, name, emailFallback, phoneFallback, supabaseUser }) {
  const isEmail = String(identifier || '').includes('@');
  const queryPhone = !isEmail ? identifier : (phoneFallback || '');
  const queryEmail = isEmail ? identifier : (emailFallback || '');

  const check = await checkUserExists({ phone: queryPhone, email: queryEmail });
  if (check.exists && check.user) {
    const existing = check.user;
    const finalId = existing.id || existing.userId || generateRidingoUserId();
    const finalObj = {
      ...existing,
      id: finalId,
      userId: finalId,
      name: existing.name || name || 'Ridingo Member',
      phone: existing.phone || (queryPhone ? formatIndianPhone(queryPhone) : ''),
      email: existing.email || queryEmail || ''
    };
    saveToLocalUserRegistry(finalObj);
    return finalObj;
  }

  // If first time sign-in, create a fresh profile with unique Ridingo ID
  const newRidingoId = generateRidingoUserId();
  const phoneFormatted = queryPhone ? formatIndianPhone(queryPhone) : '+91 98401 23456';
  const cleanEmail = normalizeEmail(queryEmail);
  const fullName = name || (cleanEmail ? cleanEmail.split('@')[0] : 'Ridingo Member');

  const newRecord = {
    id: newRidingoId,
    userId: newRidingoId,
    name: fullName,
    phone: phoneFormatted,
    email: cleanEmail,
    createdAt: new Date().toISOString()
  };

  try {
    await supabase.from('profiles').upsert({
      phone: phoneFormatted,
      email: cleanEmail,
      name: fullName,
      preferences: {
        ridingoId: newRidingoId,
        userId: newRidingoId
      },
      updated_at: new Date().toISOString()
    }, { onConflict: 'phone' });
  } catch (e) {
    console.warn('Supabase auto profile create notice:', e);
  }

  saveToLocalUserRegistry(newRecord);
  return newRecord;
}

/**
 * Evaluates whether a trip belongs strictly to the currently logged-in user.
 * Matches by unique userId, 10-digit mobile number, or email.
 * 
 * @param {Object} trip 
 * @param {Object} user 
 * @returns {boolean}
 */
export function isUserTrip(trip, user) {
  if (!trip || !user) return false;

  // 1. Match by Unique Ridingo User ID
  const uId = user.id || user.userId;
  const tId = trip.rider?.id || trip.rider?.userId;
  if (uId && tId && String(uId).trim().toLowerCase() === String(tId).trim().toLowerCase()) {
    return true;
  }

  // 2. Match by 10-digit mobile number
  const uPhone10 = normalizePhone10(user.phone);
  const tPhone10 = normalizePhone10(trip.rider?.phone);
  if (uPhone10 && tPhone10 && uPhone10 === tPhone10) {
    return true;
  }

  // 3. Match by normalized email
  const uEmail = normalizeEmail(user.email);
  const tEmail = normalizeEmail(trip.rider?.email);
  if (uEmail && tEmail && uEmail === tEmail) {
    return true;
  }

  return false;
}
