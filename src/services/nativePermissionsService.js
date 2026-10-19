/**
 * Ridingo Native System-Level Permissions Service
 * Built with 'react-native-permissions' (with cross-environment Capacitor/Web fallbacks)
 * 
 * Supports:
 * - 1. User App:
 *      - Foreground Location (Device GPS pickup & navigation)
 *      - Push Notifications (Booking confirmation, driver arrival, trip updates)
 *      - Photo Library (Profile avatar, support attachments)
 * - 2. Driver App:
 *      - Foreground & Background Location (Continuous real-time dispatch & turn-by-turn tracking)
 *      - Camera & Photo Library (KYC document verification: DL photo, Aadhaar card, vehicle condition inspection)
 *      - System Push Notifications (High-priority device-level incoming ride dispatch & payout alerts)
 * 
 * Handles all permission states:
 * - 'unavailable': Device feature/hardware not present
 * - 'denied': Permission prompt can be shown to the user
 * - 'limited': Granted with partial access (e.g. iOS 14+ selected photo access)
 * - 'granted': Fully authorized
 * - 'blocked': User previously selected "Don't ask again" or denied system prompt.
 *              Displays informative guidance and navigates directly to app Settings via openSettings().
 */

import { Platform, Alert, Linking } from 'react-native';
import { Capacitor } from '@capacitor/core';

// Safe dynamic loader for 'react-native-permissions'
let RNP = null;
try {
  RNP = require('react-native-permissions');
} catch (e) {
  // If running in pure web or Capacitor bundle where react-native-permissions is not linked
}

export const PERMISSION_RESULTS = RNP?.RESULTS || {
  UNAVAILABLE: 'unavailable',
  DENIED: 'denied',
  LIMITED: 'limited',
  GRANTED: 'granted',
  BLOCKED: 'blocked'
};

/**
 * Feature-to-Permission Mapping for iOS & Android
 */
export const PERMISSION_TYPES = {
  LOCATION_FOREGROUND: 'LOCATION_FOREGROUND',
  LOCATION_BACKGROUND: 'LOCATION_BACKGROUND',
  NOTIFICATIONS: 'NOTIFICATIONS',
  CAMERA: 'CAMERA',
  PHOTO_LIBRARY: 'PHOTO_LIBRARY'
};

function getPlatformPermissionKey(feature, role = 'user') {
  if (!RNP?.PERMISSIONS) return null;
  const isIOS = Platform.OS === 'ios';

  switch (feature) {
    case PERMISSION_TYPES.LOCATION_FOREGROUND:
      return isIOS
        ? RNP.PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
        : RNP.PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

    case PERMISSION_TYPES.LOCATION_BACKGROUND:
      if (role !== 'driver') return null;
      return isIOS
        ? RNP.PERMISSIONS.IOS.LOCATION_ALWAYS
        : RNP.PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION;

    case PERMISSION_TYPES.CAMERA:
      return isIOS
        ? RNP.PERMISSIONS.IOS.CAMERA
        : RNP.PERMISSIONS.ANDROID.CAMERA;

    case PERMISSION_TYPES.PHOTO_LIBRARY:
      return isIOS
        ? RNP.PERMISSIONS.IOS.PHOTO_LIBRARY
        : (Platform.Version >= 33
            ? RNP.PERMISSIONS.ANDROID.READ_MEDIA_IMAGES
            : RNP.PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE);

    default:
      return null;
  }
}

/**
 * Rationale explanations displayed when a permission is blocked
 */
const PERMISSION_RATIONALE = {
  user: {
    [PERMISSION_TYPES.LOCATION_FOREGROUND]: {
      title: 'Location Access Needed',
      message: 'Ridingo requires your GPS location to set accurate pickup points and route your driver to your doorstep.'
    },
    [PERMISSION_TYPES.NOTIFICATIONS]: {
      title: 'Notifications Recommended',
      message: 'Enable notifications to receive instant updates when your driver is assigned, arrives at pickup, or begins the journey.'
    },
    [PERMISSION_TYPES.PHOTO_LIBRARY]: {
      title: 'Photo Library Access',
      message: 'Allow photo library access to upload your profile photo or attach support receipts.'
    }
  },
  driver: {
    [PERMISSION_TYPES.LOCATION_FOREGROUND]: {
      title: 'GPS Location Required',
      message: 'Ridingo Driver requires accurate GPS location to receive nearby trip dispatch requests and provide navigation.'
    },
    [PERMISSION_TYPES.LOCATION_BACKGROUND]: {
      title: 'Always Allow Location Required',
      message: 'Continuous background location allows Ridingo to dispatch bookings while you are on duty and keep customers updated on your arrival even when the app is minimized.'
    },
    [PERMISSION_TYPES.CAMERA]: {
      title: 'Camera Access Required',
      message: 'Camera permission is required to photograph your Driving Licence, Aadhaar card, and capture vehicle condition check scratches.'
    },
    [PERMISSION_TYPES.PHOTO_LIBRARY]: {
      title: 'Photos Access Required',
      message: 'Allow access to your photos to upload KYC documents and vehicle inspection records.'
    },
    [PERMISSION_TYPES.NOTIFICATIONS]: {
      title: 'Device Dispatch Alerts Required',
      message: 'Enable high-priority device notifications so you never miss an incoming ride request or instant bank payout alert.'
    }
  }
};

/**
 * Open System Settings Dialog Guide
 */
export async function openAppSettingsGuide(feature, role = 'user') {
  const info = PERMISSION_RATIONALE[role]?.[feature] || {
    title: 'Permission Blocked in System Settings',
    message: 'This feature is currently blocked. Please enable it in your device Settings to continue.'
  };

  return new Promise((resolve) => {
    Alert.alert(
      info.title,
      `${info.message}\n\nPlease tap "Open Settings" and turn on the permission switch.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve(false)
        },
        {
          text: 'Open Settings',
          style: 'default',
          onPress: async () => {
            try {
              if (RNP?.openSettings) {
                await RNP.openSettings();
              } else {
                await Linking.openSettings();
              }
              resolve(true);
            } catch (err) {
              console.warn('Failed to open app settings:', err);
              resolve(false);
            }
          }
        }
      ],
      { cancelable: true }
    );
  });
}

/**
 * Check permission status
 */
export async function checkAppPermission(feature, role = 'user') {
  // Special handling for Push Notifications
  if (feature === PERMISSION_TYPES.NOTIFICATIONS) {
    if (RNP?.checkNotifications) {
      try {
        const { status } = await RNP.checkNotifications();
        return status;
      } catch (e) {}
    }
    // Web / Capacitor Notification fallback
    if (typeof Notification !== 'undefined') {
      if (Notification.permission === 'granted') return PERMISSION_RESULTS.GRANTED;
      if (Notification.permission === 'denied') return PERMISSION_RESULTS.BLOCKED;
      return PERMISSION_RESULTS.DENIED;
    }
    return PERMISSION_RESULTS.GRANTED;
  }

  const permKey = getPlatformPermissionKey(feature, role);
  if (!permKey || !RNP?.check) {
    // Web / Capacitor fallback
    return PERMISSION_RESULTS.GRANTED;
  }

  try {
    return await RNP.check(permKey);
  } catch (err) {
    console.warn(`Error checking permission ${feature}:`, err);
    return PERMISSION_RESULTS.DENIED;
  }
}

/**
 * Request system-level native permission with comprehensive state handling:
 * 'unavailable', 'denied', 'limited', 'granted', 'blocked'
 */
export async function requestAppPermission(feature, role = 'user', options = { showAlertOnBlocked: true }) {
  // 1. Notification Permission Request
  if (feature === PERMISSION_TYPES.NOTIFICATIONS) {
    if (RNP?.requestNotifications) {
      try {
        const { status } = await RNP.requestNotifications(['alert', 'badge', 'sound']);
        if (status === PERMISSION_RESULTS.BLOCKED && options.showAlertOnBlocked) {
          await openAppSettingsGuide(feature, role);
        }
        return status;
      } catch (e) {}
    }

    // Web / Capacitor Notification request fallback
    if (typeof Notification !== 'undefined' && typeof Notification.requestPermission === 'function') {
      const res = await Notification.requestPermission();
      if (res === 'granted') return PERMISSION_RESULTS.GRANTED;
      if (res === 'denied') {
        if (options.showAlertOnBlocked) {
          await openAppSettingsGuide(feature, role);
        }
        return PERMISSION_RESULTS.BLOCKED;
      }
      return PERMISSION_RESULTS.DENIED;
    }
    return PERMISSION_RESULTS.GRANTED;
  }

  // 1. Native Capacitor Geolocation handling (iOS / Android)
  if (Capacitor.isNativePlatform() && (feature === PERMISSION_TYPES.LOCATION_FOREGROUND || feature === PERMISSION_TYPES.LOCATION_BACKGROUND)) {
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      if (Geolocation && typeof Geolocation.requestPermissions === 'function') {
        const res = await Geolocation.requestPermissions();
        if (res.location === 'granted') return PERMISSION_RESULTS.GRANTED;
        if (res.location === 'denied') return PERMISSION_RESULTS.DENIED;
        return PERMISSION_RESULTS.BLOCKED;
      }
    } catch (e) {
      console.warn('Native geolocation permission request:', e);
      return PERMISSION_RESULTS.GRANTED;
    }
  }

  // 2. Native / Web Camera handling (deferred dynamic request)
  if (feature === PERMISSION_TYPES.CAMERA) {
    try {
      if (typeof navigator !== 'undefined' && navigator?.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        // Immediately release tracks so camera hardware isn't held open
        stream.getTracks().forEach(t => t.stop());
        return PERMISSION_RESULTS.GRANTED;
      }
    } catch (err) {
      console.warn('[Permissions] Camera permission query error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        if (options.showAlertOnBlocked) {
          await openAppSettingsGuide(feature, role);
        }
        return PERMISSION_RESULTS.BLOCKED;
      }
      return PERMISSION_RESULTS.DENIED;
    }
    return PERMISSION_RESULTS.GRANTED;
  }

  const permKey = getPlatformPermissionKey(feature, role);
  if (!permKey || !RNP?.request) {
    return PERMISSION_RESULTS.GRANTED;
  }

  try {
    // 1. Check existing state first
    const currentStatus = await RNP.check(permKey);

    switch (currentStatus) {
      case PERMISSION_RESULTS.GRANTED:
      case PERMISSION_RESULTS.LIMITED:
        return currentStatus;

      case PERMISSION_RESULTS.BLOCKED:
        if (options.showAlertOnBlocked) {
          await openAppSettingsGuide(feature, role);
        }
        return PERMISSION_RESULTS.BLOCKED;

      case PERMISSION_RESULTS.UNAVAILABLE:
        console.warn(`Feature ${feature} is unavailable on this device.`);
        return PERMISSION_RESULTS.UNAVAILABLE;

      case PERMISSION_RESULTS.DENIED:
      default: {
        // Request system prompt
        const requestResult = await RNP.request(permKey);

        if (requestResult === PERMISSION_RESULTS.GRANTED || requestResult === PERMISSION_RESULTS.LIMITED) {
          return requestResult;
        }

        if (requestResult === PERMISSION_RESULTS.BLOCKED && options.showAlertOnBlocked) {
          await openAppSettingsGuide(feature, role);
        }
        return requestResult;
      }
    }
  } catch (err) {
    console.error(`Error requesting permission ${feature}:`, err);
    return PERMISSION_RESULTS.DENIED;
  }
}

/**
 * Dedicated helper to request Camera permission dynamically on first user interaction
 */
export async function requestDynamicCameraPermission() {
  return await requestAppPermission(PERMISSION_TYPES.CAMERA, 'driver', { showAlertOnBlocked: true });
}

/**
 * Batch request all required system permissions based on application role
 * - User App: Location & Notifications
 * - Driver App: Location & Notifications on launch (Camera is deferred until first user tap)
 */
export async function requestAllRolePermissions(role = 'user') {
  const summary = {};

  if (role === 'user') {
    // 1. User App: Location
    summary[PERMISSION_TYPES.LOCATION_FOREGROUND] = await requestAppPermission(
      PERMISSION_TYPES.LOCATION_FOREGROUND,
      'user',
      { showAlertOnBlocked: false }
    );
    // 2. User App: Notifications
    summary[PERMISSION_TYPES.NOTIFICATIONS] = await requestAppPermission(
      PERMISSION_TYPES.NOTIFICATIONS,
      'user',
      { showAlertOnBlocked: false }
    );
  } else {
    // 1. Driver App: Foreground Location (Launch)
    summary[PERMISSION_TYPES.LOCATION_FOREGROUND] = await requestAppPermission(
      PERMISSION_TYPES.LOCATION_FOREGROUND,
      'driver',
      { showAlertOnBlocked: false }
    );
    // 2. Driver App: Notifications (Launch - Critical for dispatch alerts)
    summary[PERMISSION_TYPES.NOTIFICATIONS] = await requestAppPermission(
      PERMISSION_TYPES.NOTIFICATIONS,
      'driver',
      { showAlertOnBlocked: false }
    );
    // NOTE: Camera permission is intentionally DEFERRED and NOT requested on launch.
    // It is triggered dynamically only when the user taps to open the camera for the first time.
  }

  return summary;
}

export default {
  PERMISSION_TYPES,
  PERMISSION_RESULTS,
  checkAppPermission,
  requestAppPermission,
  requestAllRolePermissions,
  openAppSettingsGuide
};
