import { Capacitor } from '@capacitor/core';

// Cache the last known real device location in memory and localStorage for 0ms startup
const STORAGE_KEY = 'ridingo_cached_device_coords';

let cachedDeviceCoords = (() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
})();

let cachedAddress = cachedDeviceCoords?.address || null;
let isLocatingPromise = null;
const geocodeCache = new Map();

/**
 * Reverse geocode latitude and longitude using Google Maps or OpenStreetMap Nominatim
 * Includes fast in-memory caching and 2.5s network timeout to prevent UI freezes
 */
export async function reverseGeocode(lat, lng) {
  const cacheKey = `${Number(lat).toFixed(4)},${Number(lng).toFixed(4)}`;
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  // 1. Official Google Maps Geocoder if loaded
  try {
    if (typeof window !== 'undefined' && window.google?.maps?.Geocoder) {
      const geocoder = new window.google.maps.Geocoder();
      const googleResult = await new Promise((resolve) => {
        geocoder.geocode({ location: { lat: Number(lat), lng: Number(lng) } }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            resolve(results[0].formatted_address);
          } else {
            resolve(null);
          }
        });
      });
      if (googleResult) {
        geocodeCache.set(cacheKey, googleResult);
        return googleResult;
      }
    }
  } catch (e) {}

  // 2. OpenStreetMap Nominatim with strict 2.5s timeout
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);

    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'RidingoApp/1.0'
      }
    });
    clearTimeout(timer);

    if (res.ok) {
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
          const finalAddr = parts.join(', ');
          geocodeCache.set(cacheKey, finalAddr);
          return finalAddr;
        }
      }

      if (data && data.display_name) {
        const fallbackStr = data.display_name.split(',').slice(0, 3).join(', ').trim();
        geocodeCache.set(cacheKey, fallbackStr);
        return fallbackStr;
      }
    }
  } catch (err) {
    // Timeout or network drop - fallback to clean coordinates without blocking UI
  }

  const fallbackCoord = `Location (${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)})`;
  geocodeCache.set(cacheKey, fallbackCoord);
  return fallbackCoord;
}

/**
 * IP-based fallback with fast 2s timeout
 */
async function getIPFallbackLocation() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
    clearTimeout(timer);
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
        accuracy: 3000,
        address: addr || `Near ${city} (${lat.toFixed(3)}, ${lng.toFixed(3)})`,
        isIPFallback: true
      };
    }
  } catch (e) {}
  return null;
}

/**
 * Fast & Responsive Device GPS Query:
 * Uses fast 4s timeout and immediate cached return so the map is never blocked.
 */
export async function getDeviceLocation(forceRefresh = false) {
  if (!forceRefresh && cachedDeviceCoords) {
    return {
      lat: cachedDeviceCoords.lat,
      lng: cachedDeviceCoords.lng,
      accuracy: cachedDeviceCoords.accuracy || 25,
      address: cachedAddress || `Location (${cachedDeviceCoords.lat.toFixed(4)}, ${cachedDeviceCoords.lng.toFixed(4)})`
    };
  }

  if (isLocatingPromise && !forceRefresh) {
    return isLocatingPromise;
  }

  isLocatingPromise = (async () => {
    let lat = null;
    let lng = null;
    let accuracy = null;

    // 1. Native Capacitor Geolocation with fast timeout
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      if (Geolocation && typeof Geolocation.getCurrentPosition === 'function') {
        const perm = await Geolocation.checkPermissions();
        if (perm.location !== 'granted') {
          await Geolocation.requestPermissions();
        }
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 4000,
          maximumAge: forceRefresh ? 5000 : 60000
        });
        if (pos && pos.coords) {
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
          accuracy = pos.coords.accuracy;
        }
      }
    } catch (nativeErr) {
      console.warn('Fast native geolocation note:', nativeErr);
    }

    // 2. HTML5 Geolocation API in regular desktop browser
    if (lat === null && !Capacitor.isNativePlatform() && typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            {
              enableHighAccuracy: true,
              timeout: 4500,
              maximumAge: forceRefresh ? 5000 : 60000
            }
          );
        });
        if (pos && pos.coords) {
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
          accuracy = pos.coords.accuracy;
        }
      } catch (geoErr) {}
    }

    // 3. Fallback to existing cache if hardware GPS took too long
    if (lat === null && cachedDeviceCoords) {
      return {
        lat: cachedDeviceCoords.lat,
        lng: cachedDeviceCoords.lng,
        accuracy: cachedDeviceCoords.accuracy || 25,
        address: cachedAddress || `Location (${cachedDeviceCoords.lat.toFixed(4)}, ${cachedDeviceCoords.lng.toFixed(4)})`
      };
    }

    // 4. IP-based fallback
    if (lat === null) {
      const ipLoc = await getIPFallbackLocation();
      if (ipLoc) {
        cachedDeviceCoords = { lat: ipLoc.lat, lng: ipLoc.lng, accuracy: ipLoc.accuracy };
        cachedAddress = ipLoc.address;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...cachedDeviceCoords, address: cachedAddress }));
        } catch (e) {}
        return ipLoc;
      }
      // Ultimate default: Cochin / Bangalore hub
      lat = 10.0245;
      lng = 76.3075;
      accuracy = 1000;
    }

    cachedDeviceCoords = { lat, lng, accuracy };

    // Resolve street address in parallel / non-blocking
    reverseGeocode(lat, lng).then(addr => {
      cachedAddress = addr;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ lat, lng, accuracy, address: addr }));
      } catch (e) {}
    }).catch(() => {});

    return {
      lat,
      lng,
      accuracy: accuracy || 25,
      address: cachedAddress || `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`
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
 * Returns cached coordinates immediately for instant 0ms map rendering
 */
export function getCachedDeviceLocation() {
  if (cachedDeviceCoords) {
    return {
      lat: cachedDeviceCoords.lat,
      lng: cachedDeviceCoords.lng,
      accuracy: cachedDeviceCoords.accuracy || 25,
      address: cachedAddress || `Location (${cachedDeviceCoords.lat.toFixed(4)}, ${cachedDeviceCoords.lng.toFixed(4)})`
    };
  }
  return null;
}
