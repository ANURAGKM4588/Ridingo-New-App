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
          <div>
            <div className="hello" style={{ marginBottom: '14px' }}>
              <h1>Profile</h1>
            </div>

            <div className="card row" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span className="av lg" style={{ width: '48px', height: '48px' }}>RK</span>
              <div className="grow">
                <b style={{ font: '700 20px var(--font-display)' }}>Ravi Kumar</b>
                <span className="sub">★ 4.8 · 142 trips on Ridingo</span>
              </div>
            </div>

            <div className="setgroup">
              <h4>Requests</h4>
              <div className="card" style={{ padding: '0 14px' }}>
                <div className="setrow">
                  <div className="grow">
                    <b>Trip request popups</b>
                    <span className="sub">Show instant popup for nearby bookings</span>
                  </div>
                  <span className="pill good">Active</span>
                </div>
                <div className="setrow" style={{ border: 'none' }}>
                  <div className="grow">
                    <b>Request sound</b>
                    <span className="sub">Play alert chime when ride is received</span>
                  </div>
                  <span className="pill good">Active</span>
                </div>
              </div>
            </div>

            <div className="setgroup">
              <h4>Services I accept</h4>
              <div className="card" style={{ padding: '0 14px' }}>
                {Object.keys(CATS).map(k => (
                  <div key={k} className="setrow">
                    <div className="grow">
                      <b>{CATS[k].name}</b>
                      <span className="sub">{CATS[k].from || 'Available for booking'}</span>
                    </div>
                    <span className="pill good">Enabled</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="setgroup">
              <h4>Cars I can drive</h4>
              <div className="card" style={{ padding: '0 14px' }}>
                {['Manual transmission', 'Automatic gearbox', 'IMT & Hybrid'].map((t, idx) => (
                  <div key={idx} className="setrow" style={{ border: idx === 2 ? 'none' : undefined }}>
                    <div className="grow">
                      <b>{t}</b>
                    </div>
                    <span className="pill good">Certified</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="setgroup">
              <h4>Payout account</h4>
              <div className="card row" style={{ padding: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="ico">
                  <Icon name="bank" size={20} />
                </span>
                <div className="grow">
                  <b>HDFC Bank •••• 4521</b>
                  <span className="sub">Automated daily withdrawal destination</span>
                </div>
              </div>
            </div>

            <div className="setgroup">
              <h4>Appearance</h4>
              <div className="card" style={{ padding: '12px' }}>
                <div className="seg" role="group" aria-label="Appearance">
                  {[['system', 'System'], ['light', 'Light'], ['dark', 'Dark']].map(([mode, label]) => (
                    <button
                      key={mode}
                      className={theme === mode ? 'on' : ''}
                      onClick={() => setTheme(mode)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'center', padding: '24px 0 10px' }}>
              <BrandLogo
                height={20}
                width={80}
                center
                style={{ opacity: 0.8, marginBottom: '6px' }}
              />
              <p className="mut small" style={{ margin: 0 }}>Ridingo Driver Partner · v2.4.2</p>
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
