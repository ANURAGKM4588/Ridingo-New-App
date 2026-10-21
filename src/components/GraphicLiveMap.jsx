import React, { useState, useRef, useEffect, useMemo } from 'react';
import Icon from './Icon';
import {
  loadGoogleMapsSdk,
  GOOGLE_MAPS_DARK_STYLE,
  fetchGoogleRoadDirections,
  decodeGooglePolyline
} from '../services/googleMapsService';

// Authentic Google Maps Live Tracking Component - Pure Google Cloud Routes API v2

function ManeuverDirectionIcon({ maneuver = 'STRAIGHT', size = 20, color = '#FFFFFF' }) {
  const m = String(maneuver || '').toUpperCase();
  if (m.includes('LEFT')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18l-5-5 5-5" />
        <path d="M4 13h11a5 5 0 0 0 5-5V4" />
      </svg>
    );
  }
  if (m.includes('RIGHT')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 18l5-5-5-5" />
        <path d="M20 13H9a5 5 0 0 1-5-5V4" />
      </svg>
    );
  }
  if (m.includes('UTURN')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 10l-4 4 4 4" />
        <path d="M5 14h10a5 5 0 0 0 5-5 5 5 0 0 0-5-5H8" />
      </svg>
    );
  }
  if (m.includes('ROUNDABOUT')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M16 8l3-3-3-3" />
        <path d="M19 5a9 9 0 0 0-14 7" />
      </svg>
    );
  }
  if (m.includes('MERGE') || m.includes('FORK')) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v18" />
        <path d="M18 9l-6-6-6 6" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5" />
      <path d="M5 12l7-7 7 7" />
    </svg>
  );
}

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
  const [showTurnSteps, setShowTurnSteps] = useState(false);

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
  const [navigationHud, setNavigationHud] = useState(null);
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
        setNavigationHud(result);

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


  const handleRecenter = (e) => {
    if (e) e.stopPropagation();
    if (!mapInstance || !window.google?.maps) return;
    isUserInteractingRef.current = false;
    const google = window.google.maps;
    const bounds = new google.LatLngBounds();
    if (driverMarkerRef.current?.getPosition()) {
      bounds.extend(driverMarkerRef.current.getPosition());
    } else {
      bounds.extend(new google.LatLng(carLat, carLng));
    }
    bounds.extend(new google.LatLng(destCoords.lat, destCoords.lng));
    mapInstance.fitBounds(bounds, { top: 40, right: 30, bottom: 40, left: 30 });
  };

  const navStep = navigationHud?.currentStep;
  const allSteps = navigationHud?.steps || [];

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

      {/* Official Google Maps Real-Time Direction Navigation UI (from Google Routes API v2) */}
      {navStep?.instruction && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            right: '10px',
            zIndex: 10,
            background: isDarkTheme ? '#0F5132' : '#0F9D58',
            color: '#FFFFFF',
            borderRadius: '14px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}
          onClick={(e) => {
            if (isModal && allSteps.length > 1) {
              e.stopPropagation();
              setShowTurnSteps(!showTurnSteps);
            }
          }}
        >
          {/* Authentic Maneuver Icon */}
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(0, 0, 0, 0.22)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              flexShrink: 0
            }}
          >
            <ManeuverDirectionIcon maneuver={navStep.maneuver} size={20} color="#FFFFFF" />
          </div>

          {/* Navigation Instruction & Distance to Turn */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {navStep.distance && (
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                  color: 'rgba(255, 255, 255, 0.9)'
                }}
              >
                In {navStep.distance}
              </div>
            )}
            <div
              style={{
                fontSize: '13.5px',
                fontWeight: 750,
                color: '#FFFFFF',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: 1.25,
                marginTop: '1px'
              }}
            >
              {navStep.instruction}
            </div>
            <div
              style={{
                fontSize: '11px',
                color: 'rgba(255, 255, 255, 0.8)',
                fontWeight: 600,
                marginTop: '2px'
              }}
            >
              {navigationHud.durationText ? `${navigationHud.durationText} remaining` : ''}
              {navigationHud.distanceText ? ` · ${navigationHud.distanceText}` : ''}
            </div>
          </div>

          {/* Step list toggle arrow when multiple steps exist in modal mode */}
          {isModal && allSteps.length > 1 && (
            <div
              style={{
                padding: '4px 6px',
                borderRadius: '8px',
                background: 'rgba(0, 0, 0, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              <span>{allSteps.length} turns</span>
              <Icon name={showTurnSteps ? 'chevron-up' : 'chevron-down'} size={14} color="#FFFFFF" />
            </div>
          )}
        </div>
      )}

      {/* Expandable Real-Time Google Routes Turn-by-Turn Steps Drawer */}
      {isModal && showTurnSteps && allSteps.length > 1 && (
        <div
          style={{
            position: 'absolute',
            top: '74px',
            left: '10px',
            right: '10px',
            maxHeight: '170px',
            overflowY: 'auto',
            zIndex: 15,
            background: isDarkTheme ? '#1E293B' : '#FFFFFF',
            borderRadius: '14px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
            border: '1px solid var(--line)',
            padding: '8px 12px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 800,
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '6px',
              paddingBottom: '4px',
              borderBottom: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span>Google Route Directions</span>
            <span style={{ cursor: 'pointer', color: 'var(--primary)' }} onClick={() => setShowTurnSteps(false)}>Close</span>
          </div>
          {allSteps.map((step, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '6px 0',
                borderBottom: idx < allSteps.length - 1 ? '1px solid var(--line)' : 'none'
              }}
            >
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '6px',
                  background: isDarkTheme ? '#334155' : '#E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <ManeuverDirectionIcon maneuver={step.maneuver} size={14} color={isDarkTheme ? '#F8FAFC' : '#1E293B'} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', fontWeight: 650, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {step.instruction}
                </div>
                {step.distance && (
                  <div style={{ fontSize: '10.5px', color: 'var(--muted)', fontWeight: 500 }}>
                    {step.distance} {step.duration ? `· ${step.duration}` : ''}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Google Maps Style Floating Re-Center Button */}
      {isModal && (
        <button
          type="button"
          onClick={handleRecenter}
          aria-label="Re-center Map"
          style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            width: '38px',
            height: '38px',
            borderRadius: '999px',
            background: isDarkTheme ? '#1E293B' : '#FFFFFF',
            color: isDarkTheme ? '#FFFFFF' : '#1E293B',
            border: '1px solid var(--line)',
            boxShadow: '0 3px 12px rgba(0, 0, 0, 0.22)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
            padding: 0
          }}
        >
          <Icon name="navigation" size={17} color={isDarkTheme ? '#60A5FA' : '#1A73E8'} />
        </button>
      )}
    </div>
  );
}
