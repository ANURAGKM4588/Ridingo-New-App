import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Icon from './Icon';
import BrandLogo from './BrandLogo';

const CATS = {
  hourly: { name: 'Hourly', icon: 'clock', unit: 'hr', units: 'hours' },
  daily: { name: 'Full day', icon: 'sun', unit: 'day', units: 'days' },
  airport: { name: 'Airport', icon: 'plane' },
  outstation: { name: 'Outstation', icon: 'route', unit: 'day', units: 'days' },
  event: { name: 'Night & events', icon: 'moon', unit: 'hr', units: 'hours' }
};

export default function DriverApp() {
  const {
    trips,
    setTrips,
    driverOnline,
    setDriverOnline,
    dTab,
    setDTab,
    theme,
    setTheme,
    addToast
  } = useApp();

  const [dFilter, setDFilter] = useState('all');

  // Interactive toggle states for Driver Profile (matching User App iOS style)
  const [tripPopupsOn, setTripPopupsOn] = useState(true);
  const [requestSoundOn, setRequestSoundOn] = useState(true);
  const [autoQueueOn, setAutoQueueOn] = useState(false);
  const [servicesEnabled, setServicesEnabled] = useState({
    hourly: true,
    daily: true,
    airport: true,
    outstation: true,
    event: true
  });
  const [biometricOn, setBiometricOn] = useState(true);
  const [hapticOn, setHapticOn] = useState(true);

  const toggleService = (key) => {
    setServicesEnabled(prev => {
      const next = { ...prev, [key]: !prev[key] };
      addToast(`${CATS[key]?.name || key} service ${next[key] ? 'enabled' : 'disabled'}`, 'check');
      return next;
    });
  };

  const requestedTrips = trips.filter(t => t.status === 'requested');
  const upcomingTrips = trips.filter(t => ['accepted', 'scheduled', 'inprogress'].includes(t.status));

  // Accept trip handler
  const handleAccept = (tripId) => {
    setTrips(prev =>
      prev.map(t => (t.id === tripId ? { ...t, status: 'inprogress', driver: 'Ravi Kumar' } : t))
    );
    addToast('Trip accepted! Navigating to customer pickup', 'check');
  };

  // Decline trip handler
  const handleDecline = (tripId) => {
    setTrips(prev => prev.filter(t => t.id !== tripId));
    addToast('Trip request dismissed', 'info');
  };

  // Complete trip handler
  const handleComplete = (tripId) => {
    setTrips(prev =>
      prev.map(t => (t.id === tripId ? { ...t, status: 'completed' } : t))
    );
    addToast('Trip completed! ₹ Fare added to your earnings', 'check');
  };

  // Mock earnings data for the 7-day chart
  const days = [
    { l: 'M', v: 1250, today: false },
    { l: 'T', v: 1800, today: false },
    { l: 'W', v: 950, today: false },
    { l: 'T', v: 2100, today: false },
    { l: 'F', v: 2450, today: false },
    { l: 'S', v: 3100, today: false },
    { l: 'S', v: 1495, today: true }
  ];
  const maxEarnings = Math.max(...days.map(d => d.v), 1);

  return (
    <div className="inner">
      <div className="island" aria-hidden="true" />
      <div className="statusbar">
        <span className="clock">9:41</span>
        <span className="sb-r" aria-hidden="true">
          <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor">
            <rect x="0" y="8" width="3" height="4" rx="1" />
            <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
            <rect x="10" y="3" width="3" height="9" rx="1" />
            <rect x="15" y="0" width="3" height="12" rx="1" />
          </svg>
          <svg width="17" height="12" viewBox="0 0 17 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M1.5 4.3a10 10 0 0 1 14 0" />
            <path d="M4 7a6.4 6.4 0 0 1 9 0" />
            <circle cx="8.5" cy="10" r="1" fill="currentColor" stroke="none" />
          </svg>
          <svg width="27" height="13" viewBox="0 0 27 13" fill="none">
            <rect x=".5" y=".5" width="22" height="12" rx="3.5" stroke="currentColor" opacity=".45" />
            <rect x="2" y="2" width="17" height="9" rx="2" fill="currentColor" />
            <path d="M24.5 4.5v4c.9-.3 1.5-1.1 1.5-2s-.6-1.7-1.5-2z" fill="currentColor" opacity=".5" />
          </svg>
        </span>
      </div>

      <div className="content" id="d-content">
        {/* ===================== DASHBOARD TAB ===================== */}
        {dTab === 'dash' && (
          <div>
            {/* Top Bar with Online Toggle */}
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: '16px' }}>
              <div className="row" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="av" style={{ width: '40px', height: '40px' }}>RK</span>
                <div>
                  <b style={{ font: '700 18px var(--font-display)', display: 'block' }}>Hi, Ravi</b>
                  <span className="sub">{driverOnline ? 'You can receive requests' : 'You are offline'}</span>
                </div>
              </div>
              <button
                className={`online ${driverOnline ? 'on' : ''}`}
                onClick={() => setDriverOnline(!driverOnline)}
                aria-pressed={driverOnline}
              >
                <i />
                {driverOnline ? 'Online' : 'Offline'}
              </button>
            </div>

            {/* Earnings Meter Card */}
            <div className="meter">
              <div className="lab">Today’s earnings</div>
              <div className="dig">₹1,495</div>
              <div className="mrow">
                <span>3 trips completed today</span>
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,.12)', marginTop: '12px', paddingTop: '12px' }}>
                <div className="lab">This month</div>
                <div className="dig sm">₹28,450</div>
                <div className="mrow">
                  <span>34 trips</span>
                </div>
              </div>
            </div>

            {/* 7-Day Performance Chart */}
            <div className="card" style={{ marginTop: '12px' }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <b>Last 7 days</b>
                <span className="sub">₹13,195</span>
              </div>
              <div className="bars">
                {days.map((d, i) => (
                  <div key={i} className={`bar ${d.today ? 'today' : ''}`}>
                    {(d.today || d.v === maxEarnings) && (
                      <em>{d.v >= 1000 ? (d.v / 1000).toFixed(1) + 'k' : d.v}</em>
                    )}
                    <i style={{ height: `${Math.max(6, Math.round((d.v / maxEarnings) * 70))}px` }} />
                    <span>{d.l}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Trip Requests Section */}
            <div className="sec">
              <h3>Trip requests</h3>
              <span>{driverOnline ? requestedTrips.length : 0} waiting</span>
            </div>

            {driverOnline && requestedTrips.length > 0 ? (
              <div className="stack">
                {requestedTrips.map(t => {
                  const c = CATS[t.cat] || CATS.hourly;
                  return (
                    <article key={t.id} className="card trip">
                      <div className="trip-head" style={{ paddingBottom: '10px' }}>
                        <span className="trip-ic">
                          <Icon name={c.icon} size={22} />
                        </span>
                        <span className="grow">
                          <b>{c.name}</b> <span className="mut">· {t.qty || 1} {c.unit || 'hr'}</span>
                          <span className="sub">{t.id}</span>
                        </span>
                        <span className="amt" style={{ fontSize: '16px', color: 'var(--ink)' }}>
                          ₹{t.fare}
                        </span>
                      </div>
                      <div className="trip-body">
                        <div className="route">
                          <div className="ell">{t.pickup}</div>
                          <div className="ell">{t.drop_loc || 'Stays with rider for trip'}</div>
                        </div>
                        <div className="row small" style={{ marginTop: '8px' }}>
                          <span className="mut grow ell">
                            {t.rider?.name || 'Customer'} · ★ 4.9 · {t.car?.model || 'Hyundai Creta'} ({t.car?.trans || 'Auto'})
                          </span>
                          <span className="pill done">1.2 km away</span>
                        </div>
                        <div className="actions" style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                          <button className="btn primary sm" style={{ flex: 1 }} onClick={() => handleAccept(t.id)}>
                            Accept
                          </button>
                          <button className="btn danger sm" style={{ flex: 1 }} onClick={() => handleDecline(t.id)}>
                            Decline
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty">
                {driverOnline ? 'No new requests. Stay online to receive trips.' : 'You are currently offline. Turn on toggle to receive trip requests.'}
              </div>
            )}

            {/* Upcoming / Active Trips */}
            <div className="sec">
              <h3>Upcoming trips</h3>
              <span>{upcomingTrips.length} booked</span>
            </div>

            {upcomingTrips.length > 0 ? (
              <div className="stack">
                {upcomingTrips.map(t => {
                  const c = CATS[t.cat] || CATS.hourly;
                  const isInProgress = t.status === 'inprogress';
                  return (
                    <article key={t.id} className="card trip">
                      <div className="trip-head" style={{ paddingBottom: '10px' }}>
                        <span className="trip-ic">
                          <Icon name={c.icon} size={22} />
                        </span>
                        <span className="grow">
                          <b>{c.name}</b> <span className="mut">· {t.qty || 1} {c.unit || 'hr'}</span>
                          <span className="sub">{t.id}</span>
                        </span>
                        <span className="amt" style={{ fontSize: '16px', color: 'var(--ink)' }}>
                          ₹{t.fare}
                        </span>
                      </div>
                      <div className="trip-body">
                        <div className="route">
                          <div className="ell">{t.pickup}</div>
                          <div className="ell">{t.drop_loc || 'Stays with rider for trip'}</div>
                        </div>
                        <div className="row small" style={{ marginTop: '8px' }}>
                          <span className="mut grow ell">
                            {t.rider?.name} · {t.car?.model}
                          </span>
                          <span className="pill good">{isInProgress ? 'On Trip' : 'Scheduled'}</span>
                        </div>
                        {isInProgress ? (
                          <button
                            className="btn primary sm block"
                            style={{ marginTop: '10px', width: '100%' }}
                            onClick={() => handleComplete(t.id)}
                          >
                            Complete trip & Collect Fare
                          </button>
                        ) : (
                          <button
                            className="btn solid sm block"
                            style={{ marginTop: '10px', width: '100%' }}
                            onClick={() => handleAccept(t.id)}
                          >
                            Start trip
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty">Accepted and scheduled trips show up here.</div>
            )}
          </div>
        )}

        {/* ===================== HISTORY TAB ===================== */}
        {dTab === 'history' && (
          <div>
            <div className="hello" style={{ marginBottom: '14px' }}>
              <h1>History</h1>
              <p>Every trip you accepted</p>
            </div>
            <div className="chips" style={{ marginBottom: '14px', display: 'flex', gap: '6px' }}>
              {['all', 'done', 'up'].map(k => (
                <button
                  key={k}
                  className={`chip ${dFilter === k ? 'on' : ''}`}
                  onClick={() => setDFilter(k)}
                >
                  {k === 'all' ? 'All' : k === 'done' ? 'Completed' : 'Upcoming'}
                </button>
              ))}
            </div>

            <div className="trip-list">
              {trips
                .filter(t => {
                  if (dFilter === 'done') return t.status === 'completed';
                  if (dFilter === 'up') return t.status !== 'completed';
                  return true;
                })
                .map(t => {
                  const c = CATS[t.cat] || CATS.hourly;
                  return (
                    <div key={t.id} className="trip-row">
                      <div className="trip-row-head">
                        <span className="trip-row-ic">
                          <Icon name={c.icon} size={22} />
                        </span>
                        <div className="trip-row-main">
                          <b className="trip-row-title ell">{t.drop_loc || t.pickup}</b>
                          <span className="trip-row-sub ell">
                            {c.name} · {t.rider?.name || 'Customer'}
                          </span>
                        </div>
                        <div className="trip-row-right">
                          <span className="trip-row-amt">₹{t.fare}</span>
                          <span className={`pill ${t.status === 'completed' ? 'done' : 'good'}`}>
                            {t.status === 'completed' ? 'Completed' : 'Active'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ===================== WALLET TAB ===================== */}
        {dTab === 'wallet' && (
          <div>
            <div className="hello" style={{ marginBottom: '14px' }}>
              <h1>Wallet</h1>
              <p>Your Ridingo earnings</p>
            </div>

            <div className="walletcard">
              <div className="walletcard-head">
                <span className="walletcard-brand">Ridingo Partner</span>
                <span className="walletcard-pill">Digital Wallet</span>
              </div>
              <div className="walletcard-lab">Available Balance</div>
              <div className="walletcard-bal">₹4,850</div>
              <div className="walletcard-foot">
                <button
                  className="walletcard-add-btn"
                  onClick={() => addToast('Withdrawal of ₹4,850 initiated to HDFC Bank', 'check')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M7 17L17 7M17 7H7M17 7V17" />
                  </svg>
                  <span>Withdraw</span>
                </button>
                <span className="walletcard-cb">Total ₹34,500</span>
              </div>
            </div>

            <div className="sec" style={{ margin: '22px 0 10px' }}>
              <h3>Transaction</h3>
              <span className="sub" style={{ fontWeight: 600, color: 'var(--muted)' }}>View All</span>
            </div>

            <div className="tx-list">
              <div className="tx">
                <span className="tx-badge">T</span>
                <div className="tx-main">
                  <b className="tx-title ell">Trip TRP-1085 Earning</b>
                  <span className="tx-sub ell">Driver Pay · Today</span>
                </div>
                <span className="tx-amt pos">+₹699</span>
              </div>
              <div className="tx">
                <span className="tx-badge">W</span>
                <div className="tx-main">
                  <b className="tx-title ell">Bank Transfer to HDFC</b>
                  <span className="tx-sub ell">Withdrawal · Yesterday</span>
                </div>
                <span className="tx-amt">-₹5,000</span>
              </div>
            </div>
          </div>
        )}

        {/* ===================== PROFILE TAB ===================== */}
        {dTab === 'profile' && (
          <div style={{ paddingBottom: '32px' }}>
            {/* 1. Header */}
            <div className="hello" style={{ marginBottom: '16px' }}>
              <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: 'var(--ink)' }}>
                Profile
              </h1>
              <p style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '4px', margin: 0 }}>
                Driver partner & preferences
              </p>
            </div>

            {/* 2. Driver Profile Card (Same style as User App Profile Card) */}
            <div className="card prof-card" style={{ padding: '16px', borderRadius: '20px', marginBottom: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                  {/* Avatar with Camera badge */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        background: 'var(--yellow)',
                        color: '#111827',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        fontWeight: 800,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                      }}
                    >
                      RK
                    </div>
                    <div
                      style={{
                        position: 'absolute',
                        bottom: -1,
                        right: -1,
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: '#111827',
                        border: '2px solid var(--card)',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                      onClick={() => addToast('Change partner photo', 'info')}
                      title="Change Photo"
                    >
                      <Icon name="camera" size={11} />
                    </div>
                  </div>

                  {/* Driver Meta */}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <b style={{ fontSize: '17px', fontWeight: 700, color: 'var(--ink)', display: 'block', lineHeight: 1.25 }}>
                      Ravi Kumar
                    </b>
                    <span style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: '3px', display: 'block' }}>
                      ★ 4.8 · 142 trips on Ridingo
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => addToast('Driver partner details verified', 'check')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '6px 8px',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: 'var(--ink)',
                    cursor: 'pointer'
                  }}
                >
                  Edit
                </button>
              </div>

              {/* Verified Chauffeur & Partner Badges */}
              <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    background: 'rgba(34, 197, 94, 0.14)',
                    color: '#16A34A',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '999px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    letterSpacing: '0.01em'
                  }}
                >
                  Verified Chauffeur
                </span>
                <span style={{ fontSize: '12.5px', color: 'var(--muted)', fontWeight: 500 }}>
                  Partner since 2024
                </span>
              </div>
            </div>

            {/* 3. TRIP REQUESTS */}
            <div className="prof-section-title">Trip Requests</div>
            <div className="card" style={{ padding: '0 16px', borderRadius: '18px', marginBottom: '20px' }}>
              {/* Row 1: Trip request popups */}
              <div className="prof-set-row">
                <div className="prof-set-info">
                  <b className="prof-set-title">Trip Request Popups</b>
                  <span className="prof-set-sub">Show instant popup notification for nearby bookings</span>
                </div>
                <button
                  type="button"
                  className={`ios-toggle ${tripPopupsOn ? 'on' : ''}`}
                  onClick={() => {
                    setTripPopupsOn(!tripPopupsOn);
                    addToast(!tripPopupsOn ? 'Trip popups enabled' : 'Trip popups disabled', 'check');
                  }}
                  aria-label="Toggle Trip Popups"
                >
                  <span className="ios-toggle-thumb" />
                </button>
              </div>

              {/* Row 2: Request sound */}
              <div className="prof-set-row">
                <div className="prof-set-info">
                  <b className="prof-set-title">Request Sound Alert</b>
                  <span className="prof-set-sub">Play chime sound when booking request is received</span>
                </div>
                <button
                  type="button"
                  className={`ios-toggle ${requestSoundOn ? 'on' : ''}`}
                  onClick={() => {
                    setRequestSoundOn(!requestSoundOn);
                    addToast(!requestSoundOn ? 'Request audio alert enabled' : 'Request audio alert muted', 'check');
                  }}
                  aria-label="Toggle Request Sound"
                >
                  <span className="ios-toggle-thumb" />
                </button>
              </div>

              {/* Row 3: Auto-queue next booking */}
              <div className="prof-set-row">
                <div className="prof-set-info">
                  <b className="prof-set-title">Auto-Queue Next Booking</b>
                  <span className="prof-set-sub">Automatically queue next trip when current completes</span>
                </div>
                <button
                  type="button"
                  className={`ios-toggle ${autoQueueOn ? 'on' : ''}`}
                  onClick={() => {
                    setAutoQueueOn(!autoQueueOn);
                    addToast(!autoQueueOn ? 'Auto-queueing enabled' : 'Auto-queueing disabled', 'check');
                  }}
                  aria-label="Toggle Auto-Queue"
                >
                  <span className="ios-toggle-thumb" />
                </button>
              </div>
            </div>

            {/* 4. SERVICES I ACCEPT */}
            <div className="prof-section-title">Services I Accept</div>
            <div className="card" style={{ padding: '0 16px', borderRadius: '18px', marginBottom: '20px' }}>
              {/* Hourly */}
              <div className="prof-set-row">
                <div className="prof-set-info">
                  <b className="prof-set-title">Hourly Chauffeur</b>
                  <span className="prof-set-sub">₹250/hr · 2 to 12 hours minimum booking</span>
                </div>
                <button
                  type="button"
                  className={`ios-toggle ${servicesEnabled.hourly ? 'on' : ''}`}
                  onClick={() => toggleService('hourly')}
                  aria-label="Toggle Hourly Chauffeur"
                >
                  <span className="ios-toggle-thumb" />
                </button>
              </div>

              {/* Full Day */}
              <div className="prof-set-row">
                <div className="prof-set-info">
                  <b className="prof-set-title">Full Day Chauffeur</b>
                  <span className="prof-set-sub">₹1,800/day · 8 hours dedicated chauffeur service</span>
                </div>
                <button
                  type="button"
                  className={`ios-toggle ${servicesEnabled.daily ? 'on' : ''}`}
                  onClick={() => toggleService('daily')}
                  aria-label="Toggle Full Day Chauffeur"
                >
                  <span className="ios-toggle-thumb" />
                </button>
              </div>

              {/* Airport */}
              <div className="prof-set-row">
                <div className="prof-set-info">
                  <b className="prof-set-title">Airport Transfer</b>
                  <span className="prof-set-sub">₹900 flat · Terminal pickup & drop chauffeur</span>
                </div>
                <button
                  type="button"
                  className={`ios-toggle ${servicesEnabled.airport ? 'on' : ''}`}
                  onClick={() => toggleService('airport')}
                  aria-label="Toggle Airport Transfer"
                >
                  <span className="ios-toggle-thumb" />
                </button>
              </div>

              {/* Outstation */}
              <div className="prof-set-row">
                <div className="prof-set-info">
                  <b className="prof-set-title">Outstation Chauffeur</b>
                  <span className="prof-set-sub">₹2,200/day · Round trips & intercity travel</span>
                </div>
                <button
                  type="button"
                  className={`ios-toggle ${servicesEnabled.outstation ? 'on' : ''}`}
                  onClick={() => toggleService('outstation')}
                  aria-label="Toggle Outstation Chauffeur"
                >
                  <span className="ios-toggle-thumb" />
                </button>
              </div>

              {/* Night & Events */}
              <div className="prof-set-row">
                <div className="prof-set-info">
                  <b className="prof-set-title">Night & Events</b>
                  <span className="prof-set-sub">₹350/hr · Parties, dining & late night returns</span>
                </div>
                <button
                  type="button"
                  className={`ios-toggle ${servicesEnabled.event ? 'on' : ''}`}
                  onClick={() => toggleService('event')}
                  aria-label="Toggle Night & Events"
                >
                  <span className="ios-toggle-thumb" />
                </button>
              </div>
            </div>

            {/* 5. CARS I CAN DRIVE */}
            <div className="prof-section-title">Cars I Can Drive</div>
            <div className="card" style={{ padding: '0 16px', borderRadius: '18px', marginBottom: '20px' }}>
              <div
                className="prof-set-row"
                style={{ cursor: 'pointer' }}
                onClick={() => addToast('Manual transmission certified (Valid)', 'check')}
              >
                <div className="prof-set-info">
                  <b className="prof-set-title">Manual Transmission</b>
                  <span className="prof-set-sub">H-pattern clutch & gearshift certified</span>
                </div>
                <div className="prof-set-action-btn">
                  <span>Certified</span>
                  <Icon name="chevronRight" size={15} />
                </div>
              </div>

              <div
                className="prof-set-row"
                style={{ cursor: 'pointer' }}
                onClick={() => addToast('Automatic gearbox certified (TC, DCT, CVT, AMT)', 'check')}
              >
                <div className="prof-set-info">
                  <b className="prof-set-title">Automatic Gearbox</b>
                  <span className="prof-set-sub">Torque Converter, DCT, CVT, AMT certified</span>
                </div>
                <div className="prof-set-action-btn">
                  <span>Certified</span>
                  <Icon name="chevronRight" size={15} />
                </div>
              </div>

              <div
                className="prof-set-row"
                style={{ cursor: 'pointer' }}
                onClick={() => addToast('IMT & Hybrid vehicles certified', 'check')}
              >
                <div className="prof-set-info">
                  <b className="prof-set-title">IMT & Hybrid</b>
                  <span className="prof-set-sub">Clutchless manual & strong hybrids</span>
                </div>
                <div className="prof-set-action-btn">
                  <span>Certified</span>
                  <Icon name="chevronRight" size={15} />
                </div>
              </div>

              <div
                className="prof-set-row"
                style={{ cursor: 'pointer' }}
                onClick={() => addToast('Luxury & High-end EV certified', 'check')}
              >
                <div className="prof-set-info">
                  <b className="prof-set-title">Luxury & High-end EVs</b>
                  <span className="prof-set-sub">Mercedes, BMW, Audi, and electric luxury</span>
                </div>
                <div className="prof-set-action-btn">
                  <span>Certified</span>
                  <Icon name="chevronRight" size={15} />
                </div>
              </div>
            </div>

            {/* 6. PAYOUT & BANK ACCOUNT */}
            <div className="prof-section-title">Payout & Bank Account</div>
            <div className="card" style={{ padding: '0 16px', borderRadius: '18px', marginBottom: '20px' }}>
              <div
                className="prof-set-row"
                style={{ cursor: 'pointer' }}
                onClick={() => addToast('HDFC Bank •••• 4521 is verified for auto-withdrawals', 'check')}
              >
                <div className="prof-set-info">
                  <b className="prof-set-title">HDFC Bank •••• 4521</b>
                  <span className="prof-set-sub">Automated daily withdrawal destination</span>
                </div>
                <div className="prof-set-action-btn">
                  <span>Primary</span>
                  <Icon name="chevronRight" size={15} />
                </div>
              </div>

              <div
                className="prof-set-row"
                style={{ cursor: 'pointer' }}
                onClick={() => addToast('UPI VPA ravi.kumar@okhdfcbank verified', 'check')}
              >
                <div className="prof-set-info">
                  <b className="prof-set-title">Instant UPI Payout</b>
                  <span className="prof-set-sub">ravi.kumar@okhdfcbank</span>
                </div>
                <div className="prof-set-action-btn">
                  <span>Verified</span>
                  <Icon name="chevronRight" size={15} />
                </div>
              </div>

              <div
                className="prof-set-row"
                style={{ cursor: 'pointer' }}
                onClick={() => addToast('Daily settlement processed at 6:00 AM every morning', 'info')}
              >
                <div className="prof-set-info">
                  <b className="prof-set-title">Settlement Cycle</b>
                  <span className="prof-set-sub">Auto-credited every morning at 6:00 AM</span>
                </div>
                <div className="prof-set-action-btn">
                  <span>Daily 6 AM</span>
                  <Icon name="chevronRight" size={15} />
                </div>
              </div>
            </div>

            {/* 7. DRIVER DOCUMENTS & KYC */}
            <div className="prof-section-title">Documents & Verification</div>
            <div className="card" style={{ padding: '0 16px', borderRadius: '18px', marginBottom: '20px' }}>
              <div
                className="prof-set-row"
                style={{ cursor: 'pointer' }}
                onClick={() => addToast('Commercial Driving License #KL0720160049281 (Valid till 2029)', 'check')}
              >
                <div className="prof-set-info">
                  <b className="prof-set-title">Commercial Driving License</b>
                  <span className="prof-set-sub">#KL-07-20160049281 · Valid till Dec 2029</span>
                </div>
                <div className="prof-set-action-btn">
                  <span>Verified</span>
                  <Icon name="chevronRight" size={15} />
                </div>
              </div>

              <div
                className="prof-set-row"
                style={{ cursor: 'pointer' }}
                onClick={() => addToast('Police Clearance Certificate verified by Kerala Police', 'check')}
              >
                <div className="prof-set-info">
                  <b className="prof-set-title">Police Clearance Certificate</b>
                  <span className="prof-set-sub">Issued by Ernakulam City Police Department</span>
                </div>
                <div className="prof-set-action-btn">
                  <span>Approved</span>
                  <Icon name="chevronRight" size={15} />
                </div>
              </div>

              <div
                className="prof-set-row"
                style={{ cursor: 'pointer' }}
                onClick={() => addToast('Chauffeur badge #KL-07-2024-CH08 is active', 'check')}
              >
                <div className="prof-set-info">
                  <b className="prof-set-title">Chauffeur Badge</b>
                  <span className="prof-set-sub">Badge #KL-07-2024-CH08 · Ernakulam RTO</span>
                </div>
                <div className="prof-set-action-btn">
                  <span>Active</span>
                  <Icon name="chevronRight" size={15} />
                </div>
              </div>
            </div>

            {/* 8. APP & PRIVACY */}
            <div className="prof-section-title">App & Privacy</div>
            <div className="card" style={{ padding: '0 16px', borderRadius: '18px', marginBottom: '20px' }}>
              {/* Biometric */}
              <div className="prof-set-row">
                <div className="prof-set-info">
                  <b className="prof-set-title">Biometric / App Lock</b>
                  <span className="prof-set-sub">Require Face ID or Fingerprint on app open</span>
                </div>
                <button
                  type="button"
                  className={`ios-toggle ${biometricOn ? 'on' : ''}`}
                  onClick={() => {
                    setBiometricOn(!biometricOn);
                    addToast(!biometricOn ? 'Biometric lock enabled' : 'Biometric lock disabled', 'check');
                  }}
                  aria-label="Toggle Biometric Lock"
                >
                  <span className="ios-toggle-thumb" />
                </button>
              </div>

              {/* Haptic */}
              <div className="prof-set-row">
                <div className="prof-set-info">
                  <b className="prof-set-title">Haptic Feedback</b>
                  <span className="prof-set-sub">Subtle vibration when accepting rides and alerts</span>
                </div>
                <button
                  type="button"
                  className={`ios-toggle ${hapticOn ? 'on' : ''}`}
                  onClick={() => {
                    setHapticOn(!hapticOn);
                    addToast(!hapticOn ? 'Haptic feedback enabled' : 'Haptic feedback disabled', 'check');
                  }}
                  aria-label="Toggle Haptic Feedback"
                >
                  <span className="ios-toggle-thumb" />
                </button>
              </div>

              {/* Appearance */}
              <div className="prof-set-row" style={{ display: 'block', padding: '14px 0' }}>
                <b className="prof-set-title" style={{ marginBottom: '10px' }}>
                  Appearance
                </b>
                <div className="ios-seg-control" role="group" aria-label="Appearance">
                  {[['system', 'System'], ['light', 'Light'], ['dark', 'Dark']].map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      className={`ios-seg-btn ${theme === mode ? 'on' : ''}`}
                      onClick={() => setTheme(mode)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 9. DRIVER PARTNER CARE */}
            <div className="prof-section-title">Driver Partner Care</div>
            <div className="card" style={{ padding: '0 16px', borderRadius: '18px', marginBottom: '22px' }}>
              <div
                className="prof-set-row"
                style={{ cursor: 'pointer' }}
                onClick={() => addToast('Calling 24x7 Driver Partner Helpline (+91 80001 88888)...', 'phone')}
              >
                <div className="prof-set-info">
                  <b className="prof-set-title">24x7 Partner Helpline</b>
                  <span className="prof-set-sub">Dedicated chauffeur roadside & emergency care</span>
                </div>
                <div className="prof-set-action-btn">
                  <span>Call Free</span>
                  <Icon name="chevronRight" size={15} />
                </div>
              </div>

              <div
                className="prof-set-row"
                style={{ cursor: 'pointer' }}
                onClick={() => addToast('Opening Driver Partner Milestone & Bonus Guidelines...', 'info')}
              >
                <div className="prof-set-info">
                  <b className="prof-set-title">Partner Guidelines & Incentives</b>
                  <span className="prof-set-sub">Weekly trip milestones, bonus rates & safety rules</span>
                </div>
                <div className="prof-set-action-btn">
                  <span>Guidelines</span>
                  <Icon name="chevronRight" size={15} />
                </div>
              </div>
            </div>

            {/* 10. Footer: App Version & Sign Out Button */}
            <div style={{ textAlign: 'center', padding: '16px 0 10px' }}>
              <BrandLogo
                height={20}
                width={80}
                center
                style={{ opacity: 0.8, marginBottom: '8px' }}
              />
              <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}>
                Ridingo Driver Partner · v2.4.2
              </p>
              <button
                type="button"
                onClick={() => {
                  setDriverOnline(false);
                  addToast('Signed out of Driver Partner account. Set to offline.', 'info');
                }}
                style={{
                  background: 'var(--card)',
                  color: '#DC2626',
                  border: '1px solid var(--line)',
                  borderRadius: '999px',
                  padding: '9px 28px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  transition: 'transform 0.15s ease'
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Driver Bottom Navigation */}
      <nav className="nav" id="d-nav" aria-label="Driver app">
        <button
          className={`nv ${dTab === 'dash' ? 'on' : ''}`}
          onClick={() => setDTab('dash')}
        >
          <span className="nv-i">
            <Icon name="grid" size={23} />
          </span>
          <span className="nv-l">Dashboard</span>
        </button>

        <button
          className={`nv ${dTab === 'history' ? 'on' : ''}`}
          onClick={() => setDTab('history')}
        >
          <span className="nv-i">
            <Icon name="history" size={23} />
          </span>
          <span className="nv-l">History</span>
        </button>

        <button
          className={`nv ${dTab === 'wallet' ? 'on' : ''}`}
          onClick={() => setDTab('wallet')}
        >
          <span className="nv-i">
            <Icon name="wallet" size={23} />
          </span>
          <span className="nv-l">Wallet</span>
        </button>

        <button
          className={`nv ${dTab === 'profile' ? 'on' : ''}`}
          onClick={() => setDTab('profile')}
        >
          <span className="nv-i">
            <Icon name="user" size={23} />
          </span>
          <span className="nv-l">Profile</span>
        </button>
      </nav>

      <div className="homebar" aria-hidden="true" />
    </div>
  );
}
