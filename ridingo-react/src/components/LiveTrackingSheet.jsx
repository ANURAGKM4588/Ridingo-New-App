import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import Icon from './Icon';
import GraphicLiveMap, { getRouteTelemetry } from './GraphicLiveMap';

export default function LiveTrackingSheet() {
  const { liveTrackingOpen, setLiveTrackingOpen, trips, user, addToast } = useApp();

  const trip = trips.find(t => t.status === 'inprogress') || trips[0];

  // Dynamic telemetry simulation
  const [progress, setProgress] = useState(0.38);
  const [speed, setSpeed] = useState(38);

  useEffect(() => {
    if (!liveTrackingOpen) return;
    const interval = setInterval(() => {
      setProgress(prev => {
        const next = prev >= 0.95 ? 0.2 : prev + 0.005;
        return parseFloat(next.toFixed(4));
      });
      const wave = Math.sin(Date.now() / 2500);
      setSpeed(Math.max(26, Math.min(56, Math.round(38 + wave * 9 + (Math.random() * 4 - 2)))));
    }, 1200);

    return () => clearInterval(interval);
  }, [liveTrackingOpen]);

  if (!liveTrackingOpen || !trip) return null;

  const remaining = Math.max(0.05, 1 - progress);
  const etaMins = Math.max(1, Math.round(remaining * 16));
  const distLeft = (remaining * 5.2).toFixed(1);

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

      <div className="sheet no-scroll-anim" role="dialog" aria-modal="true" style={{ maxHeight: '90%' }}>
        {/* Sticky Header: Small bar (grab) + Title + Close icon */}
        <div className="sheet-sticky-top" style={{ padding: '8px 18px 2px' }}>
          <div className="grab" />
          <div className="sheet-h">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
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
                LIVE TRACKING
              </span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)' }}>
                {trip.id}
              </span>
            </div>
            <button
              className="iconbtn"
              onClick={() => setLiveTrackingOpen(false)}
              aria-label="Close live tracking"
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
            padding: '10px 18px 24px',
            scrollbarWidth: 'none'
          }}
        >
          {/* Top Center Graphic Map UI Viewport - Big High-Fidelity Map */}
          <div className="live-sheet-map-wrap" style={{ height: '275px', marginBottom: '14px', borderRadius: '20px' }}>
            <GraphicLiveMap
              trip={trip}
              isModal={true}
              height={275}
              progress={progress}
              speed={speed}
            />
          </div>

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
                  ✓
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
                    ★ 4.8
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                  Driving your {user?.car?.model || trip.car?.model} · <b style={{ fontWeight: 600 }}>{user?.car?.plate || trip.car?.plate}</b>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="iconbtn"
                onClick={handleCall}
                title="Call Driver"
                style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'var(--field)', border: '1px solid var(--line)' }}
              >
                <Icon name="phone" size={17} />
              </button>
              <button
                className="iconbtn"
                onClick={handleChat}
                title="WhatsApp Driver"
                style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'var(--field)', border: '1px solid var(--line)', color: '#22C55E' }}
              >
                <Icon name="chat" size={17} />
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

          {/* Action Buttons: Share & Emergency SOS (Single Line Text, lifted higher up) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px', marginBottom: '12px' }}>
            <button
              className="btn line"
              onClick={handleShareTrip}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                height: '42px',
                borderRadius: '13px',
                fontSize: '13px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                padding: '0 6px',
                cursor: 'pointer'
              }}
            >
              <Icon name="share" size={15} />
              <span style={{ whiteSpace: 'nowrap' }}>Share Trip</span>
            </button>

            <button
              className="btn"
              onClick={handleSos}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                height: '42px',
                borderRadius: '13px',
                fontSize: '13px',
                fontWeight: 700,
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#EF4444',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                whiteSpace: 'nowrap',
                padding: '0 6px',
                cursor: 'pointer'
              }}
            >
              <Icon name="shield" size={15} />
              <span style={{ whiteSpace: 'nowrap' }}>Emergency SOS</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
