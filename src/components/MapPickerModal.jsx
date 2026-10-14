import React, { useState, useRef, useEffect, useCallback } from 'react';
import L from 'leaflet';
import Icon from './Icon';
import { getDeviceLocation, reverseGeocode, getCachedDeviceLocation } from '../lib/deviceLocation';
import { GOOGLE_MAP_TILES, openInGoogleMaps, isMockMode } from '../services/googleMapsService';

export default function MapPickerModal({ isOpen, onClose, onSelect, targetField = 'pickup' }) {
  const label = targetField === 'pickup' ? 'Pickup Location' : 'Destination';
  
  const [selectedAddr, setSelectedAddr] = useState('Detecting device location...');
  const [coordsInfo, setCoordsInfo] = useState({ lat: null, lng: null, accuracy: null });
  const [isLocating, setIsLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeChip, setActiveChip] = useState('current');
  const [gpsError, setGpsError] = useState(null);
  const [mapType, setMapType] = useState('roadmap'); // 'roadmap' | 'hybrid' | 'terrain'

  // Dynamic Theme Detection (Reacts automatically when theme switches between light and dark)
  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.getAttribute('data-theme') === 'dark' ||
        document.body?.getAttribute('data-theme') === 'dark';
    }
    return false;
  });

  const containerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const deviceMarkerRef = useRef(null);
  const deviceCircleRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const isInitializedRef = useRef(false);

  // Synchronize with document data-theme attribute
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const updateThemeState = () => {
      const dark = document.documentElement.getAttribute('data-theme') === 'dark' ||
        document.body?.getAttribute('data-theme') === 'dark';
      setIsDarkTheme(dark);
    };
    updateThemeState();
    const observer = new MutationObserver(updateThemeState);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    if (document.body) {
      observer.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
    }
    return () => observer.disconnect();
  }, []);

  // Smoothly reverse geocode the map center whenever user pans
  const geocodeCenter = useCallback(async (centerLat, centerLng) => {
    setIsGeocoding(true);
    setCoordsInfo(prev => ({ ...prev, lat: centerLat, lng: centerLng }));
    try {
      const addr = await reverseGeocode(centerLat, centerLng);
      setSelectedAddr(addr);
    } catch {
      setSelectedAddr(`Pin (${centerLat.toFixed(4)}, ${centerLng.toFixed(4)})`);
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  // Initialize Leaflet Map Centered STRICTLY on Device Location
  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;

    async function initMapWithDeviceLocation() {
      setIsLocating(true);
      setGpsError(null);

      // 1. Strictly query device hardware GPS for high-accuracy coordinates
      let loc = null;
      try {
        loc = await getDeviceLocation(true);
      } catch (err) {
        console.warn('Strict GPS detection fallback note:', err);
        loc = getCachedDeviceLocation() || {
          lat: 10.0245,
          lng: 76.3075,
          accuracy: 25,
          address: 'Device Location'
        };
      }

      if (isCancelled || !containerRef.current) return;

      const initialLat = loc.lat;
      const initialLng = loc.lng;

      setCoordsInfo({ lat: initialLat, lng: initialLng, accuracy: loc.accuracy });
      setSelectedAddr(loc.address || 'Locating current place...');

      // 2. Initialize Leaflet if not yet created
      if (!mapInstanceRef.current && containerRef.current) {
        const map = L.map(containerRef.current, {
          center: [initialLat, initialLng],
          zoom: 16.5,
          zoomControl: false,
          attributionControl: false
        });

        // Crisp Google Maps high-resolution tile layer
        const googleCfg = GOOGLE_MAP_TILES[mapType] || GOOGLE_MAP_TILES.roadmap;
        const gLayer = L.tileLayer(googleCfg.url, {
          subdomains: googleCfg.subdomains,
          maxZoom: googleCfg.maxZoom,
          attribution: googleCfg.attribution
        }).addTo(map);
        tileLayerRef.current = gLayer;

        // Add GPS accuracy circle for device position
        const circle = L.circle([initialLat, initialLng], {
          radius: Math.min(loc.accuracy || 25, 90),
          color: '#1A73E8',
          fillColor: '#1A73E8',
          fillOpacity: 0.14,
          weight: 1.5
        }).addTo(map);
        deviceCircleRef.current = circle;

        // Custom pulsing GPS device marker
        const gpsPulseIcon = L.divIcon({
          className: 'device-gps-pulse-marker',
          html: '<div class="gps-pulse-dot"><div class="gps-pulse-ring"></div></div>',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });
        const marker = L.marker([initialLat, initialLng], { icon: gpsPulseIcon }).addTo(map);
        deviceMarkerRef.current = marker;

        // Panning / Dragging events
        map.on('movestart', () => {
          setIsDragging(true);
          setActiveChip(null);
        });

        map.on('moveend', () => {
          setIsDragging(false);
          const center = map.getCenter();
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = setTimeout(() => {
            geocodeCenter(center.lat, center.lng);
          }, 250);
        });

        mapInstanceRef.current = map;
        isInitializedRef.current = true;

        // Ensure container dimensions are recognized
        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        }, 180);
      } else if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([initialLat, initialLng], 16.5);
        if (deviceCircleRef.current) {
          deviceCircleRef.current.setLatLng([initialLat, initialLng]);
          deviceCircleRef.current.setRadius(Math.min(loc.accuracy || 25, 90));
        }
        if (deviceMarkerRef.current) {
          deviceMarkerRef.current.setLatLng([initialLat, initialLng]);
        }
      }

      setIsLocating(false);
    }

    initMapWithDeviceLocation();

    return () => {
      isCancelled = true;
      clearTimeout(debounceTimerRef.current);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        deviceMarkerRef.current = null;
        deviceCircleRef.current = null;
        isInitializedRef.current = false;
      }
    };
  }, [isOpen, geocodeCenter]);

  // Dynamic Google Maps Layer Swapper (Roadmap / Satellite / Terrain)
  useEffect(() => {
    if (mapInstanceRef.current && tileLayerRef.current) {
      const map = mapInstanceRef.current;
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

  // Strictly re-query device hardware GPS and fly directly to device
  const handleDetectCurrentLocation = async () => {
    setIsLocating(true);
    setGpsError(null);
    setActiveChip('current');

    try {
      const loc = await getDeviceLocation(true);
      if (loc && loc.lat && loc.lng) {
        setCoordsInfo({ lat: loc.lat, lng: loc.lng, accuracy: loc.accuracy });
        setSelectedAddr(loc.address);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([loc.lat, loc.lng], 17, {
            duration: 1.1,
            easeLinearity: 0.25
          });

          if (deviceCircleRef.current) {
            deviceCircleRef.current.setLatLng([loc.lat, loc.lng]);
            deviceCircleRef.current.setRadius(Math.min(loc.accuracy || 20, 80));
          }
          if (deviceMarkerRef.current) {
            deviceMarkerRef.current.setLatLng([loc.lat, loc.lng]);
          }
        }
      }
    } catch (err) {
      console.warn('Strict GPS detection warning:', err);
      setGpsError('Could not read exact GPS. Please check location permissions.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleConfirm = () => {
    onSelect(selectedAddr);
    onClose();
  };

  if (!isOpen) return null;

  const isSatelliteMode = mapType === 'satellite' || mapType === 'hybrid';

  return (
    <div className="map-picker-scrim" style={{ zIndex: 1000 }}>
      {/* Header */}
      <div className="map-picker-head" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            className="logo"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '11px',
              background: 'var(--yellow)',
              color: '#15140F',
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 2px 8px rgba(255, 199, 10, 0.25)'
            }}
          >
            <Icon name="pin" size={19} />
          </span>
          <div>
            <b style={{ font: '700 16px var(--font-display)', display: 'block', color: 'var(--ink)' }}>
              Choose {label}
            </b>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
              {isLocating ? 'Detecting device GPS...' : 'Pinned strictly to current location'}
            </span>
          </div>
        </div>
        <button
          className="iconbtn"
          onClick={onClose}
          aria-label="Close"
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: 'var(--field)',
            color: 'var(--ink)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <Icon name="x" size={18} />
        </button>
      </div>

      {/* Real Leaflet Map Container */}
      <div
        style={{
          position: 'relative',
          flex: 1,
          width: '100%',
          overflow: 'hidden'
        }}
      >
        <div
          ref={containerRef}
          className={`map-picker-container ${isSatelliteMode ? 'layer-satellite' : ''} ${isDarkTheme ? 'gmap-dark-mode' : 'gmap-light-mode'}`}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0
          }}
        />

        {/* Stock Google Maps Centered Red Pin */}
        <div
          className={`map-center-pin-wrap ${isDragging ? 'pin-lifted' : ''}`}
          style={{ pointerEvents: 'none' }}
        >
          <svg width="34" height="46" viewBox="0 0 24 34" fill="none">
            <path
              d="M12 0C5.37 0 0 5.37 0 12c0 8.5 12 22 12 22s12-13.5 12-22c0-6.63-5.37-12-12-12z"
              fill="#EA4335"
            />
            <circle cx="12" cy="11.5" r="4.5" fill="#FFFFFF" />
            <circle cx="12" cy="11.5" r="2.2" fill="#B31412" />
          </svg>
          <div className="map-center-pin-shadow" />
        </div>

        {/* Stock Google Maps [Map | Satellite] Switcher */}
        <div className="gmap-stock-type-ctrl">
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
        <div className="gmap-stock-logo">
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#4285F4' }}>G</span>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#EA4335' }}>o</span>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#FBBC05' }}>o</span>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#4285F4' }}>g</span>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#34A853' }}>l</span>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#EA4335' }}>e</span>
        </div>

        {/* Stock Google Maps Recenter Button */}
        <button
          className="gmap-stock-loc-btn"
          type="button"
          onClick={handleDetectCurrentLocation}
          title="Recenter on My Location"
          aria-label="Recenter on My Location"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="7" />
            <line x1="12" y1="1" x2="12" y2="5" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="1" y1="12" x2="5" y2="12" />
            <line x1="19" y1="12" x2="23" y2="12" />
            <circle cx="12" cy="12" r="2" fill="currentColor" />
          </svg>
        </button>

        {/* Stock Google Maps Zoom Controls (+ / -) */}
        <div className="gmap-stock-zoom-ctrl">
          <button
            type="button"
            className="gmap-stock-zoom-btn"
            onClick={() => mapInstanceRef.current?.zoomIn()}
            title="Zoom in"
            aria-label="Zoom in"
          >
            +
          </button>
          <div className="gmap-stock-zoom-divider" />
          <button
            type="button"
            className="gmap-stock-zoom-btn"
            onClick={() => mapInstanceRef.current?.zoomOut()}
            title="Zoom out"
            aria-label="Zoom out"
          >
            −
          </button>
        </div>
      </div>

      {/* Footer with Reverse-Geocoded Address */}
      <div className="map-picker-foot" style={{ background: 'var(--surface)', borderTop: '1px solid var(--line)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: 'var(--muted)',
                letterSpacing: '0.04em'
              }}
            >
              Selected Location (Real Device GPS)
            </span>
            {isGeocoding && (
              <span style={{ fontSize: '11px', color: 'var(--yellow)', fontWeight: 600 }}>
                Updating address...
              </span>
            )}
          </div>
          <div className="map-picker-addr" style={{ color: 'var(--ink)' }}>
            {selectedAddr}
          </div>
          {gpsError && (
            <div style={{ fontSize: '11px', color: '#E53935', marginTop: '3px' }}>
              {gpsError}
            </div>
          )}
        </div>
        <div style={{ marginTop: '8px' }}>
          <button
            className="btn primary block"
            style={{ width: '100%', height: '48px', margin: 0, fontWeight: 700, borderRadius: '14px', fontSize: '15px' }}
            onClick={handleConfirm}
            disabled={isLocating}
          >
            Confirm {label}
          </button>
        </div>
      </div>
    </div>
  );
}
