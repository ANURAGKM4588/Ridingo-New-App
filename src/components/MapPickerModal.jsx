import React, { useState, useRef, useEffect, useCallback } from 'react';
import L from 'leaflet';
import Icon from './Icon';
import { getDeviceLocation, reverseGeocode, getCachedDeviceLocation } from '../lib/deviceLocation';
import { getCurrentDevicePosition } from '../services/nativeLocationService';
import { GOOGLE_MAP_TILES, cleanPlusCode, fetchNearestLandmarkByCoordinates } from '../services/googleMapsService';

export default function MapPickerModal({ isOpen, onClose, onSelect, targetField = 'pickup' }) {
  const label = targetField === 'pickup' ? 'Pickup Location' : 'Destination';

  const [selectedAddr, setSelectedAddr] = useState(() => {
    const cached = getCachedDeviceLocation();
    return cleanPlusCode(cached?.address) || 'Selected Location';
  });

  const [coordsInfo, setCoordsInfo] = useState(() => {
    const cached = getCachedDeviceLocation();
    const cleanAddr = cleanPlusCode(cached?.address) || 'Selected Location';
    return {
      lat: cached?.lat || 10.0275,
      lng: cached?.lng || 76.3080,
      accuracy: cached?.accuracy || null,
      name: cleanAddr.split(',')[0].trim() || 'Selected Location',
      address: cleanAddr
    };
  });

  const [isLocating, setIsLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [mapType, setMapType] = useState('roadmap');

  const containerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const deviceMarkerRef = useRef(null);
  const deviceCircleRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const isInitializedRef = useRef(false);

  // Real Google Maps Geocoder: resolves geographic place name and collects routing & tracking data
  const geocodeCenter = useCallback(
    async (centerLat, centerLng) => {
      setIsGeocoding(true);
      try {
        const placeData = await fetchNearestLandmarkByCoordinates(centerLat, centerLng);

        if (placeData && placeData.name) {
          const cleanPlaceName = cleanPlusCode(placeData.name);
          const cleanAddress = cleanPlusCode(placeData.formattedAddress || placeData.name);

          // Collect complete location data for driver tracking and route mapping (kept in state, not shown as raw codes)
          setCoordsInfo({
            lat: centerLat,
            lng: centerLng,
            placeId: placeData.placeId,
            name: cleanPlaceName, // Geographic place location name (e.g., "Edappally, Kochi")
            address: cleanAddress,
            city: placeData.city || cleanPlaceName.split(',')[0].trim(),
            state: placeData.state || 'Kerala',
            postalCode: placeData.postalCode || ''
          });

          setSelectedAddr(cleanAddress);
        } else {
          const addr = await reverseGeocode(centerLat, centerLng);
          const cleanAddr = cleanPlusCode(addr) || 'Selected Location';
          setSelectedAddr(cleanAddr);
          setCoordsInfo({
            lat: centerLat,
            lng: centerLng,
            name: cleanAddr.split(',')[0].trim() || 'Selected Location',
            address: cleanAddr,
            city: 'Kochi',
            state: 'Kerala'
          });
        }
      } catch (err) {
        console.warn('Geocoding error:', err);
        setSelectedAddr('Selected Location');
      } finally {
        setIsGeocoding(false);
      }
    },
    []
  );

  // Initialize Real Leaflet Map with Google Maps Tiles
  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;

    const cachedLoc = getCachedDeviceLocation() || {
      lat: 10.0275,
      lng: 76.3080,
      accuracy: 25,
      address: 'Kochi, Kerala'
    };

    const initialLat = cachedLoc.lat;
    const initialLng = cachedLoc.lng;
    const initialAddr = cleanPlusCode(cachedLoc.address) || 'Selected Location';

    setCoordsInfo({
      lat: initialLat,
      lng: initialLng,
      accuracy: cachedLoc.accuracy,
      name: initialAddr.split(',')[0].trim() || 'Selected Location',
      address: initialAddr
    });
    setSelectedAddr(initialAddr);

    if (!mapInstanceRef.current && containerRef.current) {
      const map = L.map(containerRef.current, {
        center: [initialLat, initialLng],
        zoom: 16.5,
        zoomControl: false,
        attributionControl: false
      });

      const googleCfg = GOOGLE_MAP_TILES[mapType] || GOOGLE_MAP_TILES.roadmap;
      const gLayer = L.tileLayer(googleCfg.url, {
        subdomains: googleCfg.subdomains,
        maxZoom: googleCfg.maxZoom,
        attribution: googleCfg.attribution
      }).addTo(map);
      tileLayerRef.current = gLayer;

      // Real Device GPS Blue Ring
      const circle = L.circle([initialLat, initialLng], {
        radius: Math.min(cachedLoc.accuracy || 25, 90),
        color: '#1A73E8',
        fillColor: '#1A73E8',
        fillOpacity: 0.14,
        weight: 1.5
      }).addTo(map);
      deviceCircleRef.current = circle;

      const gpsPulseIcon = L.divIcon({
        className: 'device-gps-pulse-marker',
        html: '<div class="gps-pulse-dot"><div class="gps-pulse-ring"></div></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      const marker = L.marker([initialLat, initialLng], { icon: gpsPulseIcon }).addTo(map);
      deviceMarkerRef.current = marker;

      // Map drag events
      map.on('movestart', () => {
        setIsDragging(true);
      });

      map.on('moveend', () => {
        setIsDragging(false);
        const center = map.getCenter();
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
          geocodeCenter(center.lat, center.lng);
        }, 180);
      });

      // Map tap: moves marker to tapped location
      map.on('click', (e) => {
        if (!e.latlng) return;
        const { lat, lng } = e.latlng;
        map.panTo([lat, lng], { animate: true, duration: 0.25 });
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
          geocodeCenter(lat, lng);
        }, 100);
      });

      mapInstanceRef.current = map;
      isInitializedRef.current = true;

      requestAnimationFrame(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      });
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 50);
    }

    // Fast non-blocking background GPS refresh without loading overlay
    getDeviceLocation(false)
      .then((freshLoc) => {
        if (isCancelled || !freshLoc || !freshLoc.lat) return;
        setCoordsInfo((prev) => ({
          ...prev,
          lat: freshLoc.lat,
          lng: freshLoc.lng,
          accuracy: freshLoc.accuracy
        }));
        if (freshLoc.address) {
          setSelectedAddr(cleanPlusCode(freshLoc.address));
        }

        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo([freshLoc.lat, freshLoc.lng], { animate: false });
          if (deviceCircleRef.current) {
            deviceCircleRef.current.setLatLng([freshLoc.lat, freshLoc.lng]);
            deviceCircleRef.current.setRadius(Math.min(freshLoc.accuracy || 20, 80));
          }
          if (deviceMarkerRef.current) {
            deviceMarkerRef.current.setLatLng([freshLoc.lat, freshLoc.lng]);
          }
        }
      })
      .catch(() => {});

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
  }, [isOpen, geocodeCenter, mapType]);

  // Recenter GPS: Instant detection with 0ms delay
  const handleDetectCurrentLocation = () => {
    setGpsError(null);

    // 1. Instant detection from cache
    const cached = getCachedDeviceLocation();
    if (cached && cached.lat && cached.lng) {
      const cleanAddr = cleanPlusCode(cached.address) || 'Current Location';
      setCoordsInfo({
        lat: cached.lat,
        lng: cached.lng,
        accuracy: cached.accuracy || 20,
        name: cleanAddr.split(',')[0].trim() || 'Current Location',
        address: cleanAddr
      });
      setSelectedAddr(cleanAddr);

      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([cached.lat, cached.lng], 17, { animate: false });
        if (deviceCircleRef.current) {
          deviceCircleRef.current.setLatLng([cached.lat, cached.lng]);
          deviceCircleRef.current.setRadius(Math.min(cached.accuracy || 20, 80));
        }
        if (deviceMarkerRef.current) {
          deviceMarkerRef.current.setLatLng([cached.lat, cached.lng]);
        }
      }
    }

    // 2. Hardware GPS fast sync in parallel without blocking UI (Strictly routed through Capacitor Geolocation on iOS/Android)
    getCurrentDevicePosition({ enableHighAccuracy: true, timeout: 3500, maximumAge: 60000 })
      .then((pos) => {
        if (pos && pos.coords) {
          const { latitude, longitude, accuracy } = pos.coords;
          if (mapInstanceRef.current) {
            mapInstanceRef.current.panTo([latitude, longitude], { animate: false });
            if (deviceCircleRef.current) {
              deviceCircleRef.current.setLatLng([latitude, longitude]);
              deviceCircleRef.current.setRadius(Math.min(accuracy || 20, 80));
            }
            if (deviceMarkerRef.current) {
              deviceMarkerRef.current.setLatLng([latitude, longitude]);
            }
          }
          geocodeCenter(latitude, longitude);
        }
      })
      .catch(() => {});
  };

  const handleConfirm = () => {
    // Pass the clean place address for the input box, and complete tracking/routing data in coordsInfo
    onSelect(cleanPlusCode(selectedAddr), coordsInfo);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="map-picker-scrim" style={{ zIndex: 10000 }}>
      {/* Header */}
      <div
        className="map-picker-head"
        style={{
          background: 'var(--surface, #FFFFFF)',
          borderBottom: '1px solid var(--line, #E2E8F0)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '12px',
              background: 'var(--yellow, #FACC15)',
              color: '#15140F',
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
            }}
          >
            <Icon name="pin" size={19} />
          </span>
          <div>
            <b style={{ font: '700 16px var(--font-display, system-ui)', display: 'block', color: 'var(--ink, #0F172A)' }}>
              Choose {label}
            </b>
            <span style={{ fontSize: '11.5px', color: 'var(--muted, #64748B)' }}>
              Move map or tap to place the pin
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
            background: 'var(--field, #F1F5F9)',
            color: 'var(--ink, #0F172A)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            border: '1px solid var(--line, #E2E8F0)'
          }}
        >
          <Icon name="x" size={17} />
        </button>
      </div>

      {/* Real Full-View Map Container */}
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

        {/* Centered Map Pin Marker */}
        <div
          className={`map-center-pin-wrap ${isDragging ? 'pin-lifted' : ''}`}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -100%)',
            pointerEvents: 'none',
            zIndex: 900,
            transition: 'transform 0.15s ease'
          }}
        >
          <svg width="36" height="48" viewBox="0 0 24 34" fill="none">
            <path
              d="M12 0C5.37 0 0 5.37 0 12c0 8.5 12 22 12 22s12-13.5 12-22c0-6.63-5.37-12-12-12z"
              fill="#EA4335"
            />
            <circle cx="12" cy="11.5" r="4.5" fill="#FFFFFF" />
            <circle cx="12" cy="11.5" r="2.2" fill="#B31412" />
          </svg>
          <div
            style={{
              width: '10px',
              height: '4px',
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.25)',
              margin: '-2px auto 0'
            }}
          />
        </div>

        {/* Recenter Device GPS Button */}
        <button
          className="gmap-stock-loc-btn"
          type="button"
          onClick={handleDetectCurrentLocation}
          title="Recenter on My Location"
          aria-label="Recenter on My Location"
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '16px',
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            background: 'var(--card, #FFFFFF)',
            border: '1.5px solid var(--line, #E2E8F0)',
            boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            zIndex: 900,
            color: 'var(--ink, #0F172A)'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="12" cy="12" r="7" />
            <line x1="12" y1="1" x2="12" y2="5" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="1" y1="12" x2="5" y2="12" />
            <line x1="19" y1="12" x2="23" y2="12" />
            <circle cx="12" cy="12" r="2.5" fill="currentColor" />
          </svg>
        </button>
      </div>

      {/* Footer Location Card (Clean Place Name & Address, No Raw Codes) */}
      <div
        className="map-picker-foot"
        style={{
          background: 'var(--surface, #FFFFFF)',
          borderTop: '1px solid var(--line, #E2E8F0)',
          padding: '14px 16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 750,
                textTransform: 'uppercase',
                color: 'var(--muted, #64748B)',
                letterSpacing: '0.04em'
              }}
            >
              Selected Location
            </span>
            {isGeocoding && (
              <span style={{ fontSize: '11px', color: 'var(--yellow, #EAB308)', fontWeight: 600 }}>
                Updating location...
              </span>
            )}
          </div>

          {/* Place Name (Locality / Area / Town) */}
          <div
            style={{
              fontSize: '16px',
              fontWeight: 750,
              color: 'var(--ink, #0F172A)',
              marginBottom: '2px',
              lineHeight: 1.3
            }}
          >
            {coordsInfo.name || 'Selected Location'}
          </div>

          {/* Clean Readable Address (No Plus Codes / Location Codes) */}
          <div
            className="map-picker-addr"
            style={{
              color: 'var(--muted, #64748B)',
              fontSize: '12.5px',
              fontWeight: 500,
              lineHeight: 1.35
            }}
          >
            {selectedAddr}
          </div>

          {gpsError && (
            <div style={{ fontSize: '11px', color: '#E53935', marginTop: '3px' }}>
              {gpsError}
            </div>
          )}
        </div>

        <div style={{ marginTop: '12px' }}>
          <button
            className="btn primary block"
            style={{
              width: '100%',
              height: '48px',
              margin: 0,
              fontWeight: 750,
              borderRadius: '14px',
              fontSize: '15px',
              background: '#000000',
              color: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            onClick={handleConfirm}
          >
            <Icon name="check" size={17} />
            <span>Confirm Location</span>
          </button>
        </div>
      </div>
    </div>
  );
}
