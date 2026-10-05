import React, { useState, useRef, useEffect, useCallback } from 'react';
import L from 'leaflet';
import Icon from './Icon';
import { getDeviceLocation, reverseGeocode, getCachedDeviceLocation } from '../lib/deviceLocation';

export default function MapPickerModal({ isOpen, onClose, onSelect, targetField = 'pickup' }) {
  if (!isOpen) return null;

  const label = targetField === 'pickup' ? 'Pickup Location' : 'Destination';
  
  const [selectedAddr, setSelectedAddr] = useState('Detecting device location...');
  const [coordsInfo, setCoordsInfo] = useState({ lat: null, lng: null, accuracy: null });
  const [isLocating, setIsLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeChip, setActiveChip] = useState('current');
  const [gpsError, setGpsError] = useState(null);

  const containerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const deviceMarkerRef = useRef(null);
  const deviceCircleRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const isInitializedRef = useRef(false);

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
    let isCancelled = false;

    async function initMapWithDeviceLocation() {
      setIsLocating(true);
      setGpsError(null);

      // 1. Fetch strict device GPS location
      let loc = getCachedDeviceLocation();
      if (!loc) {
        try {
          loc = await getDeviceLocation(false);
        } catch (e) {
          console.warn('GPS initial detection note:', e);
          loc = { lat: 12.9716, lng: 77.5946, accuracy: 25, address: 'Device Location' };
        }
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
          zoom: 16,
          zoomControl: false,
          attributionControl: false
        });

        // Crisp vector-styled OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        // Add GPS accuracy circle for device position
        const circle = L.circle([initialLat, initialLng], {
          radius: Math.min(loc.accuracy || 20, 80),
          color: '#007AFF',
          fillColor: '#007AFF',
          fillOpacity: 0.12,
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
        mapInstanceRef.current.setView([initialLat, initialLng], 16);
        if (deviceCircleRef.current) {
          deviceCircleRef.current.setLatLng([initialLat, initialLng]);
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
  }, [geocodeCenter]);

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
          mapInstanceRef.current.flyTo([loc.lat, loc.lng], 16.5, {
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

  return (
    <div className="map-picker-scrim" style={{ zIndex: 1000 }}>
      {/* Header */}
      <div className="map-picker-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            className="logo"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              background: 'var(--yellow)',
              color: '#15140F',
              display: 'grid',
              placeItems: 'center'
            }}
          >
            <Icon name="pin" size={18} />
          </span>
          <div>
            <b style={{ font: '700 16px var(--font-display)', display: 'block', color: 'var(--ink)' }}>
              Choose {label}
            </b>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
              {isLocating ? 'Detecting device GPS...' : 'Strictly pinned to device location'}
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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <Icon name="x" size={18} />
        </button>
      </div>

      {/* Quick Landmark & GPS Chips */}
      <div className="map-picker-chips" id="picker-chips">
        <button
          className={`map-picker-chip ${activeChip === 'current' ? 'on' : ''}`}
          onClick={handleDetectCurrentLocation}
          type="button"
          style={{
            background: activeChip === 'current' ? 'var(--yellow)' : 'var(--yellow-soft)',
            color: '#15140F',
            borderColor: 'var(--yellow)',
            fontWeight: 700
          }}
        >
          <Icon name="crosshair" size={13} />
          <span>{isLocating ? 'Acquiring GPS...' : 'My Current Location'}</span>
        </button>

        {coordsInfo.lat && coordsInfo.lng && (
          <div
            className="map-picker-chip"
            style={{
              background: 'var(--field)',
              color: 'var(--muted)',
              fontSize: '11px',
              fontWeight: 600
            }}
          >
            <Icon name="check" size={11} />
            <span>
              {coordsInfo.lat.toFixed(4)}°, {coordsInfo.lng.toFixed(4)}°
            </span>
          </div>
        )}
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
          className="map-picker-container"
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0
          }}
        />

        {/* Centered Fixed Map Pin */}
        <div
          className={`map-center-pin-wrap ${isDragging ? 'pin-lifted' : ''}`}
          style={{ pointerEvents: 'none' }}
        >
          <div className="map-center-pin-badge">
            {isLocating ? 'Locating...' : isGeocoding ? 'Reading address...' : label}
          </div>
          <svg width="34" height="44" viewBox="0 0 24 32" fill="none">
            <path
              d="M12 0C5.37 0 0 5.37 0 12c0 9 12 20 12 20s12-11 12-20c0-6.63-5.37-12-12-12z"
              fill="#0B0B0C"
            />
            <circle cx="12" cy="11" r="4.5" fill="#FFC70A" />
          </svg>
          <div className="map-center-pin-shadow" />
        </div>

        {/* Floating Device GPS Recenter Button */}
        <button
          className="map-picker-gps-btn"
          type="button"
          onClick={handleDetectCurrentLocation}
          title="Re-center to exact device GPS"
          style={{
            background: isLocating ? 'var(--yellow)' : 'var(--card)',
            color: isLocating ? '#000000' : 'var(--ink)'
          }}
          aria-label="Re-center to exact device GPS"
        >
          <Icon name="crosshair" size={22} />
        </button>
      </div>

      {/* Footer with Reverse-Geocoded Address */}
      <div className="map-picker-foot">
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
          <div className="map-picker-addr">
            {selectedAddr}
          </div>
          {gpsError && (
            <div style={{ fontSize: '11px', color: '#E53935', marginTop: '3px' }}>
              {gpsError}
            </div>
          )}
        </div>
        <button className="btn primary block" onClick={handleConfirm} disabled={isLocating}>
          Confirm {label}
        </button>
      </div>
    </div>
  );
}
