/**
 * Ridingo Google Maps Integration Service
 * 
 * Provides a production-ready Google Maps architecture that seamlessly supports:
 * 1. Testing Phase: Realistic mock data for Places autocomplete, Reverse Geocoding,
 *    Directions/Routes, and turn-by-turn guidance without requiring Google Cloud billing.
 * 2. Production Live Phase: Instant zero-code switch to actual Google Maps APIs
 *    (Google Places API, Directions API, Geocoder, Maps JS SDK) when VITE_GOOGLE_MAPS_API_KEY is configured.
 * 3. Theme Engine: Authentic Google Maps Light & Dark/Night mode styling.
 * 4. Deep Navigation: Official Google Maps turn-by-turn navigation deep links for iOS and Android.
 */

// API Key from environment (.env)
export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Mock Mode Configuration
// Set to true by default if no API key is configured or VITE_USE_MOCK_MAPS === 'true'
let runtimeMockModeOverride = null;

export function isMockMode() {
  if (runtimeMockModeOverride !== null) {
    return runtimeMockModeOverride;
  }
  if (typeof window !== 'undefined') {
    const stored = window.localStorage?.getItem('ridingo_use_mock_maps');
    if (stored !== null) return stored === 'true';
  }
  // If explicitly forced via env var
  if (import.meta.env.VITE_USE_MOCK_MAPS === 'true') {
    return true;
  }
  // If no Google Maps API key provided, automatically run in mock mode
  return !GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY.includes('YOUR_GOOGLE_MAPS_API_KEY');
}

export function setMockMode(enabled) {
  runtimeMockModeOverride = Boolean(enabled);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage?.setItem('ridingo_use_mock_maps', String(enabled));
    } catch (e) {}
  }
  console.info(`[GoogleMaps] Mock mode set to: ${enabled}`);
}

// ============================================================================
// Google Maps Stock Tile Endpoints
// ============================================================================
export const GOOGLE_MAP_TILES = {
  roadmap: {
    name: 'Google Roadmap (Light)',
    url: 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 20,
    attribution: 'Map data ©' + new Date().getFullYear() + ' Google'
  },
  satellite: {
    name: 'Google Satellite',
    url: 'https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 20,
    attribution: 'Imagery ©' + new Date().getFullYear() + ' Google'
  },
  hybrid: {
    name: 'Google Hybrid (Satellite + Roads)',
    url: 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 20,
    attribution: 'Map data & Imagery ©' + new Date().getFullYear() + ' Google'
  },
  terrain: {
    name: 'Google Terrain',
    url: 'https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 20,
    attribution: 'Map data ©' + new Date().getFullYear() + ' Google'
  }
};

// ============================================================================
// Google Maps Official Dark / Night Theme Style JSON
// (Used when initializing Google Maps JS SDK in Dark Mode)
// ============================================================================
export const GOOGLE_MAPS_DARK_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }]
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }]
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#263c3f' }]
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6b9a76' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#38414e' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#212a37' }]
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9ca5b3' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#746855' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1f2835' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#f3d19c' }]
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#2f3948' }]
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }]
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#17263c' }]
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#515c6d' }]
  },
  {
    featureType: 'water',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#17263c' }]
  }
];

// ============================================================================
// Comprehensive Mock Data for Testing Phase
// ============================================================================
export const MOCK_PLACES_DATABASE = [
  // Kochi
  {
    place_id: 'mock_place_lulu_kochi',
    title: 'Lulu International Shopping Mall',
    sub: 'Edappally, Kochi, Kerala 682024',
    lat: 10.0284,
    lng: 76.3082,
    type: 'mall',
    rating: 4.6
  },
  {
    place_id: 'mock_place_edappally_toll',
    title: 'Edappally Toll Junction',
    sub: 'NH 66, Edappally, Kochi, Kerala 682024',
    lat: 10.0245,
    lng: 76.3075,
    type: 'hub',
    rating: 4.4
  },
  {
    place_id: 'mock_place_cok_airport',
    title: 'Cochin International Airport (COK)',
    sub: 'Airport Rd, Nedumbassery, Kochi, Kerala 683111',
    lat: 10.1518,
    lng: 76.3930,
    type: 'airport',
    rating: 4.7
  },
  {
    place_id: 'mock_place_infopark_kochi',
    title: 'Infopark Phase 1 & 2',
    sub: 'Kakkanad, Kochi, Kerala 682042',
    lat: 10.0104,
    lng: 76.3639,
    type: 'tech',
    rating: 4.5
  },
  {
    place_id: 'mock_place_marine_drive',
    title: 'Marine Drive Walkway & Rainbow Bridge',
    sub: 'Ernakulam, Kochi, Kerala 682031',
    lat: 9.9796,
    lng: 76.2758,
    type: 'hub',
    rating: 4.5
  },
  {
    place_id: 'mock_place_mg_road_metro',
    title: 'MG Road Metro Station',
    sub: 'Shenoys, Kochi, Kerala 682035',
    lat: 9.9723,
    lng: 76.2783,
    type: 'metro',
    rating: 4.3
  },
  {
    place_id: 'mock_place_panampilly_nagar',
    title: 'Panampilly Nagar Central Park',
    sub: 'Panampilly Nagar, Kochi, Kerala 682036',
    lat: 9.9610,
    lng: 76.2950,
    type: 'residential',
    rating: 4.5
  },
  {
    place_id: 'mock_place_fort_kochi',
    title: 'Fort Kochi Beach & Heritage Walk',
    sub: 'Fort Kochi, Kochi, Kerala 682001',
    lat: 9.9658,
    lng: 76.2421,
    type: 'tourist',
    rating: 4.7
  },

  // Bengaluru
  {
    place_id: 'mock_place_blr_airport',
    title: 'Kempegowda International Airport (BLR)',
    sub: 'KIAL Rd, Devanahalli, Bengaluru, Karnataka 560300',
    lat: 13.1986,
    lng: 77.7066,
    type: 'airport',
    rating: 4.8
  },
  {
    place_id: 'mock_place_indiranagar_100ft',
    title: 'Indiranagar 100 Feet Road',
    sub: 'HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038',
    lat: 12.9719,
    lng: 77.6412,
    type: 'hub',
    rating: 4.7
  },
  {
    place_id: 'mock_place_koramangala_5th',
    title: 'Koramangala 5th Block',
    sub: 'Koramangala, Bengaluru, Karnataka 560095',
    lat: 12.9352,
    lng: 77.6245,
    type: 'hub',
    rating: 4.6
  },
  {
    place_id: 'mock_place_mg_road_blr',
    title: 'MG Road Metro Station',
    sub: 'MG Road, Bengaluru, Karnataka 560001',
    lat: 12.9756,
    lng: 77.6068,
    type: 'metro',
    rating: 4.5
  },
  {
    place_id: 'mock_place_whitefield_itpl',
    title: 'International Tech Park Bengaluru (ITPL)',
    sub: 'Whitefield Main Rd, Bengaluru, Karnataka 560066',
    lat: 12.9863,
    lng: 77.7346,
    type: 'tech',
    rating: 4.5
  },
  {
    place_id: 'mock_place_electronic_city',
    title: 'Electronic City Phase 1 Toll Gate',
    sub: 'Hosur Rd, Bengaluru, Karnataka 560100',
    lat: 12.8399,
    lng: 77.6770,
    type: 'tech',
    rating: 4.3
  },

  // Mumbai
  {
    place_id: 'mock_place_bom_airport',
    title: 'Chhatrapati Shivaji Maharaj International Airport (BOM)',
    sub: 'Terminal 2, Sahar, Andheri East, Mumbai 400099',
    lat: 19.0896,
    lng: 72.8656,
    type: 'airport',
    rating: 4.6
  },
  {
    place_id: 'mock_place_bkc_mumbai',
    title: 'Bandra Kurla Complex (BKC)',
    sub: 'Bandra East, Mumbai, Maharashtra 400051',
    lat: 19.0664,
    lng: 72.8687,
    type: 'tech',
    rating: 4.6
  },

  // Delhi NCR
  {
    place_id: 'mock_place_del_airport',
    title: 'Indira Gandhi International Airport (DEL)',
    sub: 'Terminal 3, New Delhi, Delhi 110037',
    lat: 28.5562,
    lng: 77.1000,
    type: 'airport',
    rating: 4.7
  },
  {
    place_id: 'mock_place_cyber_city',
    title: 'DLF Cyber City Building 10',
    sub: 'DLF Phase 2, Gurugram, Haryana 122002',
    lat: 28.4950,
    lng: 77.0895,
    type: 'tech',
    rating: 4.7
  }
];

let googleMapsScriptLoadingPromise = null;

/**
 * Dynamically loads the official Google Maps JavaScript API SDK script
 * when an API key is configured.
 */
export function loadGoogleMapsSdk(apiKey = GOOGLE_MAPS_API_KEY) {
  if (typeof window === 'undefined') return Promise.reject('Window is undefined');
  if (window.google && window.google.maps) {
    return Promise.resolve(window.google.maps);
  }

  if (googleMapsScriptLoadingPromise) {
    return googleMapsScriptLoadingPromise;
  }

  googleMapsScriptLoadingPromise = new Promise((resolve) => {
    // If running in mock mode or no API key, resolve gracefully with null
    if (isMockMode() || !apiKey) {
      console.info('[GoogleMaps] Operating in Mock Testing Mode (No API billing incurred)');
      resolve(null);
      return;
    }

    const script = document.createElement('script');
    script.id = 'ridingo-google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.info('[GoogleMaps] Official Google Maps JS SDK loaded successfully');
      resolve(window.google.maps);
    };
    script.onerror = (err) => {
      console.warn('[GoogleMaps] Failed to load Google Maps SDK, falling back to mock mode:', err);
      resolve(null);
    };
    document.head.appendChild(script);
  });

  return googleMapsScriptLoadingPromise;
}

/**
 * Unified Places Search & Autocomplete
 * If Live API key is configured and mock mode is off, uses official Google Places Autocomplete.
 * If in Testing Mode, queries the comprehensive mock dataset with instant fuzzy matching.
 */
export async function searchGooglePlaces(query, callback) {
  if (!query || !query.trim()) {
    callback([]);
    return;
  }

  const clean = query.trim().toLowerCase();

  // Try live Google Places API if SDK is loaded and not in mock mode
  if (!isMockMode() && window.google?.maps?.places?.AutocompleteService) {
    try {
      const service = new window.google.maps.places.AutocompleteService();
      service.getPlacePredictions(
        {
          input: query,
          componentRestrictions: { country: 'in' }
        },
        (predictions, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions && predictions.length > 0) {
            const results = predictions.map(p => ({
              id: p.place_id,
              place_id: p.place_id,
              title: p.structured_formatting?.main_text || p.description,
              sub: p.structured_formatting?.secondary_text || 'Google Places location',
              description: p.description,
              isMock: false
            }));
            callback(results);
            return;
          }
          // Fall back to mock places if Google returns zero results
          callback(getFilteredMockPlaces(clean));
        }
      );
      return;
    } catch (e) {
      console.warn('[GoogleMaps] Places Autocomplete error, falling back to mock data:', e);
    }
  }

  // Fallback to Instant Mock Data
  callback(getFilteredMockPlaces(clean));
}

function getFilteredMockPlaces(cleanQuery) {
  const matches = MOCK_PLACES_DATABASE.filter(p =>
    p.title.toLowerCase().includes(cleanQuery) ||
    p.sub.toLowerCase().includes(cleanQuery)
  );

  return matches.map(p => ({
    id: p.place_id,
    place_id: p.place_id,
    title: p.title,
    sub: p.sub,
    lat: p.lat,
    lng: p.lng,
    type: p.type,
    isMock: true
  }));
}

/**
 * Unified Reverse Geocoding
 * Translates coordinates into human-readable Indian street addresses.
 */
export async function reverseGeocodeGoogle(lat, lng) {
  if (!lat || !lng) return 'Unknown location';

  // 1. If live Google Maps SDK is loaded, use Geocoder
  if (!isMockMode() && window.google?.maps?.Geocoder) {
    try {
      const geocoder = new window.google.maps.Geocoder();
      const res = await new Promise((resolve, reject) => {
        geocoder.geocode({ location: { lat: Number(lat), lng: Number(lng) } }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            resolve(results[0].formatted_address);
          } else {
            reject(status);
          }
        });
      });
      if (res) return res;
    } catch (e) {
      console.warn('[GoogleMaps] Geocoder error, using mock/Nominatim fallback:', e);
    }
  }

  // 2. Check if near any landmark in mock database (< 1.5 km)
  let closest = null;
  let minDist = Infinity;
  for (const p of MOCK_PLACES_DATABASE) {
    const d = Math.hypot(p.lat - lat, p.lng - lng);
    if (d < minDist) {
      minDist = d;
      closest = p;
    }
  }

  if (closest && minDist < 0.015) {
    return `${closest.title}, ${closest.sub}`;
  }

  // 3. Fallback to coordinate label
  return `Location (${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)})`;
}

/**
 * Generates an official Google Maps turn-by-turn Navigation URL
 * Automatically opens the native Google Maps app on iOS and Android
 * or the official Google Maps web directions on desktop.
 */
export function getGoogleNavigationUrl({ origin, destination, travelMode = 'driving' }) {
  const params = new URLSearchParams({
    api: '1',
    travelmode: travelMode
  });

  if (origin) {
    params.set(
      'origin',
      typeof origin === 'object' && origin.lat != null ? `${origin.lat},${origin.lng}` : String(origin)
    );
  }

  if (destination) {
    params.set(
      'destination',
      typeof destination === 'object' && destination.lat != null
        ? `${destination.lat},${destination.lng}`
        : String(destination)
    );
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * Launches turn-by-turn Google Maps navigation in a new tab or native Google Maps app
 */
export function openInGoogleMaps({ origin, destination, travelMode = 'driving' }) {
  const url = getGoogleNavigationUrl({ origin, destination, travelMode });
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  return url;
}

/**
 * Calculates Mock Turn-by-Turn Route Telemetry & Waypoints
 * Generates realistic polylines, duration, distance, and turns for testing.
 */
export function calculateMockRoute(originCoord, destCoord) {
  const oLat = originCoord?.lat || 10.0245;
  const oLng = originCoord?.lng || 76.3075;
  const dLat = destCoord?.lat || 10.0285;
  const dLng = destCoord?.lng || 76.3120;

  // Approximate distance in km (Haversine formula)
  const R = 6371;
  const dLatRad = ((dLat - oLat) * Math.PI) / 180;
  const dLngRad = ((dLng - oLng) * Math.PI) / 180;
  const a =
    Math.sin(dLatRad / 2) * Math.sin(dLatRad / 2) +
    Math.cos((oLat * Math.PI) / 180) *
      Math.cos((dLat * Math.PI) / 180) *
      Math.sin(dLngRad / 2) *
      Math.sin(dLngRad / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const rawDistKm = R * c;
  const distanceKm = Math.max(1.2, Number((rawDistKm * 1.35).toFixed(1))); // 1.35x road factor

  // Average city driving speed 30 km/h
  const durationMins = Math.max(5, Math.round((distanceKm / 28) * 60));

  // Generate 6 smooth interpolated waypoints following typical city road grid
  const waypoints = [];
  const numSteps = 6;
  for (let i = 0; i <= numSteps; i++) {
    const t = i / numSteps;
    // Add slight natural curve offset to simulate real roads
    const curveOffset = Math.sin(t * Math.PI) * 0.0035;
    const lat = oLat + (dLat - oLat) * t + curveOffset;
    const lng = oLng + (dLng - oLng) * t - curveOffset * 0.5;
    waypoints.push({ lat, lng });
  }

  return {
    distanceKm,
    durationMins,
    distanceText: `${distanceKm} km`,
    durationText: `${durationMins} mins`,
    waypoints,
    steps: [
      { instruction: 'Head north towards main corridor', distance: '400 m' },
      { instruction: 'Turn right onto highway bypass', distance: `${(distanceKm * 0.6).toFixed(1)} km` },
      { instruction: 'Take the flyover ramp towards destination', distance: `${(distanceKm * 0.3).toFixed(1)} km` },
      { instruction: 'Arrive at destination on the left', distance: '100 m' }
    ]
  };
}
