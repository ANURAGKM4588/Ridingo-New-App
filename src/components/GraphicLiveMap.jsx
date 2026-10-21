import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  loadGoogleMapsSdk,
  GOOGLE_MAPS_DARK_STYLE,
  fetchGoogleRoadDirections,
  decodeGooglePolyline
} from '../services/googleMapsService';

// Fallback geographic route waypoints
export const ROUTE_COORDS = [
  { lat: 10.0245, lng: 76.3075, name: 'Edappally Toll (Pickup)' },
  { lat: 10.0210, lng: 76.3088, name: 'Metro Corridor' },
  { lat: 10.0155, lng: 76.3115, name: 'Palarivattom Bypass' },
  { lat: 10.0205, lng: 76.3150, name: 'NH 66 Flyover' },
  { lat: 10.0260, lng: 76.3135, name: 'Lulu Junction' },
  { lat: 10.0285, lng: 76.3120, name: 'Lulu Mall (Destination)' }
];

export const ROUTE_PTS_MODAL = ROUTE_COORDS.map((c, i) => ({ x: 50 + i * 55, y: 220 - i * 32, name: c.name }));
export const ROUTE_PTS_MINI = ROUTE_COORDS.map((c, i) => ({ x: 60 + i * 50, y: 150 - i * 22, name: c.name }));

export function getRouteTelemetry(pts = ROUTE_COORDS, prog = 0.42) {
  prog = Math.max(0.01, Math.min(0.99, prog));
  const validPts = Array.isArray(pts) && pts.length >= 2 ? pts : ROUTE_COORDS;
  let totalLen = 0;
  const lens = [];
  for (let i = 0; i < validPts.length - 1; i++) {
    const d = Math.hypot(validPts[i + 1].lat - validPts[i].lat, validPts[i + 1].lng - validPts[i].lng);
    lens.push(d);
    totalLen += d;
  }
  const targetDist = prog * totalLen;
  let accumulated = 0;
  for (let i = 0; i < lens.length; i++) {
    if (accumulated + lens[i] >= targetDist || i === lens.length - 1) {
      const segT = (targetDist - accumulated) / (lens[i] || 1);
      const p0 = validPts[i];
      const p1 = validPts[i + 1];
      const lat = p0.lat + (p1.lat - p0.lat) * segT;
      const lng = p0.lng + (p1.lng - p0.lng) * segT;
      const angle = (Math.atan2(p1.lng - p0.lng, p1.lat - p0.lat) * 180) / Math.PI;
      return {
        lat,
        lng,
        x: Math.round(50 + (i + segT) * 20),
        y: Math.round(220 - (i + segT) * 15),
        angle: Math.round(angle),
        currentStreet: p0.name || ''
      };
    }
    accumulated += lens[i];
  }
  return { lat: validPts[0].lat, lng: validPts[0].lng, x: 50, y: 220, angle: 0, currentStreet: validPts[0].name || '' };
}

/**
 * Official Google Maps Live Tracking Component
 * Powered by Google Maps JavaScript API & Google Directions API
 * Renders authentic Google Maps UI, road-following Polyline from overview_polyline.points,
 * official Google markers, and live driver GPS location orientation.
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
  const driverMarkerRef = useRef(null);
  const pickupMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);

  const isApproachingPickup = ['accepted', 'pickup_arrived', 'ready_to_start'].includes(trip?.status);
  const isOnTrip = trip?.status === 'inprogress';
  const driverLive = trip?.driverCoords;

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

  // Dynamic Route Origin & Destination for Route Direction:
  // - Phase 1 (Driver Accepted -> Arrived): Route is Driver Mobile GPS -> Pickup Location
  // - Phase 2 (Trip Started): Route is Pickup Location -> Destination
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
  const routeCasingPolylineRef = useRef(null);
  const hasAutoFittedRef = useRef(false);
  const isUserInteractingRef = useRef(false);

  const carLat = driverLive?.lat || originCoords.lat || 10.0245;
  const carLng = driverLive?.lng || originCoords.lng || 76.3075;
  const carAngle = trip?.driverHeading !== undefined ? trip.driverHeading : 0;

  // 1. Initialize Official Google Maps Map Instance
  useEffect(() => {
    let isCancelled = false;

    async function initGoogleMap() {
      if (!containerRef.current) return;
      const google = await loadGoogleMapsSdk().catch(() => window.google?.maps);
      if (isCancelled || !google || !containerRef.current) return;

      const centerLat = (originCoords.lat + destCoords.lat) / 2;
      const centerLng = (originCoords.lng + destCoords.lng) / 2;

      // Authentic Google Maps Map Instance
      const map = new google.Map(containerRef.current, {
        center: { lat: centerLat, lng: centerLng },
        zoom: 14,
        mapTypeId: google.MapTypeId.ROADMAP,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
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

      // Official Google Maps Pickup Marker
      pickupMarkerRef.current = new google.Marker({
        position: { lat: pickupCoords.lat, lng: pickupCoords.lng },
        map,
        title: 'Pickup Location',
        zIndex: 10,
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
          scaledSize: new google.Size(36, 36)
        }
      });

      // Official Google Maps Destination Marker (rendered during active ride)
      destMarkerRef.current = new google.Marker({
        position: { lat: dropCoords.lat, lng: dropCoords.lng },
        map: isApproachingPickup ? null : map,
        title: 'Destination',
        zIndex: 10,
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
          scaledSize: new google.Size(36, 36)
        }
      });

      // Official Google Maps Driver Vehicle Live Marker with directional symbol arrow
      driverMarkerRef.current = new google.Marker({
        position: { lat: carLat, lng: carLng },
        map,
        title: 'Driver Location',
        zIndex: 20,
        icon: {
          path: google.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 6,
          rotation: carAngle,
          fillColor: '#1A73E8',
          fillOpacity: 1,
          strokeWeight: 2.5,
          strokeColor: '#FFFFFF'
        }
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

  // 2. Fetch and Draw Route Directions using Google Maps Directions API & overview_polyline.points
  useEffect(() => {
    if (!mapInstance || !window.google?.maps) return;
    let isSubscribed = true;

    async function updateRouteDirection() {
      try {
        const result = await fetchGoogleRoadDirections({
          origin: originName,
          destination: destName,
          originCoords: originCoords,
          destCoords: destCoords
        });

        if (!isSubscribed || !mapInstance) return;

        // Use overview_polyline.points from Google Maps Directions API response
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

          // A. Google Maps Navigation Route Casing (darker road contour)
          routeCasingPolylineRef.current = new google.Polyline({
            path: polyPath,
            geodesic: true,
            strokeColor: isDarkTheme ? '#1E3A8A' : '#1558B0',
            strokeOpacity: 0.9,
            strokeWeight: casingW,
            zIndex: 1,
            map: mapInstance
          });

          // B. Google Maps Navigation Route Line with official road direction forward arrows
          routePolylineRef.current = new google.Polyline({
            path: polyPath,
            geodesic: true,
            strokeColor: isDarkTheme ? '#3B82F6' : '#1A73E8',
            strokeOpacity: 1,
            strokeWeight: strokeW,
            zIndex: 2,
            icons: [{
              icon: {
                path: google.SymbolPath.FORWARD_OPEN_ARROW,
                scale: 2,
                strokeColor: '#FFFFFF',
                strokeWeight: 1.5
              },
              offset: '25px',
              repeat: '70px'
            }],
            map: mapInstance
          });

          // Fit bounds so route between driver / pickup and destination is centered on first load
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
        console.warn('[GraphicLiveMap] Google Directions route error:', err);
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
    }
    if (destMarkerRef.current) {
      destMarkerRef.current.setPosition(new google.LatLng(dropCoords.lat, dropCoords.lng));
      destMarkerRef.current.setMap(isApproachingPickup ? null : mapInstance);
    }
  }, [mapInstance, pickupCoords, dropCoords, isApproachingPickup]);

  // 4. Smooth driver vehicle GPS location & rotation updates
  useEffect(() => {
    if (!driverMarkerRef.current || !window.google?.maps) return;
    try {
      const google = window.google.maps;
      driverMarkerRef.current.setPosition(new google.LatLng(carLat, carLng));
      driverMarkerRef.current.setIcon({
        path: google.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 6,
        rotation: carAngle,
        fillColor: '#1A73E8',
        fillOpacity: 1,
        strokeWeight: 2.5,
        strokeColor: '#FFFFFF'
      });
    } catch (_) {}
  }, [carLat, carLng, carAngle]);


  return (
    <div
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
      {/* Official Google Maps Viewport Container */}
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
