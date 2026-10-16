import React, { useState, useRef, useEffect, useCallback } from 'react';
import L from 'leaflet';
import Icon from './Icon';
import { getDeviceLocation, reverseGeocode, getCachedDeviceLocation } from '../lib/deviceLocation';
import { GOOGLE_MAP_TILES, cleanPlusCode } from '../services/googleMapsService';

/**
 * Prominent Saved Landmarks & Popular Locations in Kerala
 * Including Malls, Temples, Airports, Stations, and Local Hubs
 */
export const SAVED_LANDMARKS = [
  {
    id: 'lulu_mall_kochi',
    name: 'LuLu Mall Kochi',
    tag: 'LuLu Mall',
    category: 'mall',
    icon: '🛍️',
    lat: 10.0275,
    lng: 76.3080,
    address: 'LuLu International Mall, 34/1000, Old NH 47, Edappally Junction, Kochi, Kerala 682024',
    city: 'Kochi',
    state: 'Kerala'
  },
  {
    id: 'chottanikkara_temple',
    name: 'Chottanikkara Bhagavathy Temple',
    tag: 'Temple',
    category: 'temple',
    icon: '🛕',
    lat: 9.9328,
    lng: 76.3934,
    address: 'Chottanikkara Bhagavathy Temple, Chottanikkara, Ernakulam, Kerala 682312',
    city: 'Chottanikkara',
    state: 'Kerala'
  },
  {
    id: 'centre_square_mall',
    name: 'Centre Square Mall',
    tag: 'Mall',
    category: 'mall',
    icon: '🛍️',
    lat: 9.9723,
    lng: 76.2798,
    address: 'Centre Square Mall, Rajaji Rd, Shenoys, Kochi, Kerala 682035',
    city: 'Kochi',
    state: 'Kerala'
  },
  {
    id: 'forum_mall_kochi',
    name: 'Forum Mall Kochi',
    tag: 'Mall',
    category: 'mall',
    icon: '🛍️',
    lat: 9.9416,
    lng: 76.3262,
    address: 'Forum Mall, Kundannoor, Maradu, Ernakulam, Kerala 682304',
    city: 'Kochi',
    state: 'Kerala'
  },
  {
    id: 'ernakulathappan_temple',
    name: 'Ernakulathappan Shiva Temple',
    tag: 'Temple',
    category: 'temple',
    icon: '🛕',
    lat: 9.9712,
    lng: 76.2842,
    address: 'Ernakulam Shiva Temple, Durbar Hall Rd, Marine Drive, Ernakulam, Kerala 682011',
    city: 'Kochi',
    state: 'Kerala'
  },
  {
    id: 'cochin_airport',
    name: 'Cochin International Airport (COK)',
    tag: 'Airport',
    category: 'airport',
    icon: '✈️',
    lat: 10.1518,
    lng: 76.3930,
    address: 'Cochin International Airport (COK), Airport Rd, Nedumbassery, Kochi, Kerala 683111',
    city: 'Nedumbassery',
    state: 'Kerala'
  },
  {
    id: 'ernakulam_south',
    name: 'Ernakulam South Railway Station',
    tag: 'Railway',
    category: 'transit',
    icon: '🚆',
    lat: 9.9678,
    lng: 76.2885,
    address: 'Ernakulam Junction South Railway Station, Ernakulam, Kochi, Kerala 682016',
    city: 'Kochi',
    state: 'Kerala'
  },
  {
    id: 'padmanabhaswamy_temple',
    name: 'Sree Padmanabhaswamy Temple',
    tag: 'Temple',
    category: 'temple',
    icon: '🛕',
    lat: 8.4831,
    lng: 76.9436,
    address: 'Sree Padmanabhaswamy Temple, West Nada, Fort, Thiruvananthapuram, Kerala 695023',
    city: 'Thiruvananthapuram',
    state: 'Kerala'
  },
  {
    id: 'edappatta_hub',
    name: 'Edappatta, Malappuram',
    tag: 'Edappatta',
    category: 'town',
    icon: '📍',
    lat: 11.1378,
    lng: 76.2575,
    address: 'Edappatta, Melattur, Malappuram, Kerala 679326',
    city: 'Edappatta',
    state: 'Kerala'
  }
];

// Calculate Haversine distance in meters
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export default function MapPickerModal({ isOpen, onClose, onSelect, targetField = 'pickup' }) {
  const label = targetField === 'pickup' ? 'Pickup Location' : 'Destination';

  const [selectedAddr, setSelectedAddr] = useState(() => {
    const cached = getCachedDeviceLocation();
    return cached?.address || 'Current Location';
  });

  const [coordsInfo, setCoordsInfo] = useState(() => {
    const cached = getCachedDeviceLocation();
    return {
      lat: cached?.lat || 10.0275,
      lng: cached?.lng || 76.3080,
      accuracy: cached?.accuracy || null,
      name: null,
      isLandmark: false
    };
  });

  const [snappedLandmark, setSnappedLandmark] = useState(null);
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
  const landmarkMarkersRef = useRef([]);
  const debounceTimerRef = useRef(null);
  const isInitializedRef = useRef(false);

  // Proximity threshold for snapping pin to a saved landmark (in meters)
  const SNAP_THRESHOLD_METERS = 240;

  // Check if center coords are close to any saved landmark
  const findNearbyLandmark = useCallback((lat, lng) => {
    for (const lm of SAVED_LANDMARKS) {
      const dist = getDistanceMeters(lat, lng, lm.lat, lm.lng);
      if (dist <= SNAP_THRESHOLD_METERS) {
        return lm;
      }
    }
    return null;
  }, []);

  // Smoothly geocode center or lock onto landmark
  const geocodeCenter = useCallback(
    async (centerLat, centerLng) => {
      // 1. Check if the pin is over or near a saved location (like LuLu Mall, Temples, etc.)
      const matched = findNearbyLandmark(centerLat, centerLng);
      if (matched) {
        setSnappedLandmark(matched);
        setSelectedAddr(matched.address);
        setCoordsInfo({
          lat: matched.lat,
          lng: matched.lng,
          name: matched.name,
          city: matched.city,
          state: matched.state,
          address: matched.address,
          isLandmark: true
        });
        setIsGeocoding(false);
        return;
      }

      // 2. Otherwise reverse geocode the raw coordinates
      setSnappedLandmark(null);
      setIsGeocoding(true);
      setCoordsInfo((prev) => ({
        ...prev,
        lat: centerLat,
        lng: centerLng,
        name: null,
        isLandmark: false
      }));

      try {
        const addr = await reverseGeocode(centerLat, centerLng);
        setSelectedAddr(cleanPlusCode(addr));
      } catch {
        setSelectedAddr(`Pin (${centerLat.toFixed(4)}, ${centerLng.toFixed(4)})`);
      } finally {
        setIsGeocoding(false);
      }
    },
    [findNearbyLandmark]
  );

  // Pan / fly directly to a saved landmark on the map
  const handleSelectLandmark = useCallback((lm) => {
    setSnappedLandmark(lm);
    setSelectedAddr(lm.address);
    setCoordsInfo({
      lat: lm.lat,
      lng: lm.lng,
      name: lm.name,
      city: lm.city,
      state: lm.state,
      address: lm.address,
      isLandmark: true
    });

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lm.lat, lm.lng], 17.5, {
        duration: 0.85,
        easeLinearity: 0.25
      });
    }
  }, []);

  // Initialize Leaflet Map Instantly
  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;

    const cachedLoc = getCachedDeviceLocation() || {
      lat: 10.0275,
      lng: 76.3080,
      accuracy: 25,
      address: 'LuLu Mall Kochi, Edappally'
    };

    const initialLat = cachedLoc.lat;
    const initialLng = cachedLoc.lng;

    setCoordsInfo({
      lat: initialLat,
      lng: initialLng,
      accuracy: cachedLoc.accuracy,
      name: null,
      isLandmark: false
    });
    setSelectedAddr(cachedLoc.address || 'Pin location');

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

      // Add Saved Landmarks as interactive badges on Leaflet map
      landmarkMarkersRef.current = [];
      SAVED_LANDMARKS.forEach((lm) => {
        const landmarkIcon = L.divIcon({
          className: 'saved-landmark-leaflet-wrap',
          html: `
            <div class="saved-landmark-pin-badge" style="
              display: inline-flex;
              align-items: center;
              gap: 5px;
              background: #FFFFFF;
              border: 1.5px solid #0F172A;
              border-radius: 999px;
              padding: 4px 10px;
              box-shadow: 0 4px 14px rgba(0,0,0,0.22);
              font-family: system-ui, -apple-system, sans-serif;
              font-size: 11px;
              font-weight: 750;
              color: #0F172A;
              white-space: nowrap;
              cursor: pointer;
              transform: translate(-50%, -50%);
            ">
              <span style="font-size: 13px;">${lm.icon}</span>
              <span>${lm.name.split(',')[0]}</span>
            </div>
          `,
          iconSize: [0, 0]
        });

        const lmMarker = L.marker([lm.lat, lm.lng], { icon: landmarkIcon }).addTo(map);
        lmMarker.on('click', () => {
          handleSelectLandmark(lm);
        });
        landmarkMarkersRef.current.push(lmMarker);
      });

      map.on('movestart', () => {
        setIsDragging(true);
      });

      map.on('move', () => {
        // Real-time check while moving to snap visually
        const center = map.getCenter();
        const nearby = findNearbyLandmark(center.lat, center.lng);
        if (nearby) {
          setSnappedLandmark(nearby);
        } else if (snappedLandmark) {
          setSnappedLandmark(null);
        }
      });

      map.on('moveend', () => {
        setIsDragging(false);
        const center = map.getCenter();
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
          geocodeCenter(center.lat, center.lng);
        }, 180);
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
      }, 100);
    }

    // Check device location in background
    setIsLocating(true);
    getDeviceLocation(true)
      .then((freshLoc) => {
        if (isCancelled || !freshLoc || !freshLoc.lat) return;
        setCoordsInfo((prev) => ({
          ...prev,
          lat: freshLoc.lat,
          lng: freshLoc.lng,
          accuracy: freshLoc.accuracy
        }));
        if (freshLoc.address) {
          setSelectedAddr(freshLoc.address);
        }

        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo([freshLoc.lat, freshLoc.lng], { animate: true, duration: 0.5 });
          if (deviceCircleRef.current) {
            deviceCircleRef.current.setLatLng([freshLoc.lat, freshLoc.lng]);
            deviceCircleRef.current.setRadius(Math.min(freshLoc.accuracy || 20, 80));
          }
          if (deviceMarkerRef.current) {
            deviceMarkerRef.current.setLatLng([freshLoc.lat, freshLoc.lng]);
          }
        }
      })
      .catch((err) => {
        console.warn('Background GPS refinement note:', err);
      })
      .finally(() => {
        if (!isCancelled) setIsLocating(false);
      });

    return () => {
      isCancelled = true;
      clearTimeout(debounceTimerRef.current);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        deviceMarkerRef.current = null;
        deviceCircleRef.current = null;
        landmarkMarkersRef.current = [];
        isInitializedRef.current = false;
      }
    };
  }, [isOpen, geocodeCenter, findNearbyLandmark, handleSelectLandmark, mapType]);

  // Recenter GPS
  const handleDetectCurrentLocation = async () => {
    setIsLocating(true);
    setGpsError(null);
    setSnappedLandmark(null);

    try {
      const loc = await getDeviceLocation(true);
      if (loc && loc.lat && loc.lng) {
        setCoordsInfo({
          lat: loc.lat,
          lng: loc.lng,
          accuracy: loc.accuracy,
          name: null,
          isLandmark: false
        });
        setSelectedAddr(loc.address);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([loc.lat, loc.lng], 17, {
            duration: 1.0,
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
    // Pass both the full cleaned address and the exact coordinates/landmark details
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
          padding: '12px 16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '12px',
              background: snappedLandmark ? '#000000' : 'var(--yellow, #FACC15)',
              color: snappedLandmark ? '#FACC15' : '#15140F',
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              transition: 'all 0.25s ease'
            }}
          >
            <Icon name={snappedLandmark ? 'star' : 'pin'} size={19} />
          </span>
          <div>
            <b style={{ font: '700 16px var(--font-display, system-ui)', display: 'block', color: 'var(--ink, #0F172A)' }}>
              Choose {label}
            </b>
            <span style={{ fontSize: '11.5px', color: 'var(--muted, #64748B)' }}>
              {snappedLandmark ? `Locked onto: ${snappedLandmark.name}` : isLocating ? 'Detecting device GPS...' : 'Pick on Google Map or choose landmark'}
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

      {/* Quick Saved Landmark Filter Chips (Top Bar) */}
      <div
        style={{
          background: 'var(--surface, #FFFFFF)',
          borderBottom: '1px solid var(--line, #E2E8F0)',
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
          zIndex: 10
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted, #64748B)', letterSpacing: '0.04em', flexShrink: 0, marginRight: '2px' }}>
          Saved:
        </span>
        {SAVED_LANDMARKS.map((lm) => {
          const isSelected = snappedLandmark?.id === lm.id;
          return (
            <button
              key={lm.id}
              type="button"
              onClick={() => handleSelectLandmark(lm)}
              style={{
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 12px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 750,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                background: isSelected ? '#000000' : 'var(--field, #F1F5F9)',
                color: isSelected ? '#FFFFFF' : 'var(--ink, #0F172A)',
                border: isSelected ? '1.5px solid #000000' : '1px solid var(--line, #E2E8F0)',
                boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.18)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <span style={{ fontSize: '13px' }}>{lm.icon}</span>
              <span>{lm.name.split(',')[0]}</span>
            </button>
          );
        })}
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

        {/* Snapped Landmark Floating Pill Notice */}
        {snappedLandmark && (
          <div
            style={{
              position: 'absolute',
              top: '14px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(15, 23, 42, 0.92)',
              backdropFilter: 'blur(8px)',
              color: '#FFFFFF',
              padding: '6px 14px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 750,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 18px rgba(0,0,0,0.25)',
              zIndex: 999,
              pointerEvents: 'none',
              animation: 'fadeIn 0.2s ease'
            }}
          >
            <span style={{ color: '#FACC15' }}>★</span>
            <span>Snapped to {snappedLandmark.name}</span>
          </div>
        )}

        {/* Centered Stock Google Maps Red Pin */}
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
              fill={snappedLandmark ? '#0F172A' : '#EA4335'}
            />
            <circle cx="12" cy="11.5" r="4.5" fill="#FFFFFF" />
            <circle cx="12" cy="11.5" r="2.2" fill={snappedLandmark ? '#FACC15' : '#B31412'} />
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
            background: '#FFFFFF',
            border: '1.5px solid #E2E8F0',
            boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            zIndex: 900,
            color: '#0F172A'
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

      {/* Footer with Landmark / Address Preview & Confirmation */}
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
                color: snappedLandmark ? '#D97706' : 'var(--muted, #64748B)',
                letterSpacing: '0.04em',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              {snappedLandmark ? '★ Saved Landmark Locked' : 'Selected Location (Exact GPS)'}
            </span>
            {isGeocoding && (
              <span style={{ fontSize: '11px', color: 'var(--yellow, #EAB308)', fontWeight: 600 }}>
                Updating location...
              </span>
            )}
          </div>

          <div
            className="map-picker-addr"
            style={{
              color: 'var(--ink, #0F172A)',
              fontSize: '13.5px',
              fontWeight: snappedLandmark ? 700 : 600,
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
            <span>Confirm {snappedLandmark ? snappedLandmark.name : label}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
