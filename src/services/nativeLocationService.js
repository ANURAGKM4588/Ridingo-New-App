import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

/**
 * Universal Native Device Location Service for Ridingo User & Driver Apps
 * 
 * Solves the WKWebView 'localhost' double-permission prompt on iOS:
 * When running on iOS / Android via Capacitor, standard WebKit/browser `navigator.geolocation`
 * triggers a secondary browser prompt:
 * "'localhost' would like to use your current location..."
 * 
 * This service routes all location requests strictly through @capacitor/geolocation (Apple CoreLocation / Android LocationManager),
 * prompting ONLY the native OS permission dialog once.
 * 
 * It also installs a transparent runtime interceptor on `window.navigator.geolocation` when on native platforms,
 * so any third-party SDKs, Map components, or polyfills are automatically bridged to native without prompting WKWebView.
 */

const activeWatchMap = new Map();

/**
 * Check device location permissions status
 * @returns {Promise<{ location: string, coarseLocation?: string }>}
 */
export async function checkLocationPermissions() {
  try {
    if (Capacitor.isNativePlatform()) {
      return await Geolocation.checkPermissions();
    }
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      try {
        const res = await navigator.permissions.query({ name: 'geolocation' });
        return { location: res.state, coarseLocation: res.state };
      } catch (_) {}
    }
    return { location: 'prompt', coarseLocation: 'prompt' };
  } catch (err) {
    console.warn('[NativeLocation] Check permissions error:', err);
    return { location: 'prompt', coarseLocation: 'prompt' };
  }
}

/**
 * Request OS-level native location permission
 * @returns {Promise<{ location: string, coarseLocation?: string }>}
 */
export async function requestLocationPermissions() {
  try {
    if (Capacitor.isNativePlatform()) {
      return await Geolocation.requestPermissions();
    }
    return { location: 'granted', coarseLocation: 'granted' };
  } catch (err) {
    console.warn('[NativeLocation] Request permissions error:', err);
    return { location: 'denied', coarseLocation: 'denied' };
  }
}

/**
 * Get current device coordinates
 * On native iOS / Android: routes strictly through @capacitor/geolocation
 * On desktop browser: uses browser geolocation
 * 
 * @param {Object} options
 * @returns {Promise<{ coords: { latitude: number, longitude: number, accuracy: number, heading: number|null, speed: number|null }, timestamp: number }>}
 */
export async function getCurrentDevicePosition(options = {}) {
  const defaultOpts = {
    enableHighAccuracy: true,
    timeout: 8000,
    maximumAge: 10000,
    ...options
  };

  // 1. Native Capacitor Geolocation (iOS & Android)
  if (Capacitor.isNativePlatform()) {
    try {
      const perm = await Geolocation.checkPermissions();
      if (perm.location !== 'granted') {
        const req = await Geolocation.requestPermissions();
        if (req.location !== 'granted') {
          throw new Error('Location permission not granted');
        }
      }
      return await Geolocation.getCurrentPosition(defaultOpts);
    } catch (nativeErr) {
      console.warn('[NativeLocation] Native getCurrentPosition error:', nativeErr);
      throw nativeErr;
    }
  }

  // 2. Desktop Web Browser Fallback (NEVER called on Native iOS/Android)
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation unavailable'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, defaultOpts);
  });
}

/**
 * Continuously watch device position
 * 
 * @param {Object} options
 * @param {Function} onPosition
 * @param {Function} onError
 * @returns {Promise<string|number>} Watch ID for cancellation
 */
export async function watchDevicePosition(options = {}, onPosition, onError) {
  const defaultOpts = {
    enableHighAccuracy: true,
    timeout: 8000,
    maximumAge: 3000,
    ...options
  };

  // 1. Native Capacitor Geolocation
  if (Capacitor.isNativePlatform()) {
    try {
      const perm = await Geolocation.checkPermissions();
      if (perm.location !== 'granted') {
        await Geolocation.requestPermissions().catch(() => {});
      }
      const watchId = await Geolocation.watchPosition(defaultOpts, (pos, err) => {
        if (err) {
          if (onError) onError(err);
        } else if (pos && onPosition) {
          onPosition(pos);
        }
      });
      return watchId;
    } catch (err) {
      console.warn('[NativeLocation] Native watchPosition error:', err);
      if (onError) onError(err);
      throw err;
    }
  }

  // 2. Desktop Web Browser Fallback
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    return navigator.geolocation.watchPosition(onPosition, onError, defaultOpts);
  }

  return null;
}

/**
 * Clear an active position watch
 * @param {string|number} watchId
 */
export async function clearDeviceWatch(watchId) {
  if (watchId === null || watchId === undefined) return;

  if (Capacitor.isNativePlatform()) {
    try {
      await Geolocation.clearWatch({ id: String(watchId) });
    } catch (err) {
      console.warn('[NativeLocation] Native clearWatch error:', err);
    }
    return;
  }

  if (typeof navigator !== 'undefined' && navigator.geolocation && typeof watchId === 'number') {
    navigator.geolocation.clearWatch(watchId);
  }
}

/**
 * Install transparent runtime WKWebView Geolocation Interceptor
 * 
 * If any third-party SDK (Google Maps JS API, Leaflet, etc.) or legacy code accesses
 * `window.navigator.geolocation`, this interceptor routes it through `@capacitor/geolocation`
 * on native platforms, permanently preventing WKWebView from showing the secondary
 * "'localhost' would like to use your current location" dialog.
 */
export function installNativeGeolocationShield() {
  if (!Capacitor.isNativePlatform() || typeof window === 'undefined' || !window.navigator) {
    return;
  }

  try {
    const interceptedGeolocation = {
      getCurrentPosition: (success, error, options) => {
        getCurrentDevicePosition(options)
          .then((pos) => {
            if (success) {
              success({
                coords: {
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                  accuracy: pos.coords.accuracy || 10,
                  altitude: pos.coords.altitude || null,
                  altitudeAccuracy: pos.coords.altitudeAccuracy || null,
                  heading: pos.coords.heading || null,
                  speed: pos.coords.speed || null
                },
                timestamp: pos.timestamp || Date.now()
              });
            }
          })
          .catch((err) => {
            if (error) error(err);
          });
      },
      watchPosition: (success, error, options) => {
        const virtualId = Math.floor(Math.random() * 1000000) + 1;
        watchDevicePosition(options, success, error)
          .then((nativeId) => {
            activeWatchMap.set(virtualId, nativeId);
          })
          .catch((err) => {
            if (error) error(err);
          });
        return virtualId;
      },
      clearWatch: (virtualId) => {
        const nativeId = activeWatchMap.get(virtualId);
        if (nativeId) {
          clearDeviceWatch(nativeId);
          activeWatchMap.delete(virtualId);
        }
      }
    };

    try {
      Object.defineProperty(window.navigator, 'geolocation', {
        value: interceptedGeolocation,
        configurable: true,
        writable: true
      });
    } catch (_) {
      window.navigator.geolocation = interceptedGeolocation;
    }
    console.info('[NativeLocation] WKWebView Geolocation Shield installed successfully.');
  } catch (err) {
    console.warn('[NativeLocation] Failed to install WKWebView shield:', err);
  }
}

// Auto-install immediately upon module import on native platforms
installNativeGeolocationShield();
