import React, { useState, useRef, useEffect, useMemo } from 'react';
import L from 'leaflet';
import Icon from './Icon';
import {
  GOOGLE_MAP_TILES,
  openInGoogleMaps,
  fetchGoogleRoadDirections,
  getCachedRoadDirections
} from '../services/googleMapsService';

// Fallback geographic route waypoints for authentic Google Maps display
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

/**
 * Calculates vehicle position and rotation angle along the active road polyline
 */
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
 * Stock Google Maps Live Tracking Component
 * Powered by Google Maps Directions API & Road Network Routing
 * Renders real road-following polyline, official markers, and live vehicle orientation.
 */
export default function GraphicLiveMap({
  trip,
  isModal = false,
  height,
  progress = 0.45,
  speed = 38,
  onOpenModal
}) {
  const mapHeight = height || (isModal ? 280 : 150);
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const tileLayerRef = useRef(null);
  const carMarkerRef = useRef(null);
  const originMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const polylineOuterRef = useRef(null);
  const polylineInnerRef = useRef(null);

  const isApproachingPickup = ['accepted', 'pickup_arrived', 'ready_to_start'].includes(trip?.status);
  const isOnTrip = trip?.status === 'inprogress';
  const driverLive = trip?.driverCoords;

  // Real GPS Coordinates: Standard Route between Pickup and Destination
  // Start: Pickup Location
  // End: Destination / Drop Location
  const originCoords = useMemo(() => {
    if (trip?.pickupCoords?.lat && trip?.pickupCoords?.lng) {
      return { lat: Number(trip.pickupCoords.lat), lng: Number(trip.pickupCoords.lng) };
    }
    return { lat: 10.0245, lng: 76.3075 };
  }, [trip?.pickupCoords?.lat, trip?.pickupCoords?.lng]);

  const destCoords = useMemo(() => {
    if (trip?.dropCoords?.lat && trip?.dropCoords?.lng) {
      return { lat: Number(trip.dropCoords.lat), lng: Number(trip.dropCoords.lng) };
    }
    if (trip?.pickupCoords?.lat && trip?.pickupCoords?.lng) {
      return {
        lat: Number(trip.pickupCoords.lat) + 0.012,
        lng: Number(trip.pickupCoords.lng) + 0.009
      };
    }
    return { lat: 10.0285, lng: 76.3120 };
  }, [trip?.pickupCoords?.lat, trip?.pickupCoords?.lng, trip?.dropCoords?.lat, trip?.dropCoords?.lng]);

  const originName = trip?.pickup || 'Pickup Location';
  const destName = trip?.drop_loc || trip?.drop || 'Destination';

  // Initial road points: checks pre-attached trip points or instant cache (NEVER starts with a 2-point straight line)
  const [routePoints, setRoutePoints] = useState(() => {
    if (Array.isArray(trip?.routePoints) && trip.routePoints.length > 2) {
      return trip.routePoints;
    }
    const oCoords = (trip?.pickupCoords?.lat && trip?.pickupCoords?.lng)
      ? { lat: Number(trip.pickupCoords.lat), lng: Number(trip.pickupCoords.lng) }
      : { lat: 10.0245, lng: 76.3075 };
    const dCoords = (trip?.dropCoords?.lat && trip?.dropCoords?.lng)
      ? { lat: Number(trip.dropCoords.lat), lng: Number(trip.dropCoords.lng) }
      : (trip?.pickupCoords?.lat
          ? { lat: Number(trip.pickupCoords.lat) + 0.012, lng: Number(trip.pickupCoords.lng) + 0.009 }
          : { lat: 10.0285, lng: 76.3120 });
    const cached = getCachedRoadDirections(oCoords, dCoords, trip?.pickup, trip?.drop_loc || trip?.drop);
    if (cached?.points && cached.points.length > 2) {
      return cached.points;
    }
    return null;
  });

  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.getAttribute('data-theme') === 'dark' ||
        document.body?.getAttribute('data-theme') === 'dark';
    }
    return false;
  });

  // Observe theme changes across the app
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const checkDark = () => {
      const dark = document.documentElement.getAttribute('data-theme') === 'dark' ||
        document.body?.getAttribute('data-theme') === 'dark';
      setIsDarkTheme(dark);
    };
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    if (document.body) {
      observer.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
    }
    return () => observer.disconnect();
  }, []);

  // Fetch standard driving route using Google Maps Directions Service
  useEffect(() => {
    let isSubscribed = true;
    async function loadRoadRoute() {
      try {
        const result = await fetchGoogleRoadDirections({
          origin: originName,
          destination: destName,
          originCoords: originCoords,
          destCoords: destCoords
        });
        if (isSubscribed && result?.points && result.points.length >= 2) {
          if (trip) trip.routePoints = result.points;
          setRoutePoints(result.points);
        }
      } catch (err) {
        console.warn('[GraphicLiveMap] Error fetching Google Maps Directions:', err);
      }
    }
    loadRoadRoute();
    return () => { isSubscribed = false; };
  }, [
    trip?.id,
    trip?.pickup,
    trip?.drop_loc,
    originName,
    destName,
    originCoords?.lat,
    originCoords?.lng,
    destCoords?.lat,
    destCoords?.lng
  ]);

  // Real Driver Mobile GPS location (or initial pickup position)
  const carLat = driverLive?.lat || originCoords.lat || 10.0245;
  const carLng = driverLive?.lng || originCoords.lng || 76.3075;
  const carAngle = trip?.driverHeading !== undefined ? trip.driverHeading : 0;

  // Initialize Map once container is ready
  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const firstPt = originCoords;
    const lastPt = destCoords;
    const centerLat = (firstPt.lat + lastPt.lat) / 2;
    const centerLng = (firstPt.lng + lastPt.lng) / 2;

    const map = L.map(containerRef.current, {
      center: [centerLat, centerLng],
      zoom: isModal ? 13 : 13,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: isModal,
      dragging: isModal,
      touchZoom: isModal,
      doubleClickZoom: isModal
    });
    mapRef.current = map;

    // Google Maps Tile Layer
    const googleCfg = GOOGLE_MAP_TILES.roadmap;
    const gLayer = L.tileLayer(googleCfg.url, {
      subdomains: googleCfg.subdomains,
      maxZoom: googleCfg.maxZoom,
      attribution: googleCfg.attribution
    }).addTo(map);
    tileLayerRef.current = gLayer;

    // Standard Google Maps Directions Route Polyline
    // STRICT RULE: Only render polyline when actual multi-point road path is loaded (>2 coordinates)
    // NEVER render a 2-point straight line!
    const hasRoadRoute = Array.isArray(routePoints) && routePoints.length > 2;
    const latlngs = hasRoadRoute ? routePoints.map(p => [p.lat, p.lng]) : [];
    
    // Google Maps subtle road casing for contrast
    const polyOuter = L.polyline(latlngs, {
      color: isDarkTheme ? '#1E3A8A' : '#1A73E8',
      weight: 7,
      opacity: 0.35,
      lineJoin: 'round',
      lineCap: 'round'
    }).addTo(map);
    polylineOuterRef.current = polyOuter;

    // Standard Google Maps driving blue route
    const polyInner = L.polyline(latlngs, {
      color: isDarkTheme ? '#3B82F6' : '#4285F4',
      weight: 5,
      opacity: 0.95,
      lineJoin: 'round',
      lineCap: 'round'
    }).addTo(map);
    polylineInnerRef.current = polyInner;

    // Proper Google Maps Start Marker (Pickup Location - Green Pin)
    const originIcon = L.divIcon({
      className: 'gmap-origin-marker',
      html: `
        <div style="display:flex; flex-direction:column; align-items:center; transform:translateY(-14px);">
          <svg width="24" height="30" viewBox="0 0 24 30" fill="none" style="filter: drop-shadow(0 2px 5px rgba(0,0,0,0.35));">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 7.8 12 18 12 18s12-10.2 12-18c0-6.63-5.37-12-12-12z" fill="#0F9D58"/>
            <circle cx="12" cy="11.5" r="4.5" fill="#FFFFFF"/>
            <circle cx="12" cy="11.5" r="2.2" fill="#0F9D58"/>
          </svg>
        </div>
      `,
      iconSize: [24, 30],
      iconAnchor: [12, 28]
    });
    originMarkerRef.current = L.marker([firstPt.lat, firstPt.lng], { icon: originIcon }).addTo(map);

    // Proper Google Maps End Marker (Destination Location - Red Pin)
    const destIcon = L.divIcon({
      className: 'gmap-dest-marker',
      html: `
        <div style="display:flex; flex-direction:column; align-items:center; transform:translateY(-14px);">
          <svg width="24" height="30" viewBox="0 0 24 30" fill="none" style="filter: drop-shadow(0 2px 5px rgba(0,0,0,0.35));">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 7.8 12 18 12 18s12-10.2 12-18c0-6.63-5.37-12-12-12z" fill="#EA4335"/>
            <circle cx="12" cy="11.5" r="4.5" fill="#FFFFFF"/>
            <circle cx="12" cy="11.5" r="2.2" fill="#B31412"/>
          </svg>
        </div>
      `,
      iconSize: [24, 30],
      iconAnchor: [12, 28]
    });
    destMarkerRef.current = L.marker([lastPt.lat, lastPt.lng], { icon: destIcon }).addTo(map);

    // Live Driver Vehicle Puck (Luxury Minimalist Design)
    const carAccentColor = isOnTrip ? '#22C55E' : '#EAB308';
    const carIcon = L.divIcon({
      className: 'gmap-car-marker',
      html: `
        <div style="position:relative; width:34px; height:34px; display:flex; align-items:center; justify-content:center;">
          <div style="position:absolute; inset:-3px; border-radius:50%; background:${carAccentColor}33; animation:pulse 2s infinite;"></div>
          <div style="transform: rotate(${carAngle || 0}deg); width:28px; height:28px; background:#0F172A; border:2px solid ${carAccentColor}; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 3px 10px rgba(0,0,0,0.35); transition: transform 0.25s ease;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="${carAccentColor}">
              <polygon points="12 2 19 21 12 17 5 21 12 2"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });
    carMarkerRef.current = L.marker([carLat, carLng], { icon: carIcon }).addTo(map);

    // Fit map bounds smoothly
    if (latlngs.length >= 2) {
      map.fitBounds(L.latLngBounds(latlngs), { padding: [24, 24] });
    } else {
      map.fitBounds(L.latLngBounds([
        [originCoords.lat, originCoords.lng],
        [destCoords.lat, destCoords.lng]
      ]), { padding: [24, 24] });
    }

    // Invalidate size after container settles
    const tId = setTimeout(() => {
      try {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
          if (latlngs.length >= 2) {
            mapRef.current.fitBounds(L.latLngBounds(latlngs), { padding: [24, 24] });
          } else {
            mapRef.current.fitBounds(L.latLngBounds([
              [originCoords.lat, originCoords.lng],
              [destCoords.lat, destCoords.lng]
            ]), { padding: [24, 24] });
          }
        }
      } catch (_) {}
    }, 150);

    return () => {
      clearTimeout(tId);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Real-time vehicle GPS tracking updates
  useEffect(() => {
    if (!carMarkerRef.current || !carLat || !carLng) return;
    try {
      carMarkerRef.current.setLatLng([carLat, carLng]);
      const el = carMarkerRef.current.getElement();
      if (el) {
        const iconDiv = el.querySelector('div > div:nth-child(2)');
        if (iconDiv) {
          iconDiv.style.transform = `rotate(${carAngle}deg)`;
        }
      }
    } catch (_) {}
  }, [carLat, carLng, carAngle]);

  // Update polyline and markers when routePoints update from directions API
  // STRICT RULE: Only draw polyline if routePoints has > 2 coordinates (real road curve, never a 2-point straight line)
  useEffect(() => {
    if (!mapRef.current || !routePoints || routePoints.length <= 2) return;
    const latlngs = routePoints.map(p => [p.lat, p.lng]);
    if (polylineOuterRef.current) {
      polylineOuterRef.current.setLatLngs(latlngs);
    }
    if (polylineInnerRef.current) {
      polylineInnerRef.current.setLatLngs(latlngs);
    }
    const first = routePoints[0];
    const last = routePoints[routePoints.length - 1];
    if (originMarkerRef.current && first) {
      originMarkerRef.current.setLatLng([first.lat, first.lng]);
    }
    if (destMarkerRef.current && last) {
      destMarkerRef.current.setLatLng([last.lat, last.lng]);
    }
    try {
      mapRef.current.fitBounds(L.latLngBounds(latlngs), { padding: [24, 24] });
    } catch (e) {}
  }, [routePoints]);

  // Update polyline colors when theme changes
  useEffect(() => {
    if (polylineOuterRef.current) {
      polylineOuterRef.current.setStyle({ color: isDarkTheme ? '#1E3A8A' : '#1A73E8' });
    }
    if (polylineInnerRef.current) {
      polylineInnerRef.current.setStyle({ color: isDarkTheme ? '#3B82F6' : '#4285F4' });
    }
  }, [isDarkTheme]);

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
        background: isDarkTheme ? '#141519' : '#EDEEF2'
      }}
      onClick={!isModal && onOpenModal ? onOpenModal : undefined}
    >
      {/* Map Leaflet Container with theme class */}
      <div
        ref={containerRef}
        className={`gmap-container ${isDarkTheme ? 'gmap-dark-mode' : 'gmap-light-mode'}`}
        style={{ width: '100%', height: '100%' }}
      />

      {/* Minimal Top-Right Status Badge (Zero AI Clutter, only in full modal) */}
      {isModal && (
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            zIndex: 400,
            background: isDarkTheme ? 'rgba(15, 23, 42, 0.82)' : 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(8px)',
            color: isDarkTheme ? '#F8FAFC' : '#0F172A',
            fontSize: '11px',
            fontWeight: 800,
            padding: '4px 10px',
            borderRadius: '999px',
            display: 'flex',
            alignItems: 'center',
            gap: '5.5px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            border: '1px solid var(--line)',
            pointerEvents: 'none',
            letterSpacing: '0.02em'
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: isOnTrip ? '#22C55E' : '#EAB308',
              boxShadow: `0 0 6px ${isOnTrip ? '#22C55E' : '#EAB308'}`
            }}
          />
          <span>{isOnTrip ? 'Live Trip' : isApproachingPickup ? 'Driver On Way' : 'Live Route'}</span>
        </div>
      )}

      {/* Stock Google Maps Zoom Controls only in full modal */}
      {isModal && (
        <div className="gmap-stock-zoom-ctrl" style={{ bottom: '12px', right: '10px' }} onClick={e => e.stopPropagation()}>
          <button
            type="button"
            className="gmap-stock-zoom-btn"
            onClick={() => mapRef.current?.zoomIn()}
            title="Zoom in"
          >
            +
          </button>
          <div className="gmap-stock-zoom-divider" />
          <button
            type="button"
            className="gmap-stock-zoom-btn"
            onClick={() => mapRef.current?.zoomOut()}
            title="Zoom out"
          >
            −
          </button>
        </div>
      )}
    </div>
  );
}
