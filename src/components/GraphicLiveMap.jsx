import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  loadGoogleMapsSdk,
  GOOGLE_MAPS_DARK_STYLE,
  fetchGoogleRoadDirections,
  decodeGooglePolyline
} from '../services/googleMapsService';

function getDriverPersonIcon(google) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
      <defs>
        <filter id="d-sh" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" flood-color="#000000" flood-opacity="0.4"/>
        </filter>
      </defs>
      <!-- Outer white halo with shadow -->
      <circle cx="22" cy="22" r="20" fill="#FFFFFF" stroke="rgba(0,0,0,0.08)" stroke-width="1" filter="url(#d-sh)"/>
      <!-- Inner vibrant blue driver badge -->
      <circle cx="22" cy="22" r="17.5" fill="#1A73E8"/>
      <!-- Person Head -->
      <circle cx="22" cy="15" r="4.8" fill="#FFFFFF"/>
      <!-- Person Torso / Shoulders -->
      <path d="M13 29.5c0-4.2 4-6.8 9-6.8s9 2.6 9 6.8v1H13v-1z" fill="#FFFFFF"/>
    </svg>
  `.trim();

  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: new google.Size(44, 44),
    anchor: new google.Point(22, 22)
  };
}

function getGreenPickupPin(google) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="38" height="50" viewBox="0 0 38 50">
      <defs>
        <filter id="p-sh" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000000" flood-opacity="0.35"/>
        </filter>
      </defs>
      <!-- Green Location Pin pointing down -->
      <path d="M19 2C10.16 2 3 9.16 3 18c0 13.5 14.5 29.5 15.3 30.3.4.4 1 .4 1.4 0C20.5 47.5 35 31.5 35 18 35 9.16 27.84 2 19 2z" fill="#10B981" stroke="#FFFFFF" stroke-width="2.5" filter="url(#p-sh)"/>
      <!-- Inner white dot -->
      <circle cx="19" cy="18" r="6.5" fill="#FFFFFF"/>
    </svg>
  `.trim();

  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: new google.Size(38, 50),
    anchor: new google.Point(19, 49)
  };
}

function getRedDestinationPin(google) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="38" height="50" viewBox="0 0 38 50">
      <defs>
        <filter id="r-sh" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000000" flood-opacity="0.35"/>
        </filter>
      </defs>
      <!-- Red Location Pin pointing down -->
      <path d="M19 2C10.16 2 3 9.16 3 18c0 13.5 14.5 29.5 15.3 30.3.4.4 1 .4 1.4 0C20.5 47.5 35 31.5 35 18 35 9.16 27.84 2 19 2z" fill="#EF4444" stroke="#FFFFFF" stroke-width="2.5" filter="url(#r-sh)"/>
      <!-- Inner white dot -->
      <circle cx="19" cy="18" r="6.5" fill="#FFFFFF"/>
    </svg>
  `.trim();

  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: new google.Size(38, 50),
    anchor: new google.Point(19, 49)
  };
}

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
  onOpenModal
}) {
  const mapHeight = height || (isModal ? 280 : 150);
  const containerRef = useRef(null);
  const googleMapRef = useRef(null);
  const routePolylineRef = useRef(null);
  const routeCasingPolylineRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const pickupMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);

  const isApproachingPickup = ['accepted', 'pickup_arrived', 'ready_to_start'].includes(trip?.status);
  const isOnTrip = trip?.status === 'inprogress';
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
  // - Phase 1 (Driver Accepted -> Arrived): Route is Driver Mobile GPS -> Pickup Location
  // - Phase 2 (Trip Started / In-Progress): Route is Pickup Location -> Destination
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
    return pickupCoords;
  }, [isApproachingPickup, driverLive?.lat, driverLive?.lng, pickupCoords]);

  const destCoords = useMemo(() => {
    if (isApproachingPickup) {
      return pickupCoords;
    }
    return dropCoords;
  }, [isApproachingPickup, pickupCoords, dropCoords]);

  const originName = useMemo(() => {
    if (isApproachingPickup) {
      return trip?.driver ? `${trip.driver} Location` : 'Driver Location';
    }
    return trip?.pickup || 'Pickup Location';
  }, [isApproachingPickup, trip?.driver, trip?.pickup]);

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
          styles: dark ? GOOGLE_MAPS_DARK_STYLE : []
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
        styles: isDarkTheme ? GOOGLE_MAPS_DARK_STYLE : []
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
            mapInstance.fitBounds(bounds, { top: 30, right: 30, bottom: 30, left: 30 });
            hasAutoFittedRef.current = true;
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
