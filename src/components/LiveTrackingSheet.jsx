import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import Icon from './Icon';
import GraphicLiveMap, { getRouteTelemetry } from './GraphicLiveMap';
import { openInGoogleMaps } from '../services/googleMapsService';
import ContactProfileCard from './ContactProfileCard';

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
    cancelTripByUser
  } = useApp();

  const activeTrip = (activeTrackingTripId ? trips.find(t => t.id === activeTrackingTripId && isUserTrip(t, user)) : null) ||
                     trips.find(t => isUserTrip(t, user) && ['inprogress', 'ending_otp'].includes(t.status)) ||
                     trips.find(t => isUserTrip(t, user) && ['accepted', 'pickup_arrived', 'ready_to_start'].includes(t.status)) ||
                     trips.find(t => isUserTrip(t, user) && t.status === 'requested') ||
                     trips.find(t => isUserTrip(t, user));

  const trip = activeTrip || {
    id: 'TRP-1092',
    cat: 'hourly',
    qty: 2,
    pickup: 'Edappally Toll, Kochi',
    drop_loc: 'City Route',
    fare: 600,
    advance: 180,
    status: 'requested',
    trans: 'Automatic',
    car: { trans: 'Automatic' },
    rider: { name: user?.name || 'Customer', phone: user?.phone || '+91 98401 23456' }
  };

  const isStarted = ['inprogress', 'ending_otp', 'invoice_pending'].includes(trip.status);
  const isDriverAssigned = ['accepted', 'pickup_arrived', 'ready_to_start'].includes(trip.status);
  const isArrived = trip.status === 'pickup_arrived';
  const isReady = trip.status === 'ready_to_start';
  const isAccepted = trip.status === 'accepted';
  const isWaiting = trip.status === 'requested';

  // Dynamic telemetry simulation - strictly running only when trip is in progress
  const [progress, setProgress] = useState(0.38);
  const [speed, setSpeed] = useState(38);

  const remaining = Math.max(0.05, 1 - progress);
  const etaMins = Math.max(1, Math.round(remaining * 16));
  const distLeft = (remaining * 5.2).toFixed(1);

  useEffect(() => {
    if (!liveTrackingOpen || !isStarted) return;
    const interval = setInterval(() => {
      setProgress(prev => {
        const next = prev >= 0.95 ? 0.2 : prev + 0.005;
        return parseFloat(next.toFixed(4));
      });
      const wave = Math.sin(Date.now() / 2500);
      setSpeed(Math.max(26, Math.min(56, Math.round(38 + wave * 9 + (Math.random() * 4 - 2)))));
    }, 1200);

    return () => clearInterval(interval);
  }, [liveTrackingOpen, isStarted]);

  // Nearing destination alert (around 1 km)
  useEffect(() => {
    if (!liveTrackingOpen) return;
    if (isStarted && parseFloat(distLeft) <= 1.0 && !trip.approachingNotified) {
      setTrips(prev =>
        prev.map(t => (t.id === trip.id ? { ...t, approachingNotified: true } : t))
      );
      addToast('Approaching destination (around 1 km). Trip will complete shortly.', 'info');
    }
  }, [liveTrackingOpen, isStarted, distLeft, trip.id, trip.approachingNotified]);

  if (!liveTrackingOpen) return null;

  const handleShareTrip = () => {
    navigator.clipboard?.writeText?.(`https://ridingo.app/track/${trip.id}`);
    addToast('Live tracking link copied to clipboard!', 'check');
  };

  const handleSos = () => {
    addToast('Emergency SOS alert activated! Police & contacts notified.', 'warn');
  };

  const handleCall = () => {
    addToast('Calling driver Ravi Kumar (+91 98401 88888)...', 'info');
  };

  const handleChat = () => {
    addToast('Opening WhatsApp chat with driver...', 'info');
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
                trip={trip}
                isModal={true}
                height={275}
                progress={progress}
                speed={speed}
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
                    Broadcasting your request to certified drivers near {typeof trip?.pickup === 'string' && trip.pickup ? trip.pickup.split(',')[0] : 'Edappally Toll'}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22C55E', flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', color: 'var(--ink)' }}><b>Pickup:</b> {trip?.pickup || 'Edappally Toll, Kochi'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', color: 'var(--ink)' }}><b>Drop:</b> {trip?.drop_loc || 'City Route'}</span>
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

              {/* Cancel Request Button */}
              <button
                type="button"
                onClick={() => {
                  if (cancelTripByUser) {
                    cancelTripByUser(trip.id);
                  } else if (declineTrip) {
                    declineTrip(trip.id);
                  } else {
                    setTrips(prev => prev.filter(t => t.id !== trip.id));
                  }
                  if (setActiveTrackingTripId) setActiveTrackingTripId(null);
                  setLiveTrackingOpen(false);
                }}
                style={{
                  width: '100%',
                  height: '46px',
                  borderRadius: '14px',
                  background: 'var(--field)',
                  border: '1px solid var(--line)',
                  color: '#DC2626',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Icon name="x" size={15} />
                <span>Cancel Request</span>
              </button>
            </div>
          ) : isDriverAssigned ? (
            /* ==========================================================
               2. CHAUFFEUR ACCEPTED / ARRIVED · REACHING PICKUP
               ========================================================== */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div
                className="card"
                style={{
                  padding: '20px 16px',
                  borderRadius: '20px',
                  background: 'var(--card)',
                  border: '1px solid var(--line)',
                  textAlign: 'center'
                }}
              >
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: isArrived ? 'rgba(34, 197, 94, 0.25)' : 'rgba(34, 197, 94, 0.15)', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <Icon name={isArrived ? 'pin' : 'check'} size={26} color="#16A34A" />
                </div>
                <b style={{ fontSize: '17px', color: 'var(--ink)', display: 'block' }}>
                  {isArrived ? 'Chauffeur Arrived at Pickup!' : isReady ? 'Vehicle Inspected · Ready!' : 'Chauffeur Confirmed!'}
                </b>
                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '6px 0 14px', lineHeight: 1.4 }}>
                  {isArrived ? (
                    <><b>{trip.driver || 'Ravi Kumar'}</b> has reached your pickup point. Share the OTP below to begin your journey.</>
                  ) : isReady ? (
                    <>Vehicle inspection completed. Chauffeur is verifying OTP to begin the ride.</>
                  ) : (
                    <><b>{trip.driver || 'Ravi Kumar'}</b> has accepted your booking and is reaching your pickup point.</>
                  )}
                </p>

                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '999px', background: 'var(--field)', fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>
                  <span className="live-pulse-dot" style={{ background: '#22C55E' }} />
                  <span>{isArrived ? 'Share OTP with chauffeur' : 'Live GPS tracking will activate when chauffeur starts trip'}</span>
                </div>
              </div>

              {/* 4-DIGIT PICKUP OTP FOR CHAUFFEUR VERIFICATION */}
              {/* Pickup OTP Banner */}
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
                    Trip OTP
                  </span>
                  <span style={{ fontSize: '11px', color: '#94A3B8', display: 'block', marginTop: '1px' }}>
                    Share with chauffeur upon arrival
                  </span>
                </div>
                <div style={{ fontSize: '26px', fontWeight: 900, letterSpacing: '6px', color: '#FFFFFF', fontFamily: 'monospace' }}>
                  {trip.startOtp || '4821'}
                </div>
              </div>

              {/* Driver Contact Row with Consistent Call & WhatsApp Buttons */}
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

              {/* Trip Confirmed Lock Indicator - User cannot cancel once accepted */}
              <div
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '14px',
                  background: 'var(--field)',
                  border: '1px solid var(--line)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  color: 'var(--muted)',
                  fontSize: '12.5px',
                  fontWeight: 650
                }}
              >
                <Icon name="shield" size={15} />
                <span>Trip confirmed. Cancellation is locked as chauffeur is en route.</span>
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
                  <b className="val" style={{ fontSize: '16px', color: 'var(--ink)', fontWeight: 800 }}>{distLeft} km</b>
                </div>
                <div className="live-sheet-stat-card card" style={{ padding: '8px 6px', textAlign: 'center' }}>
                  <span className="lbl" style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600, display: 'block' }}>Live Speed</span>
                  <b className="val" style={{ fontSize: '16px', color: 'var(--ink)', fontWeight: 800 }}>{speed} km/h</b>
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
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
                          Pickup
                        </span>
                        <b style={{ fontSize: '13.5px', color: 'var(--ink)' }}>{trip.pickup}</b>
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
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
                          Destination
                        </span>
                        <b style={{ fontSize: '13.5px', color: 'var(--ink)' }}>{trip.drop_loc}</b>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Google Maps, Share Trip & Emergency SOS */}
              <div className="live-sheet-actions-wrap">
                <button
                  type="button"
                  className="live-act-btn live-btn-gmaps"
                  onClick={() => openInGoogleMaps({
                    origin: trip?.pickupCoords?.lat ? trip.pickupCoords : trip?.pickup,
                    destination: trip?.dropCoords?.lat ? trip.dropCoords : trip?.drop_loc
                  })}
                  title="Open live route in Google Maps app"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#4285F4"/>
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 2.6 1.13 5.38 2.76 8.04L12 11V2z" fill="#EA4335"/>
                    <path d="M12 11l5.24 7.04C18.87 15.38 20 12.6 20 10c0-4.42-3.58-8-8-8v9z" fill="#FBBC04"/>
                    <path d="M6.76 18.04C8.24 20.46 10.12 22 12 22s3.76-1.54 5.24-3.96L12 11l-5.24 7.04z" fill="#34A853"/>
                    <circle cx="12" cy="9" r="3" fill="#FFFFFF"/>
                  </svg>
                  <span>Google Maps</span>
                </button>

                <button
                  type="button"
                  className="live-act-btn live-btn-share"
                  onClick={handleShareTrip}
                >
                  <Icon name="share" size={16} />
                  <span>Share Trip</span>
                </button>

                <button
                  type="button"
                  className="live-act-btn live-btn-sos"
                  onClick={handleSos}
                >
                  <Icon name="shield" size={16} />
                  <span>Emergency SOS</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
