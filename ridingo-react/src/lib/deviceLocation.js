import { Capacitor } from '@capacitor/core';

// Cache the last known real device location in memory
let cachedDeviceCoords = null;
let cachedAddress = null;
let isLocatingPromise = null;

/**
 * Reverse geocode latitude and longitude using OpenStreetMap Nominatim
 * Returns a clean, human-readable address based on real device coordinates
 */
export async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'RidingoApp/1.0'
      }
    });
    if (!res.ok) throw new Error('Geocoding network error');
    const data = await res.json();
    
    if (data && data.address) {
      const a = data.address;
      const primary = a.amenity || a.building || a.road || a.pedestrian || a.suburb || a.neighbourhood || a.commercial || a.isolated_dwelling;
      const secondary = a.neighbourhood || a.suburb || a.residential || a.city_district || a.quarter || a.subdistrict;
      const city = a.city || a.town || a.village || a.municipality || a.county || a.state_district;
      const state = a.state;

      const parts = [];
      if (primary) parts.push(primary);
      if (secondary && secondary !== primary) parts.push(secondary);
      if (city && city !== secondary && city !== primary) parts.push(city);
      if (state && parts.length < 3) parts.push(state);

      if (parts.length > 0) {
        return parts.join(', ');
      }
    }

    if (data && data.display_name) {
      return data.display_name.split(',').slice(0, 3).join(', ').trim();
    }
  } catch (err) {
    console.warn('Reverse geocoding warning:', err);
  }

  // Pure coordinate fallback strictly indicating device GPS coordinates
  return `Location (${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)})`;
}

/**
 * IP-based fallback if user's browser/device denies hardware GPS permissions
 */
async function getIPFallbackLocation() {
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (!res.ok) throw new Error('IP Geo failed');
    const d = await res.json();
    if (d.latitude && d.longitude) {
      const lat = parseFloat(d.latitude);
      const lng = parseFloat(d.longitude);
      const city = d.city || '';
      const region = d.region || '';
      const addr = [d.org ? d.org.replace(/[0-9]+/g, '').trim() : '', city, region]
        .filter(Boolean)
        .join(', ') || `${city}, ${region}`;
      return {
        lat,
        lng,
        accuracy: 5000,
        address: addr || `Near ${city} (${lat.toFixed(3)}, ${lng.toFixed(3)})`,
        isIPFallback: true
      };
    }
  } catch (e) {
    console.warn('IP fallback failed:', e);
  }
  return null;
}

/**
 * Strictly obtain the actual device GPS location.
 * Checks Capacitor native Geolocation first, then navigator.geolocation with enableHighAccuracy.
 * 
 * @param {boolean} forceRefresh - If true, bypasses in-memory cache and re-queries hardware
 * @returns {Promise<{lat: number, lng: number, accuracy: number, address: string}>}
 */
export async function getDeviceLocation(forceRefresh = false) {
  if (!forceRefresh && cachedDeviceCoords && cachedAddress) {
    return {
      lat: cachedDeviceCoords.lat,
      lng: cachedDeviceCoords.lng,
      accuracy: cachedDeviceCoords.accuracy,
      address: cachedAddress
    };
  }

  if (isLocatingPromise && !forceRefresh) {
    return isLocatingPromise;
  }

  isLocatingPromise = (async () => {
    let lat = null;
    let lng = null;
    let accuracy = null;

    // 1. Try Native Capacitor Geolocation if available
    try {
      if (Capacitor.isPluginAvailable('Geolocation')) {
        const { Geolocation } = await import('@capacitor/geolocation');
        const perm = await Geolocation.checkPermissions();
        if (perm.location !== 'granted') {
          await Geolocation.requestPermissions();
        }
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: forceRefresh ? 0 : 30000
        });
        if (pos && pos.coords) {
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
          accuracy = pos.coords.accuracy;
        }
      }
    } catch (nativeErr) {
      console.warn('Capacitor native geolocation error/unavailable, falling back to navigator:', nativeErr);
    }

    // 2. Try HTML5 Geolocation API with high accuracy
    if (lat === null && typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            {
              enableHighAccuracy: true,
              timeout: 12000,
              maximumAge: forceRefresh ? 0 : 30000
            }
          );
        });
        if (pos && pos.coords) {
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
          accuracy = pos.coords.accuracy;
        }
      } catch (geoErr) {
        console.warn('Navigator geolocation error:', geoErr);
      }
    }

    // 3. If hardware GPS is denied/failed, try IP geocoding so it's still near user's real location
    if (lat === null) {
      const ipLoc = await getIPFallbackLocation();
      if (ipLoc) {
        cachedDeviceCoords = { lat: ipLoc.lat, lng: ipLoc.lng, accuracy: ipLoc.accuracy };
        cachedAddress = ipLoc.address;
        return ipLoc;
      }
      // If everything fails (offline and no GPS), return a sensible center with coordinates label
      lat = 12.9716;
      lng = 77.5946;
      accuracy = 10000;
    }

    cachedDeviceCoords = { lat, lng, accuracy };

    // Resolve real street address
    const resolvedAddress = await reverseGeocode(lat, lng);
    cachedAddress = resolvedAddress;

    return {
      lat,
      lng,
      accuracy: accuracy || 50,
      address: resolvedAddress
    };
  })();

  try {
    const res = await isLocatingPromise;
    return res;
  } finally {
    isLocatingPromise = null;
  }
}

/**
 * Returns cached coordinates if available
 */
export function getCachedDeviceLocation() {
  if (cachedDeviceCoords && cachedAddress) {
    return {
      lat: cachedDeviceCoords.lat,
      lng: cachedDeviceCoords.lng,
      accuracy: cachedDeviceCoords.accuracy,
      address: cachedAddress
    };
  }
  return null;
}
