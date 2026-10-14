import React, { useState, useRef, useEffect } from 'react';
import L from 'leaflet';
import Icon from './Icon';
import { GOOGLE_MAP_TILES, openInGoogleMaps } from '../services/googleMapsService';

// Real Kochi geographic route waypoints for authentic Google Maps display
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

export function getRouteTelemetry(prog = 0.42, isModal = false) {
  prog = Math.max(0.02, Math.min(0.98, prog));
  const pts = ROUTE_COORDS;
  let totalLen = 0;
  const lens = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const d = Math.hypot(pts[i + 1].lat - pts[i].lat, pts[i + 1].lng - pts[i].lng);
    lens.push(d);
    totalLen += d;
  }
  const targetDist = prog * totalLen;
  let accumulated = 0;
  for (let i = 0; i < lens.length; i++) {
    if (accumulated + lens[i] >= targetDist || i === lens.length - 1) {
      const segT = (targetDist - accumulated) / (lens[i] || 1);
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const lat = p0.lat + (p1.lat - p0.lat) * segT;
      const lng = p0.lng + (p1.lng - p0.lng) * segT;
      const angle = (Math.atan2(p1.lng - p0.lng, p1.lat - p0.lat) * 180) / Math.PI;
      return {
        lat,
        lng,
        x: Math.round(50 + (i + segT) * 55),
        y: Math.round(220 - (i + segT) * 32),
        angle: Math.round(angle),
        currentStreet: p0.name
      };
    }
    accumulated += lens[i];
  }
  return { lat: pts[0].lat, lng: pts[0].lng, x: 50, y: 220, angle: 0, currentStreet: pts[0].name };
}

/**
 * Stock Google Maps Live Tracking Component
 * Replaces custom cartoon SVG canvas with real Google Maps stock tiles,
 * Google Maps blue route polyline, origin/destination pins, and light/dark theme synchronization.
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
  const polylineOuterRef = useRef(null);
  const polylineInnerRef = useRef(null);

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

  const geom = getRouteTelemetry(progress, isModal);

  // Initialize stock Google Map
  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const hasCustomPoints = Boolean(trip?.pickupCoords?.lat && trip?.dropCoords?.lat);
    const originPt = trip?.pickupCoords?.lat ? { lat: trip.pickupCoords.lat, lng: trip.pickupCoords.lng } : ROUTE_COORDS[0];
    const destPt = trip?.dropCoords?.lat ? { lat: trip.dropCoords.lat, lng: trip.dropCoords.lng } : ROUTE_COORDS[ROUTE_COORDS.length - 1];

    let activeWaypoints = ROUTE_COORDS;
    if (hasCustomPoints) {
      activeWaypoints = [
        originPt,
        { lat: (originPt.lat * 2 + destPt.lat) / 3 + 0.002, lng: (originPt.lng * 2 + destPt.lng) / 3 + 0.003 },
        { lat: (originPt.lat + destPt.lat * 2) / 3 - 0.001, lng: (originPt.lng + destPt.lng * 2) / 3 - 0.002 },
        destPt
      ];
    }

    const centerLat = (originPt.lat + destPt.lat) / 2;
    const centerLng = (originPt.lng + destPt.lng) / 2;

    const map = L.map(containerRef.current, {
      center: [centerLat, centerLng],
      zoom: isModal ? 15 : 14,
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

    // Google Maps Classic Blue Route Line
    const latlngs = activeWaypoints.map(p => [p.lat, p.lng]);
    
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
    L.marker([originPt.lat, originPt.lng], { icon: originIcon }).addTo(map);

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
    L.marker([destPt.lat, destPt.lng], { icon: destIcon }).addTo(map);

    // Live Moving Vehicle Marker on the Road
    const carIcon = L.divIcon({
      className: 'gmap-car-marker',
      html: `<div style="transform: rotate(${geom.angle || 0}deg); width:28px; height:28px; background:#000000; border:2px solid #FFC70A; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(0,0,0,0.45);">
        <span style="font-size:14px;">🚗</span>
      </div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
    const car = L.marker([geom.lat, geom.lng], { icon: carIcon }).addTo(map);
    carMarkerRef.current = car;

    // Fit map bounds smoothly
    map.fitBounds(L.latLngBounds(latlngs), { padding: [24, 24] });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update vehicle position when progress changes
  useEffect(() => {
    if (carMarkerRef.current && geom.lat && geom.lng) {
      carMarkerRef.current.setLatLng([geom.lat, geom.lng]);
    }
  }, [geom.lat, geom.lng, geom.angle]);

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
          <span>➔</span>
        </div>
      )}
    </div>
  );
}
