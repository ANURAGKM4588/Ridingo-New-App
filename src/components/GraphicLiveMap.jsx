import React, { useState, useRef, useEffect, useMemo } from 'react';
import L from 'leaflet';
import Icon from './Icon';
import { GOOGLE_MAP_TILES, openInGoogleMaps, fetchGoogleRoadDirections } from '../services/googleMapsService';

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
  const mapHeight = height || (isModal ? 280 : 190);
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const tileLayerRef = useRef(null);
  const carMarkerRef = useRef(null);
  const originMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const polylineOuterRef = useRef(null);
  const polylineInnerRef = useRef(null);

  const [routePoints, setRoutePoints] = useState(() => {
    if (trip?.pickupCoords?.lat && trip?.dropCoords?.lat) {
      return [
        { lat: trip.pickupCoords.lat, lng: trip.pickupCoords.lng },
        { lat: trip.dropCoords.lat, lng: trip.dropCoords.lng }
      ];
    }
    return ROUTE_COORDS;
  });

  const [mapType, setMapType] = useState('roadmap'); // 'roadmap' | 'hybrid'
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

  const isApproachingPickup = ['accepted', 'pickup_arrived', 'ready_to_start'].includes(trip?.status);
  const driverLive = trip?.driverCoords;

  const originCoords = isApproachingPickup
    ? (driverLive?.lat && driverLive?.lng ? driverLive : trip?.pickupCoords)
    : (driverLive?.lat && driverLive?.lng ? driverLive : trip?.pickupCoords);

  const destCoords = isApproachingPickup
    ? trip?.pickupCoords
    : (trip?.dropCoords || trip?.pickupCoords);

  const originName = isApproachingPickup
    ? (driverLive?.lat ? (trip?.driver || 'Chauffeur Location') : trip?.pickup)
    : trip?.pickup;

  const destName = isApproachingPickup
    ? trip?.pickup
    : (trip?.drop_loc || trip?.pickup);

  // Fetch pure and perfect road directions from Google Maps API / Road Network Router
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
          setRoutePoints(result.points);
        }
      } catch (err) {
        console.warn('[GraphicLiveMap] Error fetching road directions:', err);
      }
    }
    loadRoadRoute();
    return () => { isSubscribed = false; };
  }, [
    trip?.id,
    trip?.status,
    originName,
    destName,
    originCoords?.lat,
    originCoords?.lng,
    destCoords?.lat,
    destCoords?.lng
  ]);

  const geom = useMemo(() => getRouteTelemetry(routePoints, progress), [routePoints, progress]);
  const carLat = driverLive?.lat || geom.lat;
  const carLng = driverLive?.lng || geom.lng;
  const carAngle = trip?.driverHeading !== undefined ? trip.driverHeading : (geom.angle || 0);

  // Initialize stock Google Map once container is ready
  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const firstPt = routePoints[0] || ROUTE_COORDS[0];
    const lastPt = routePoints[routePoints.length - 1] || ROUTE_COORDS[ROUTE_COORDS.length - 1];
    const centerLat = (firstPt.lat + lastPt.lat) / 2;
    const centerLng = (firstPt.lng + lastPt.lng) / 2;

    const map = L.map(containerRef.current, {
      center: [centerLat, centerLng],
      zoom: isModal ? 13 : 12,
      zoomControl: false,
      attributionControl: false
    });
    mapRef.current = map;

    // Google Maps Stock Tile Layer
    const googleCfg = GOOGLE_MAP_TILES[mapType] || GOOGLE_MAP_TILES.roadmap;
    const gLayer = L.tileLayer(googleCfg.url, {
      subdomains: googleCfg.subdomains,
      maxZoom: googleCfg.maxZoom,
      attribution: googleCfg.attribution
    }).addTo(map);
    tileLayerRef.current = gLayer;

    // Google Maps Classic Blue Road Polyline
    const latlngs = routePoints.map(p => [p.lat, p.lng]);
    
    // Outer outline casing for Google Maps route
    const polyOuter = L.polyline(latlngs, {
      color: isDarkTheme ? '#0D47A1' : '#1558B0',
      weight: 7,
      opacity: 0.95,
      lineJoin: 'round',
      lineCap: 'round'
    }).addTo(map);
    polylineOuterRef.current = polyOuter;

    // Inner bright blue Google Maps route
    const polyInner = L.polyline(latlngs, {
      color: isDarkTheme ? '#4285F4' : '#1A73E8',
      weight: 5,
      opacity: 1,
      lineJoin: 'round',
      lineCap: 'round'
    }).addTo(map);
    polylineInnerRef.current = polyInner;

    // Origin Marker: Blue circular dot
    const originIcon = L.divIcon({
      className: 'gmap-origin-marker',
      html: '<div style="width:14px;height:14px;background:#1A73E8;border:3px solid #FFFFFF;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });
    originMarkerRef.current = L.marker([firstPt.lat, firstPt.lng], { icon: originIcon }).addTo(map);

    // Destination Marker: Official Google Maps Red Teardrop Pin
    const destIcon = L.divIcon({
      className: 'gmap-dest-marker',
      html: `<svg width="26" height="36" viewBox="0 0 24 34" fill="none" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35));">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 8.5 12 22 12 22s12-13.5 12-22c0-6.63-5.37-12-12-12z" fill="#EA4335"/>
        <circle cx="12" cy="11.5" r="4.2" fill="#FFFFFF"/>
        <circle cx="12" cy="11.5" r="2" fill="#B31412"/>
      </svg>`,
      iconSize: [26, 36],
      iconAnchor: [13, 36]
    });
    destMarkerRef.current = L.marker([lastPt.lat, lastPt.lng], { icon: destIcon }).addTo(map);

    // Live Moving Vehicle Marker on the Road
    const carIcon = L.divIcon({
      className: 'gmap-car-marker',
      html: `<div style="transform: rotate(${carAngle || 0}deg); width:28px; height:28px; background:#000000; border:2px solid #FFC70A; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(0,0,0,0.45); transition: transform 0.2s ease;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFC70A"><polygon points="12 2 19 21 12 17 5 21 12 2"/></svg>
      </div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
    carMarkerRef.current = L.marker([carLat, carLng], { icon: carIcon }).addTo(map);

    // Fit map bounds smoothly
    if (latlngs.length >= 2) {
      map.fitBounds(L.latLngBounds(latlngs), { padding: [32, 32] });
    }

    return () => {
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
        const iconDiv = el.querySelector('div');
        if (iconDiv) {
          iconDiv.style.transform = `rotate(${carAngle}deg)`;
        }
      }
    } catch (_) {}
  }, [carLat, carLng, carAngle]);

  // Update polyline and markers when routePoints update from directions API
  useEffect(() => {
    if (!mapRef.current || !routePoints || routePoints.length < 2) return;
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
      mapRef.current.fitBounds(L.latLngBounds(latlngs), { padding: [32, 32] });
    } catch (e) {}
  }, [routePoints]);

  // Update polyline colors when theme changes
  useEffect(() => {
    if (polylineOuterRef.current) {
      polylineOuterRef.current.setStyle({ color: isDarkTheme ? '#0D47A1' : '#1558B0' });
    }
    if (polylineInnerRef.current) {
      polylineInnerRef.current.setStyle({ color: isDarkTheme ? '#4285F4' : '#1A73E8' });
    }
  }, [isDarkTheme]);

  // Update tile layer when mapType toggles
  useEffect(() => {
    if (mapRef.current && tileLayerRef.current) {
      const map = mapRef.current;
      try {
        map.removeLayer(tileLayerRef.current);
      } catch (e) {}
      const googleCfg = GOOGLE_MAP_TILES[mapType] || GOOGLE_MAP_TILES.roadmap;
      const newLayer = L.tileLayer(googleCfg.url, {
        subdomains: googleCfg.subdomains,
        maxZoom: googleCfg.maxZoom,
        attribution: googleCfg.attribution
      }).addTo(map);
      tileLayerRef.current = newLayer;
    }
  }, [mapType]);

  const isSatelliteMode = mapType === 'satellite' || mapType === 'hybrid';

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: `${mapHeight}px`,
        borderRadius: isModal ? '20px' : '16px',
        overflow: 'hidden',
        border: '1.5px solid var(--line)',
        boxShadow: isDarkTheme ? '0 4px 18px rgba(0, 0, 0, 0.4)' : '0 4px 18px rgba(0, 0, 0, 0.08)',
        background: isDarkTheme ? '#141519' : '#EDEEF2'
      }}
      onClick={!isModal && onOpenModal ? onOpenModal : undefined}
    >
      {/* Map Leaflet Container with theme class and satellite exclusion */}
      <div
        ref={containerRef}
        className={`gmap-container ${isSatelliteMode ? 'layer-satellite' : ''} ${isDarkTheme ? 'gmap-dark-mode' : 'gmap-light-mode'}`}
        style={{ width: '100%', height: '100%' }}
      />

      {/* Stock Google Maps [Map | Satellite] Switcher */}
      <div className="gmap-stock-type-ctrl" style={{ top: '8px', left: '8px' }} onClick={e => e.stopPropagation()}>
        <button
          type="button"
          className={`gmap-stock-type-btn ${mapType === 'roadmap' ? 'active' : ''}`}
          onClick={() => setMapType('roadmap')}
        >
          Map
        </button>
        <button
          type="button"
          className={`gmap-stock-type-btn ${mapType === 'hybrid' ? 'active' : ''}`}
          onClick={() => setMapType('hybrid')}
        >
          Satellite
        </button>
      </div>

      {/* Stock Google Maps Watermark Logo */}
      <div className="gmap-stock-logo" style={{ bottom: '6px', left: '8px' }}>
        <span style={{ fontSize: '11px', fontWeight: 800, color: '#4285F4' }}>G</span>
        <span style={{ fontSize: '11px', fontWeight: 800, color: '#EA4335' }}>o</span>
        <span style={{ fontSize: '11px', fontWeight: 800, color: '#FBBC05' }}>o</span>
        <span style={{ fontSize: '11px', fontWeight: 800, color: '#4285F4' }}>g</span>
        <span style={{ fontSize: '11px', fontWeight: 800, color: '#34A853' }}>l</span>
        <span style={{ fontSize: '11px', fontWeight: 800, color: '#EA4335' }}>e</span>
      </div>

      {/* Stock Google Maps Zoom Controls */}
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

      {/* Mini Overlay Button: Tap to open fullscreen tracker */}
      {!isModal && (
        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            zIndex: 400,
            background: isDarkTheme ? '#202124' : '#000000',
            color: '#FFFFFF',
            fontSize: '11.5px',
            fontWeight: 700,
            padding: '5px 12px',
            borderRadius: '999px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.45)',
            border: isDarkTheme ? '1px solid rgba(255, 255, 255, 0.15)' : 'none',
            cursor: 'pointer'
          }}
        >
          <span>Live Tracking</span>
        </div>
      )}
    </div>
  );
}
