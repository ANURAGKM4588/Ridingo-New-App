import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  loadGoogleMapsSdk,
  GOOGLE_MAPS_DARK_STYLE,
  fetchGoogleRoadDirections,
  decodeGooglePolyline
} from '../services/googleMapsService';

function getDriverPersonIcon(google) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 38 38">
      <defs>
        <filter id="d-sh" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.38"/>
        </filter>
      </defs>
      <!-- Outer white halo with shadow -->
      <circle cx="19" cy="19" r="17.5" fill="#FFFFFF" stroke="rgba(0,0,0,0.08)" stroke-width="1" filter="url(#d-sh)"/>
      <!-- Inner vibrant blue driver badge -->
      <circle cx="19" cy="19" r="15" fill="#1A73E8"/>
      <!-- Person Head -->
      <circle cx="19" cy="13" r="4.2" fill="#FFFFFF"/>
      <!-- Person Torso / Shoulders -->
      <path d="M11.5 25.5c0-3.6 3.4-5.8 7.5-5.8s7.5 2.2 7.5 5.8v1h-15v-1z" fill="#FFFFFF"/>
    </svg>
  `.trim();

  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: new google.Size(38, 38),
    anchor: new google.Point(19, 19)
  };
}

function getGreenPickupPin(google) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40">
      <defs>
        <filter id="p-sh" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.35"/>
        </filter>
        <linearGradient id="p-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#34D399"/>
          <stop offset="100%" stop-color="#059669"/>
        </linearGradient>
      </defs>
      <!-- Metal needle pin pointing to (15, 39) -->
      <path d="M15 20 L15 39" stroke="#94A3B8" stroke-width="2.5" stroke-linecap="round"/>
      <!-- Pin collar -->
      <ellipse cx="15" cy="19.5" rx="5.5" ry="2" fill="#065F46"/>
      <!-- Pushpin round head -->
      <circle cx="15" cy="11.5" r="9.5" fill="url(#p-grad)" stroke="#FFFFFF" stroke-width="1.5" filter="url(#p-sh)"/>
      <!-- 3D spherical shine -->
      <circle cx="12" cy="8.5" r="3" fill="#FFFFFF" fill-opacity="0.75"/>
    </svg>
  `.trim();

  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: new google.Size(30, 40),
    anchor: new google.Point(15, 39)
  };
}

function getRedDestinationPin(google) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40">
      <defs>
        <filter id="r-sh" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.35"/>
        </filter>
        <linearGradient id="r-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#F87171"/>
          <stop offset="100%" stop-color="#DC2626"/>
        </linearGradient>
      </defs>
      <!-- Metal needle pin pointing to (15, 39) -->
      <path d="M15 20 L15 39" stroke="#94A3B8" stroke-width="2.5" stroke-linecap="round"/>
      <!-- Pin collar -->
      <ellipse cx="15" cy="19.5" rx="5.5" ry="2" fill="#991B1B"/>
      <!-- Pushpin round head -->
      <circle cx="15" cy="11.5" r="9.5" fill="url(#r-grad)" stroke="#FFFFFF" stroke-width="1.5" filter="url(#r-sh)"/>
      <!-- 3D spherical shine -->
      <circle cx="12" cy="8.5" r="3" fill="#FFFFFF" fill-opacity="0.75"/>
    </svg>
  `.trim();

  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: new google.Size(30, 40),
    anchor: new google.Point(15, 39)
  };
}

// Clean tracking map style rules:
// - Strips away POI icons (churches, hospitals, schools, businesses, restaurants)
// - Preserves authentic Google Maps place names (localities, neighborhoods) and road names
const TRACKING_MAP_POI_FILTER = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text', stylers: [{ visibility: 'on' }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels.text', stylers: [{ visibility: 'on' }] },
  { featureType: 'road', elementType: 'labels.text', stylers: [{ visibility: 'on' }] }
];

const TRACKING_MAP_DARK_STYLE = [
  ...GOOGLE_MAPS_DARK_STYLE.filter(s => s.featureType !== 'poi' && s.featureType !== 'transit'),
  ...TRACKING_MAP_POI_FILTER
];

const TRACKING_MAP_LIGHT_STYLE = [
  ...TRACKING_MAP_POI_FILTER
];

/**
 * Authentic Google Maps Live Tracking Component
 * - Driver Accepted -> Arrived: Route is Driver Live Device GPS -> Pickup Location
 * - Trip In-Progress (after car inspection): Route is Pickup Location -> Destination Location
 * - Clean UI: No black box, no text overlays, no buttons, no Google logos/bottom texts, no polyline arrows.
 */
export default function GraphicLiveMap({
  trip,
  isModal = false,
  height,
  onOpenModal,
  onRouteCalculated
}) {
  const mapHeight = height || (isModal ? 280 : 150);
  const containerRef = useRef(null);
  const googleMapRef = useRef(null);
  const routePolylineRef = useRef(null);
  const routeCasingPolylineRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const pickupMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);

  const normStatus = String(trip?.status || '').toLowerCase().trim();
  const isOnTrip = ['inprogress', 'started', 'in_progress', 'trip_started'].includes(normStatus);
  const isApproachingPickup = !isOnTrip && ['accepted', 'pickup_arrived', 'ready_to_start', 'driver_assigned', 'on_the_way', 'arrived', 'scheduled'].includes(normStatus);
  const driverLive = trip?.driverCoords;

  const prevApproachingRef = useRef(isApproachingPickup);

  // Passenger Pickup Coordinates
  const pickupCoords = useMemo(() => {
    if (trip?.pickupCoords?.lat && trip?.pickupCoords?.lng) {
      return { lat: Number(trip.pickupCoords.lat), lng: Number(trip.pickupCoords.lng) };
    }
    if (trip?.car?.pickupCoords?.lat && trip?.car?.pickupCoords?.lng) {
      return { lat: Number(trip.car.pickupCoords.lat), lng: Number(trip.car.pickupCoords.lng) };
    }
    return { lat: 10.0245, lng: 76.3075 };
  }, [trip?.pickupCoords, trip?.car?.pickupCoords]);

  // Passenger Drop / Destination Coordinates
  const dropCoords = useMemo(() => {
    if (trip?.dropCoords?.lat && trip?.dropCoords?.lng) {
      return { lat: Number(trip.dropCoords.lat), lng: Number(trip.dropCoords.lng) };
    }
    if (trip?.car?.dropCoords?.lat && trip?.car?.dropCoords?.lng) {
      return { lat: Number(trip.car.dropCoords.lat), lng: Number(trip.car.dropCoords.lng) };
    }
    return {
      lat: Number(pickupCoords.lat) + 0.012,
      lng: Number(pickupCoords.lng) + 0.009
    };
  }, [trip?.dropCoords, trip?.car?.dropCoords, pickupCoords.lat, pickupCoords.lng]);

  // Dynamic Route Origin & Destination:
  // - Phase 1 (Driver Accepted -> Arrived / Ready to Start): Route is Driver Mobile GPS -> Pickup Location
  // - Phase 2 (Trip Started / In-Progress): Route is Pickup Location -> User Destination
  const originCoords = useMemo(() => {
    if (isApproachingPickup) {
      if (driverLive?.lat && driverLive?.lng) {
        return { lat: Number(driverLive.lat), lng: Number(driverLive.lng) };
      }
      return {
        lat: Number(pickupCoords.lat) - 0.0105,
        lng: Number(pickupCoords.lng) - 0.0082
      };
    }
    // Phase 2: Route begins from user pickup location
    return pickupCoords;
  }, [isApproachingPickup, driverLive?.lat, driverLive?.lng, pickupCoords]);

  const destCoords = useMemo(() => {
    if (isApproachingPickup) {
      // Phase 1: Destination is user pickup location
      return pickupCoords;
    }
    // Phase 2: Destination is user drop-off destination
    return dropCoords;
  }, [isApproachingPickup, pickupCoords, dropCoords]);

  const originName = useMemo(() => {
    if (isApproachingPickup) {
      return 'Driver Location';
    }
    return trip?.pickup || 'Pickup Location';
  }, [isApproachingPickup, trip?.pickup]);

  const destName = useMemo(() => {
    if (isApproachingPickup) {
      return trip?.pickup || 'Pickup Location';
    }
    return trip?.drop_loc || trip?.drop || 'Destination';
  }, [isApproachingPickup, trip?.pickup, trip?.drop_loc, trip?.drop]);

  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.getAttribute('data-theme') === 'dark' ||
        document.body?.getAttribute('data-theme') === 'dark';
    }
    return false;
  });

  // Track app light/dark theme preference and update Google Map styling
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const checkDark = () => {
      const dark = document.documentElement.getAttribute('data-theme') === 'dark' ||
        document.body?.getAttribute('data-theme') === 'dark';
      setIsDarkTheme(dark);
      if (googleMapRef.current && window.google?.maps) {
        googleMapRef.current.setOptions({
          styles: dark ? TRACKING_MAP_DARK_STYLE : TRACKING_MAP_LIGHT_STYLE
        });
      }
    };
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    if (document.body) {
      observer.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
    }
    return () => observer.disconnect();
  }, []);

  const [mapInstance, setMapInstance] = useState(null);
  const hasAutoFittedRef = useRef(false);
  const isUserInteractingRef = useRef(false);

  const carLat = driverLive?.lat || originCoords.lat || 10.0245;
  const carLng = driverLive?.lng || originCoords.lng || 76.3075;

  // 1. Initialize Official Google Maps Map Instance (UI controls completely disabled)
  useEffect(() => {
    let isCancelled = false;

    async function initGoogleMap() {
      if (!containerRef.current) return;
      const google = await loadGoogleMapsSdk().catch(() => window.google?.maps);
      if (isCancelled || !google || !containerRef.current) return;

      const centerLat = (originCoords.lat + destCoords.lat) / 2;
      const centerLng = (originCoords.lng + destCoords.lng) / 2;

      // Authentic Google Maps Map Instance with all default UI buttons disabled
      const map = new google.Map(containerRef.current, {
        center: { lat: centerLat, lng: centerLng },
        zoom: 14,
        mapTypeId: google.MapTypeId.ROADMAP,
        disableDefaultUI: true,
        zoomControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        rotateControl: false,
        scaleControl: false,
        clickableIcons: false,
        keyboardShortcuts: false,
        gestureHandling: isModal ? 'auto' : 'none',
        styles: isDarkTheme ? TRACKING_MAP_DARK_STYLE : TRACKING_MAP_LIGHT_STYLE
      });

      // Dynamically scale polyline thickness when user zooms so the road line stays crisp and proportional
      const updatePolylineWeight = () => {
        const z = map.getZoom() || 14;
        let strokeW = 4;
        let casingW = 6.5;
        if (z <= 12) {
          strokeW = 3.5;
          casingW = 5.5;
        } else if (z === 13 || z === 14) {
          strokeW = 4.5;
          casingW = 7;
        } else if (z === 15 || z === 16) {
          strokeW = 5.5;
          casingW = 8.5;
        } else if (z >= 17) {
          strokeW = 7;
          casingW = 10.5;
        }
        if (routePolylineRef.current) {
          routePolylineRef.current.setOptions({ strokeWeight: strokeW });
        }
        if (routeCasingPolylineRef.current) {
          routeCasingPolylineRef.current.setOptions({ strokeWeight: casingW });
        }
      };

      map.addListener('zoom_changed', updatePolylineWeight);
      map.addListener('dragstart', () => { isUserInteractingRef.current = true; });

      googleMapRef.current = map;
      setMapInstance(map);

      // Official Google Maps Pickup Marker (Green Location Pin)
      pickupMarkerRef.current = new google.Marker({
        position: { lat: pickupCoords.lat, lng: pickupCoords.lng },
        map,
        title: 'Pickup Location',
        zIndex: 10,
        icon: getGreenPickupPin(google)
      });

      // Official Google Maps Destination Marker (Red Location Pin, rendered during in-progress trip)
      destMarkerRef.current = new google.Marker({
        position: { lat: dropCoords.lat, lng: dropCoords.lng },
        map: isApproachingPickup ? null : map,
        title: 'Destination',
        zIndex: 10,
        icon: getRedDestinationPin(google)
      });

      // Official Google Maps Driver Vehicle Live Marker (Person Icon)
      driverMarkerRef.current = new google.Marker({
        position: { lat: carLat, lng: carLng },
        map,
        title: 'Driver Location',
        zIndex: 20,
        icon: getDriverPersonIcon(google)
      });
    }

    initGoogleMap();

    return () => {
      isCancelled = true;
      if (routeCasingPolylineRef.current) {
        routeCasingPolylineRef.current.setMap(null);
        routeCasingPolylineRef.current = null;
      }
      if (routePolylineRef.current) {
        routePolylineRef.current.setMap(null);
        routePolylineRef.current = null;
      }
      if (driverMarkerRef.current) {
        driverMarkerRef.current.setMap(null);
        driverMarkerRef.current = null;
      }
      if (pickupMarkerRef.current) {
        pickupMarkerRef.current.setMap(null);
        pickupMarkerRef.current = null;
      }
      if (destMarkerRef.current) {
        destMarkerRef.current.setMap(null);
        destMarkerRef.current = null;
      }
      googleMapRef.current = null;
      setMapInstance(null);
      hasAutoFittedRef.current = false;
      isUserInteractingRef.current = false;
    };
  }, []);

  // 2. Fetch and Draw Route Directions using Google Cloud Routes API v2
  useEffect(() => {
    if (!mapInstance || !window.google?.maps) return;
    let isSubscribed = true;

    // Reset auto-fit if transition between approaching pickup and trip inprogress occurs
    if (prevApproachingRef.current !== isApproachingPickup) {
      hasAutoFittedRef.current = false;
      prevApproachingRef.current = isApproachingPickup;
    }

    async function updateRouteDirection() {
      try {
        const result = await fetchGoogleRoadDirections({
          origin: originName,
          destination: destName,
          originCoords: originCoords,
          destCoords: destCoords
        });

        if (!isSubscribed || !mapInstance) return;

        let points = [];
        const overviewPoints = result?.overview_polyline?.points || result?.overview_polyline;
        if (typeof overviewPoints === 'string') {
          points = decodeGooglePolyline(overviewPoints);
        } else if (Array.isArray(overviewPoints)) {
          points = overviewPoints;
        } else if (Array.isArray(result?.points)) {
          points = result.points;
        }

        if (points.length >= 2 && window.google?.maps) {
          const google = window.google.maps;

          // Clear previous polylines
          if (routeCasingPolylineRef.current) {
            routeCasingPolylineRef.current.setMap(null);
          }
          if (routePolylineRef.current) {
            routePolylineRef.current.setMap(null);
          }

          const polyPath = points.map(p => new google.LatLng(Number(p.lat), Number(p.lng)));

          const currentZoom = mapInstance.getZoom() || 14;
          let strokeW = 4.5;
          let casingW = 7;
          if (currentZoom <= 12) {
            strokeW = 3.5;
            casingW = 5.5;
          } else if (currentZoom >= 17) {
            strokeW = 7;
            casingW = 10.5;
          }

          // A. Road Contour Casing
          routeCasingPolylineRef.current = new google.Polyline({
            path: polyPath,
            geodesic: true,
            strokeColor: isDarkTheme ? '#1E3A8A' : '#1558B0',
            strokeOpacity: 0.9,
            strokeWeight: casingW,
            zIndex: 1,
            map: mapInstance
          });

          // B. Real-Time Google Routes Road Line (pure solid road polyline, no direction arrows)
          routePolylineRef.current = new google.Polyline({
            path: polyPath,
            geodesic: true,
            strokeColor: isDarkTheme ? '#3B82F6' : '#1A73E8',
            strokeOpacity: 1,
            strokeWeight: strokeW,
            zIndex: 2,
            map: mapInstance
          });

          // Fit bounds so route is centered on load
          if (!hasAutoFittedRef.current && !isUserInteractingRef.current) {
            const bounds = new google.LatLngBounds();
            polyPath.forEach(pt => bounds.extend(pt));
            if (driverMarkerRef.current?.getPosition()) {
              bounds.extend(driverMarkerRef.current.getPosition());
            }
            if (pickupMarkerRef.current?.getPosition()) {
              bounds.extend(pickupMarkerRef.current.getPosition());
            }
            if (!isApproachingPickup && destMarkerRef.current?.getPosition()) {
              bounds.extend(destMarkerRef.current.getPosition());
            }
            mapInstance.fitBounds(bounds, { top: 35, right: 35, bottom: 35, left: 35 });
            hasAutoFittedRef.current = true;
          }

          if (onRouteCalculated && result) {
            onRouteCalculated({
              distanceKm: result?.distanceKm,
              durationMins: result?.durationMins,
              distanceText: result?.distanceText,
              durationText: result?.durationText
            });
          }
        }
      } catch (err) {
        console.warn('[GraphicLiveMap] Google Routes error:', err);
      }
    }

    updateRouteDirection();

    return () => { isSubscribed = false; };
  }, [
    mapInstance,
    trip?.id,
    trip?.status,
    isApproachingPickup,
    originCoords.lat,
    originCoords.lng,
    destCoords.lat,
    destCoords.lng,
    isDarkTheme
  ]);

  // 3. Keep markers synchronized if coordinates change
  useEffect(() => {
    if (!mapInstance || !window.google?.maps) return;
    const google = window.google.maps;
    if (pickupMarkerRef.current) {
      pickupMarkerRef.current.setPosition(new google.LatLng(pickupCoords.lat, pickupCoords.lng));
      pickupMarkerRef.current.setIcon(getGreenPickupPin(google));
      pickupMarkerRef.current.setMap(mapInstance);
    }
    if (destMarkerRef.current) {
      destMarkerRef.current.setPosition(new google.LatLng(dropCoords.lat, dropCoords.lng));
      destMarkerRef.current.setIcon(getRedDestinationPin(google));
      destMarkerRef.current.setMap(isApproachingPickup ? null : mapInstance);
    }
    if (driverMarkerRef.current) {
      driverMarkerRef.current.setIcon(getDriverPersonIcon(google));
    }
  }, [mapInstance, pickupCoords, dropCoords, isApproachingPickup]);

  // 4. Smooth driver vehicle GPS location updates (Person Icon)
  useEffect(() => {
    if (!driverMarkerRef.current || !window.google?.maps) return;
    try {
      const google = window.google.maps;
      driverMarkerRef.current.setPosition(new google.LatLng(carLat, carLng));
    } catch (_) {}
  }, [carLat, carLng]);

  return (
    <div
      className="graphic-live-map-clean-container"
      style={{
        position: 'relative',
        width: '100%',
        height: `${mapHeight}px`,
        borderRadius: isModal ? '20px' : '16px',
        overflow: 'hidden',
        border: '1px solid var(--line)',
        boxShadow: isDarkTheme ? '0 2px 12px rgba(0, 0, 0, 0.35)' : '0 2px 10px rgba(0, 0, 0, 0.04)',
        background: isDarkTheme ? '#242F3E' : '#E5E3DF'
      }}
      onClick={!isModal && onOpenModal ? onOpenModal : undefined}
    >
      {/* Hide all Google UI buttons, Google logo link, keyboard shortcuts, terms, and map data text */}
      <style>{`
        .graphic-live-map-clean-container .gm-style-cc,
        .graphic-live-map-clean-container .gmnoprint,
        .graphic-live-map-clean-container a[href*="maps.google.com"],
        .graphic-live-map-clean-container a[href*="google.com/maps"],
        .graphic-live-map-clean-container a[title*="Google"],
        .graphic-live-map-clean-container .gm-control-active,
        .graphic-live-map-clean-container div[aria-label="Map data"],
        .graphic-live-map-clean-container div[aria-label="Keyboard shortcuts"],
        .graphic-live-map-clean-container button[aria-label="Keyboard shortcuts"],
        .graphic-live-map-clean-container .gm-bundled-control {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
      `}</style>

      {/* Official Google Maps Viewport Container */}
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
