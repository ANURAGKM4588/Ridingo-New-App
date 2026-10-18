import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import Icon from './Icon';
import GraphicLiveMap, { getRouteTelemetry } from './GraphicLiveMap';
import { openInGoogleMaps } from '../services/googleMapsService';
import ContactProfileCard from './ContactProfileCard';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { generateTripTicketImage } from '../utils/tripTicketGenerator';
import TripTicketModal from './TripTicketModal';
import { cleanLocationName, getLocationUpToFirstComma } from '../utils/locationCleaner';
import { realtime } from '../utils/realtime';

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = ((Number(lat2) - Number(lat1)) * Math.PI) / 180;
  const dLon = ((Number(lon2) - Number(lon1)) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((Number(lat1) * Math.PI) / 180) *
      Math.cos((Number(lat2) * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

export default function LiveTrackingSheet() {
  const {
    liveTrackingOpen,
    setLiveTrackingOpen,
    trips,
    setTrips,
    user,
    addToast,
    activeTrackingTripId,
    setActiveTrackingTripId,
    isUserTrip,
    declineTrip,
    cancelTripByUser,
    setTripToCancel
  } = useApp();

  const isClientTrip = (t) => {
    if (!t) return false;
    if (!user) return true;
    if (isUserTrip && isUserTrip(t, user)) return true;
    const uPhone = String(user.phone || '').replace(/\D/g, '');
    const tPhone = String(t.rider?.phone || '').replace(/\D/g, '');
    if (uPhone && tPhone && (uPhone.endsWith(tPhone.slice(-10)) || tPhone.endsWith(uPhone.slice(-10)))) return true;
    return false;
  };

  const activeTrip = (activeTrackingTripId ? trips.find(t => t.id === activeTrackingTripId && !['completed', 'cancelled', 'invoice_pending', 'ending_otp'].includes(t.status)) : null) ||
                     trips.find(t => isClientTrip(t) && t.status === 'inprogress') ||
                     trips.find(t => isClientTrip(t) && ['accepted', 'pickup_arrived', 'ready_to_start'].includes(t.status)) ||
                     trips.find(t => isClientTrip(t) && t.status === 'requested');

  const trip = activeTrip;
  const isStarted = trip?.status === 'inprogress';
  const isDriverAssigned = ['accepted', 'pickup_arrived', 'ready_to_start'].includes(trip?.status);
  const isArrived = trip?.status === 'pickup_arrived';
  const isReady = trip?.status === 'ready_to_start';
  const isAccepted = trip?.status === 'accepted';
  const isWaiting = trip?.status === 'requested';

  // Real-Time GPS Tracking State (Driven strictly by real driver mobile GPS stream)
  const [liveDriverGps, setLiveDriverGps] = useState(() => trip?.driverCoords || null);
  const [liveDriverHeading, setLiveDriverHeading] = useState(() => trip?.driverHeading || 0);
  const [liveDriverSpeed, setLiveDriverSpeed] = useState(() => trip?.driverSpeed || 0);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);

  // Sync state if trip props update
  useEffect(() => {
    if (trip?.driverCoords?.lat && trip?.driverCoords?.lng) {
      setLiveDriverGps(trip.driverCoords);
    }
    if (trip?.driverHeading !== undefined) {
      setLiveDriverHeading(trip.driverHeading);
    }
    if (trip?.driverSpeed !== undefined) {
      setLiveDriverSpeed(trip.driverSpeed);
    }
  }, [trip?.driverCoords?.lat, trip?.driverCoords?.lng, trip?.driverHeading, trip?.driverSpeed]);

  // Subscribe to real-time mobile GPS location updates from Driver App
  useEffect(() => {
    if (!liveTrackingOpen || !trip?.id) return;
    const unbind = realtime.on('LOCATION_UPDATE', (telemetry) => {
      if (telemetry?.tripId && String(telemetry.tripId) === String(trip.id)) {
        if (telemetry.lat && telemetry.lng) {
          setLiveDriverGps({ lat: Number(telemetry.lat), lng: Number(telemetry.lng) });
        }
        if (telemetry.heading !== undefined) setLiveDriverHeading(Number(telemetry.heading));
        if (telemetry.speed !== undefined) setLiveDriverSpeed(Number(telemetry.speed));
      }
    });

    return () => {
      if (typeof unbind === 'function') unbind();
    };
  }, [liveTrackingOpen, trip?.id]);

  // Calculate Real-Time GPS Distance & ETA
  const currentCoords = liveDriverGps || trip?.driverCoords;
  const targetCoords = isDriverAssigned ? trip?.pickupCoords : trip?.dropCoords;

  const realDistanceKm = useMemo(() => {
    if (currentCoords?.lat && currentCoords?.lng && targetCoords?.lat && targetCoords?.lng) {
      return calculateDistanceKm(currentCoords.lat, currentCoords.lng, targetCoords.lat, targetCoords.lng);
    }
    return trip?.distanceKm ? Number(trip.distanceKm) : null;
  }, [currentCoords?.lat, currentCoords?.lng, targetCoords?.lat, targetCoords?.lng, trip?.distanceKm]);

  const distLeft = realDistanceKm !== null
    ? `${realDistanceKm.toFixed(1)} km`
    : (trip?.distanceText || '2.8 km');

  const etaMins = useMemo(() => {
    if (realDistanceKm !== null) {
      if (liveDriverSpeed > 10) {
        return Math.max(1, Math.round((realDistanceKm / liveDriverSpeed) * 60));
      }
      return Math.max(1, Math.round((realDistanceKm / 28) * 60)); // ~28 km/h city average
    }
    return trip?.durationMins || 12;
  }, [realDistanceKm, liveDriverSpeed, trip?.durationMins]);

  const liveSpeed = Math.round(liveDriverSpeed);

  // Live trip object passed to Map ensuring driver marker uses real GPS
  const liveTripData = useMemo(() => ({
    ...trip,
    driverCoords: currentCoords,
    driverHeading: liveDriverHeading,
    driverSpeed: liveDriverSpeed
  }), [trip, currentCoords, liveDriverHeading, liveDriverSpeed]);

  // Auto-close and remove tracking popup immediately if the trip ended, completed, or cancelled
  useEffect(() => {
    if (!activeTrip || ['completed', 'cancelled', 'invoice_pending', 'ending_otp'].includes(activeTrip?.status)) {
      if (liveTrackingOpen) {
        setLiveTrackingOpen(false);
        if (setActiveTrackingTripId) setActiveTrackingTripId(null);
      }
    }
  }, [activeTrip, activeTrip?.status, liveTrackingOpen, setLiveTrackingOpen, setActiveTrackingTripId]);

  // Real nearing destination alert when driver GPS is within 800 meters
  useEffect(() => {
    if (!liveTrackingOpen || !trip) return;
    if (isStarted && realDistanceKm !== null && realDistanceKm <= 0.8 && !trip.approachingNotified) {
      setTrips(prev =>
        prev.map(t => (t.id === trip.id ? { ...t, approachingNotified: true } : t))
      );
      addToast('Approaching destination (~800m). Trip will complete shortly.', 'info');
    }
  }, [liveTrackingOpen, isStarted, realDistanceKm, trip?.id, trip?.approachingNotified]);

  if (!liveTrackingOpen || !activeTrip || ['completed', 'cancelled', 'invoice_pending', 'ending_otp'].includes(activeTrip.status)) {
    return null;
  }

  const handleShareTrip = () => {
    if (!trip) return;
    setTicketModalOpen(true);
  };

  const handleSos = () => {
    const gpsInfo = currentCoords ? `${currentCoords.lat.toFixed(5)}, ${currentCoords.lng.toFixed(5)}` : 'Live GPS Active';
    if (addToast) {
      addToast(`🚨 EMERGENCY SOS BROADCAST: Live driver GPS (${gpsInfo}) & alert sent to 112 and emergency contacts.`, 'error');
    }
    if (navigator.vibrate) {
      try { navigator.vibrate([200, 100, 200, 100, 400]); } catch (_) {}
    }
  };

  const driverPhone = trip?.driverObj?.phone || trip?.driverPhone || '+91 94471 23456';

  const handleCall = () => {
    window.open(`tel:${driverPhone.replace(/[^\d+]/g, '')}`, '_system');
  };

  const handleChat = () => {
    const cleanNum = driverPhone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanNum}?text=${encodeURIComponent(`Hi ${trip.driver || 'Chauffeur'}, regarding Ridingo trip ${trip.id}`)}`, '_blank');
  };

  return (
    <div className="layer on" id="u-tracking-layer" style={{ zIndex: 95 }}>
      <div className="scrim" onClick={() => setLiveTrackingOpen(false)} />

      <div className="sheet no-scroll-anim" role="dialog" aria-modal="true" style={{ maxHeight: '92%', bottom: 0, paddingBottom: 0 }}>
        {/* Sticky Header: Small bar (grab) + Title + Close icon */}
        <div className="sheet-sticky-top" style={{ padding: '8px 18px 2px' }}>
          <div className="grab" />
          <div className="sheet-h">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              {isStarted ? (
                <span
                  className="pill good"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: 700
                  }}
                >
                  <span className="live-pulse-dot" style={{ background: '#22C55E' }} />
                  LIVE GPS TRACKING
                </span>
              ) : isArrived ? (
                <span
                  className="pill good"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: 'rgba(34, 197, 94, 0.15)',
                    color: 'var(--good)'
                  }}
                >
                  <span className="live-pulse-dot" style={{ background: '#16A34A' }} />
                  CHAUFFEUR AT PICKUP
                </span>
              ) : isReady ? (
                <span
                  className="pill good"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: 'rgba(34, 197, 94, 0.15)',
                    color: 'var(--good)'
                  }}
                >
                  <span className="live-pulse-dot" style={{ background: '#16A34A' }} />
                  READY TO START
                </span>
              ) : isAccepted ? (
                <span
                  className="pill good"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: 'rgba(34, 197, 94, 0.15)',
                    color: 'var(--good)'
                  }}
                >
                  <span className="live-pulse-dot" style={{ background: '#16A34A' }} />
                  CHAUFFEUR CONFIRMED
                </span>
              ) : (
                <span
                  className="pill warn"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: 'rgba(250, 204, 21, 0.2)',
                    color: 'var(--warn)'
                  }}
                >
                  <span className="live-pulse-dot" style={{ background: '#F59E0B' }} />
                  WAITING FOR DRIVER
                </span>
              )}
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)' }}>
                {trip.id}
              </span>
            </div>
            <button
              className="iconbtn"
              onClick={() => setLiveTrackingOpen(false)}
              aria-label="Close"
            >
              <Icon name="x" size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Body with Smooth Vertical Scrolling Behavior */}
        <div
          className="sheet-scroll-body"
          style={{
            flex: 1,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorY: 'contain',
            scrollBehavior: 'smooth',
            padding: '10px 18px max(14px, env(safe-area-inset-bottom, 0px))',
            scrollbarWidth: 'none'
          }}
        >
          {/* Top Center Graphic Map UI Viewport - STRICTLY rendered ONLY after driver starts trip */}
          {isStarted && (
            <div className="live-sheet-map-wrap" style={{ height: '275px', marginBottom: '14px', borderRadius: '20px' }}>
              <GraphicLiveMap
                trip={liveTripData}
                isModal={true}
                height={275}
              />
            </div>
          )}

          {isWaiting ? (
            /* ==========================================================
               1. WAITING FOR DRIVER CONFIRMATION VIEW (NO MAP)
               ========================================================== */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Radar Searching Animation Card */}
              <div
                className="card"
                style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  borderRadius: '20px',
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <div style={{ position: 'relative', width: '68px', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(255, 199, 10, 0.25)', animation: 'pulse 1.8s infinite' }} />
                  <div style={{ position: 'absolute', inset: '6px', borderRadius: '50%', background: 'rgba(255, 199, 10, 0.15)', animation: 'pulse 2.4s infinite' }} />
                  <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: 'var(--yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111827', zIndex: 2 }}>
                    <Icon name="clock" size={24} />
                  </div>
                </div>

                <div>
                  <b style={{ fontSize: '17px', color: 'var(--ink)', display: 'block' }}>
                    Finding Your Chauffeur...
                  </b>
                  <span style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
                    Broadcasting your request to certified drivers near {cleanLocationName(typeof trip?.pickup === 'string' && trip.pickup ? trip.pickup.split(',')[0] : 'Edappally Toll')}
                  </span>
                </div>

                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 14px', borderRadius: '999px', background: 'var(--field)', fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>
                  <span className="live-pulse-dot" style={{ background: '#22C55E' }} />
                  <span>Dispatched to nearest verified chauffeurs</span>
                </div>
              </div>

              {/* Trip Summary Card */}
              <div className="card" style={{ padding: '16px', borderRadius: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 750, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em' }}>
                    {String(trip?.cat || 'hourly').toUpperCase()} CHAUFFEUR SERVICE
                  </span>
                  <b style={{ fontSize: '17px', color: 'var(--ink)' }}>₹{trip?.fare || 600}</b>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, overflow: 'hidden' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22C55E', flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', color: 'var(--ink)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={trip?.pickup}>
                      <b>Pickup:</b> {getLocationUpToFirstComma(trip?.pickup) || 'Edappally Toll'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, overflow: 'hidden' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', color: 'var(--ink)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={trip?.drop_loc}>
                      <b>Drop:</b> {getLocationUpToFirstComma(trip?.drop_loc) || 'City Route'}
                    </span>
                  </div>
                  {trip?.distanceText && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', fontSize: '12px', color: 'var(--muted)' }}>
                      <span style={{ fontWeight: 600 }}>Route: {trip.distanceText}</span>
                      <span>·</span>
                      <span style={{ fontWeight: 600 }}>ETA: ~{trip.durationText || '25 mins'}</span>
                    </div>
                  )}
                </div>

                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--line)' }}>
                  Gearbox: {trip?.trans || trip?.car?.trans || 'Automatic'} Transmission
                </div>
              </div>

              {/* Cancel Trip Button */}
              <div style={{ marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (setTripToCancel) {
                      setTripToCancel(trip);
                    } else if (cancelTripByUser) {
                      cancelTripByUser(trip.id);
                      if (setActiveTrackingTripId) setActiveTrackingTripId(null);
                      setLiveTrackingOpen(false);
                    } else if (declineTrip) {
                      declineTrip(trip.id);
                      if (setActiveTrackingTripId) setActiveTrackingTripId(null);
                      setLiveTrackingOpen(false);
                    } else {
                      setTrips(prev => prev.filter(t => t.id !== trip.id));
                      if (setActiveTrackingTripId) setActiveTrackingTripId(null);
                      setLiveTrackingOpen(false);
                    }
                  }}
                  style={{
                    width: '100%',
                    height: '46px',
                    borderRadius: '14px',
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1.5px solid rgba(239, 68, 68, 0.28)',
                    color: '#DC2626',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Icon name="x" size={16} color="#DC2626" />
                  <span>Cancel Trip</span>
                </button>
              </div>
            </div>
          ) : isDriverAssigned ? (
            /* ==========================================================
               2. CHAUFFEUR ACCEPTED / ARRIVED · REACHING PICKUP
               ========================================================== */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Live Real GPS Google Map Route from Driver Location -> Pickup */}
              <div style={{ height: '240px', borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--line)', position: 'relative' }}>
                <GraphicLiveMap
                  trip={liveTripData}
                  isModal={true}
                  height={240}
                />
              </div>

              {/* Quick Stats Grid: ETA & Distance to Pickup */}
              <div
                className="live-sheet-stats-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '8px'
                }}
              >
                <div className="live-sheet-stat-card card" style={{ padding: '8px 6px', textAlign: 'center' }}>
                  <span className="lbl" style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600, display: 'block' }}>ETA TO PICKUP</span>
                  <b className="val" style={{ fontSize: '15px', color: 'var(--ink)', fontWeight: 800 }}>
                    {isArrived ? 'Arrived' : `${etaMins} mins`}
                  </b>
                </div>
                <div className="live-sheet-stat-card card" style={{ padding: '8px 6px', textAlign: 'center' }}>
                  <span className="lbl" style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600, display: 'block' }}>DISTANCE</span>
                  <b className="val" style={{ fontSize: '15px', color: 'var(--ink)', fontWeight: 800 }}>
                    {isArrived ? '0.0 km' : distLeft}
                  </b>
                </div>
                <div className="live-sheet-stat-card card" style={{ padding: '8px 6px', textAlign: 'center' }}>
                  <span className="lbl" style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600, display: 'block' }}>CHAUFFEUR</span>
                  <b className="val" style={{ fontSize: '15px', color: '#16A34A', fontWeight: 800 }}>
                    {isArrived ? 'At Pickup' : 'En Route'}
                  </b>
                </div>
              </div>

              {/* 4-DIGIT PICKUP OTP FOR CHAUFFEUR VERIFICATION */}
              <div
                style={{
                  background: '#000000',
                  color: '#FFFFFF',
                  borderRadius: '16px',
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
                  border: '1.5px solid #27272A'
                }}
              >
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>
                    Trip Pickup OTP
                  </span>
                  <span style={{ fontSize: '11px', color: '#94A3B8', display: 'block', marginTop: '1px' }}>
                    Share with chauffeur upon arrival
                  </span>
                </div>
                <div style={{ fontSize: '26px', fontWeight: 900, letterSpacing: '6px', color: '#FFFFFF', fontFamily: 'monospace' }}>
                  {trip.startOtp || '4821'}
                </div>
              </div>

              {/* Driver Contact Row with Call & WhatsApp Buttons */}
              <ContactProfileCard
                name={trip.driver || 'Ravi Kumar'}
                role="Assigned Chauffeur"
                phone={trip.driverObj?.phone || '+91 94471 23456'}
                rating="4.9"
                style={{
                  background: 'var(--card)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}
              />

              {/* Action Buttons: Share Ride (Outline Black) & Emergency SOS (Red BG) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px', marginBottom: '14px' }}>
                <button
                  type="button"
                  onClick={handleShareTrip}
                  style={{
                    flex: 1,
                    height: '46px',
                    borderRadius: '14px',
                    background: '#FFFFFF',
                    color: '#000000',
                    border: '1.5px solid #000000',
                    fontSize: '13px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '7px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)'
                  }}
                >
                  <Icon name="share" size={16} style={{ color: '#000000' }} />
                  <span>Share Ride</span>
                </button>

                <button
                  type="button"
                  onClick={handleSos}
                  style={{
                    flex: 1.15,
                    height: '46px',
                    borderRadius: '14px',
                    background: '#EF4444',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '7px',
                    cursor: 'pointer',
                    boxShadow: '0 3px 12px rgba(239, 68, 68, 0.35)'
                  }}
                >
                  <Icon name="alert-triangle" size={16} color="#FFFFFF" />
                  <span>Emergency SOS</span>
                </button>
              </div>
            </div>
          ) : (
            /* ==========================================================
               3. ACTIVE IN-PROGRESS LIVE TRACKING VIEW (WITH LIVE MAP)
               ========================================================== */
            <>


              {/* Quick Stats Grid */}
              <div
                className="live-sheet-stats-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '8px',
                  marginBottom: '10px'
                }}
              >
                <div className="live-sheet-stat-card card" style={{ padding: '8px 6px', textAlign: 'center' }}>
                  <span className="lbl" style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600, display: 'block' }}>ETA</span>
                  <b className="val" style={{ fontSize: '16px', color: 'var(--ink)', fontWeight: 800 }}>{etaMins} mins</b>
                </div>
                <div className="live-sheet-stat-card card" style={{ padding: '8px 6px', textAlign: 'center' }}>
                  <span className="lbl" style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600, display: 'block' }}>Distance Left</span>
                  <b className="val" style={{ fontSize: '16px', color: 'var(--ink)', fontWeight: 800 }}>{distLeft}</b>
                </div>
                <div className="live-sheet-stat-card card" style={{ padding: '8px 6px', textAlign: 'center' }}>
                  <span className="lbl" style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600, display: 'block' }}>Live Speed</span>
                  <b className="val" style={{ fontSize: '16px', color: 'var(--ink)', fontWeight: 800 }}>{liveSpeed} km/h</b>
                </div>
              </div>

              {/* Driver Profile Card */}
              <div
                className="live-driver-profile-card card"
                style={{
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ position: 'relative' }}>
                    <span className="av lg" style={{ width: '44px', height: '44px', fontWeight: 700, fontSize: '15px' }}>
                      RK
                    </span>
                    <span
                      style={{
                        position: 'absolute',
                        bottom: -2,
                        right: -2,
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: '#22C55E',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        boxShadow: '0 0 0 2px var(--card)'
                      }}
                      title="Verified Professional Chauffeur"
                    >
                      <Icon name="check" size={10} color="#FFFFFF" />
                    </span>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <b style={{ fontSize: '15px', color: 'var(--ink)' }}>{trip.driver || 'Ravi Kumar'}</b>
                      <span
                        style={{
                          background: 'rgba(255, 199, 10, 0.2)',
                          color: 'var(--on-yellow)',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '6px'
                        }}
                      >
                        Rating 4.8
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                      Certified Chauffeur · {trip?.trans || trip?.car?.trans || 'Automatic'} Transmission
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="iconbtn"
                    onClick={handleCall}
                    title="Call Driver"
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: 'transparent',
                      border: '1.5px solid var(--ink, #0F172A)',
                      color: 'var(--ink, #0F172A)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    <Icon name="phone" size={16} />
                  </button>
                  <button
                    className="iconbtn"
                    onClick={handleChat}
                    title="WhatsApp Driver"
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: '#25D366',
                      border: 'none',
                      color: '#FFFFFF',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: 0,
                      boxShadow: '0 3px 10px rgba(37, 211, 102, 0.35)'
                    }}
                  >
                    <Icon name="whatsapp" size={19} color="#FFFFFF" />
                  </button>
                </div>
              </div>

              {/* Route Timeline */}
              <div className="card" style={{ padding: '10px 12px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', position: 'relative' }}>
                  {/* Vertical connector line */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '18px',
                      bottom: '18px',
                      left: '7px',
                      width: '2px',
                      background: 'var(--line)',
                      zIndex: 1
                    }}
                  />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%', zIndex: 2 }}>
                    {/* Pickup Row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: '#22C55E',
                          boxShadow: '0 0 0 3px rgba(34, 197, 94, 0.25)',
                          flex: 'none'
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                        <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
                          Pickup
                        </span>
                        <b
                          style={{
                            fontSize: '13.5px',
                            color: 'var(--ink)',
                            display: 'block',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                          title={trip.pickup}
                        >
                          {getLocationUpToFirstComma(trip.pickup)}
                        </b>
                      </div>
                    </div>

                    {/* Drop Row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: '#EF4444',
                          boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.25)',
                          flex: 'none'
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                        <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
                          Destination
                        </span>
                        <b
                          style={{
                            fontSize: '13.5px',
                            color: 'var(--ink)',
                            display: 'block',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                          title={trip.drop_loc}
                        >
                          {getLocationUpToFirstComma(trip.drop_loc)}
                        </b>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Share Ride (Outline Black) & Emergency SOS (Red BG) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '14px', marginBottom: '16px' }}>
                <button
                  type="button"
                  onClick={handleShareTrip}
                  style={{
                    flex: 1,
                    height: '46px',
                    borderRadius: '14px',
                    background: '#FFFFFF',
                    color: '#000000',
                    border: '1.5px solid #000000',
                    fontSize: '13px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '7px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)'
                  }}
                >
                  <Icon name="share" size={16} style={{ color: '#000000' }} />
                  <span>Share Ride</span>
                </button>

                <button
                  type="button"
                  onClick={handleSos}
                  style={{
                    flex: 1.15,
                    height: '46px',
                    borderRadius: '14px',
                    background: '#EF4444',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '7px',
                    cursor: 'pointer',
                    boxShadow: '0 3px 12px rgba(239, 68, 68, 0.35)'
                  }}
                >
                  <Icon name="alert-triangle" size={16} color="#FFFFFF" />
                  <span>Emergency SOS</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Trip Ticket Modal with filled image preview, direct image share, download, and copy */}
      <TripTicketModal
        trip={trip}
        isOpen={ticketModalOpen}
        onClose={() => setTicketModalOpen(false)}
        addToast={addToast}
      />
    </div>
  );
}
