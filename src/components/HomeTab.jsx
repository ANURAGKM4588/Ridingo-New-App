import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import Icon from './Icon';
import BrandLogo from './BrandLogo';
import MapPickerModal from './MapPickerModal';
import GraphicLiveMap from './GraphicLiveMap';
import { getDeviceLocation } from '../lib/deviceLocation';
import { getRecommendations, APP_SETTINGS } from '../lib/searchEngine';
import realtime from '../utils/realtime';

const CATS = {
  hourly: { name: 'Hourly', blurb: '2 to 12 hours', icon: 'hourly', from: '₹250 per hour' },
  daily: { name: 'Full day', blurb: '10 hours a day', icon: 'sun', from: '₹1,800 per day' },
  airport: { name: 'Airport', blurb: 'Pickup or drop', icon: 'plane', from: '₹900 flat' },
  outstation: { name: 'Outstation', blurb: 'Multi-day trips', icon: 'route', from: '₹2,200 per day' },
  event: { name: 'Night & events', blurb: 'Minimum 4 hours', icon: 'moon', from: '₹350 per hour' }
};

const REVIEWS = [
  {
    name: 'Arjun Mehta',
    init: 'AM',
    car: 'BMW 330i Gran Limousine',
    tag: 'Hourly Driver',
    quote: 'Handed over my keys for a late city dinner. Rajesh drove so smoothly, parked with extreme care, and was waiting right outside when we walked out.'
  },
  {
    name: 'Priya Nair',
    init: 'PN',
    car: 'Hyundai Creta SX(O)',
    tag: 'Airport Transfer',
    quote: 'Needed a 4:30 AM terminal drop. Vikram arrived 10 mins early in uniform, handled our luggage, and drove my family with calm precision.'
  },
  {
    name: 'Karan Singhania',
    init: 'KS',
    car: 'Toyota Fortuner 4x4',
    tag: 'Outstation Trip',
    quote: 'Hired Suresh for a 2-day family trip through the hills. Handled the hairpin bends effortlessly and treated my car like his own. Worth every rupee.'
  },
  {
    name: 'Dr. Sneha Roy',
    init: 'SR',
    car: 'Honda City ZX',
    tag: 'Full Day Hire',
    quote: 'Booked for back-to-back clinic visits and hospital rounds. Professional, zero mobile distractions while driving, and saved me hours of driving fatigue.'
  }
];

export default function HomeTab() {
  const {
    user,
    trips,
    setTrips,
    setBookingOpen,
    setBookingCategory,
    setBookingDestination,
    notifsOpen,
    setNotifsOpen,
    liveTrackingOpen,
    setLiveTrackingOpen,
    setActiveTrackingTripId,
    unotes,
    setUTab,
    addToast,
    isUserTrip,
    onboardingOpen
  } = useApp();

  const unreadCount = (unotes || []).filter(n => !n.read).length;

  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const searchWrapRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Ensure HomeTab lands smoothly at the top on load
  useEffect(() => {
    const uc = document.getElementById('u-content');
    if (uc) {
      uc.scrollTop = 0;
    }
  }, []);

  

  const requestedTrip = (trips || []).find(t => {
    if (t.status !== 'requested') return false;
    if (!isUserTrip(t, user)) return false;
    const age = Date.now() - (Number(t.when_ts) || 0);
    return age >= 0 && age < 15 * 60 * 1000;
  });

  const isAccepted = (trips || []).find(t => {
    if (!['accepted', 'pickup_arrived', 'ready_to_start'].includes(t.status)) return false;
    if (!isUserTrip(t, user)) return false;
    const age = Date.now() - (Number(t.when_ts) || 0);
    return age >= 0 && age < 12 * 60 * 60 * 1000;
  });

  const inProg = (trips || []).find(t => {
    if (!['inprogress', 'ending_otp'].includes(t.status)) return false;
    if (!isUserTrip(t, user)) return false;
    const age = Date.now() - (Number(t.when_ts) || 0);
    return age >= 0 && age < 24 * 60 * 60 * 1000;
  });

  const handleCancelRequest = (tripId) => {
    if (window.confirm('Are you sure you want to cancel this chauffeur request?')) {
      setTrips(prev => prev.filter(t => t.id !== tripId));
      if (addToast) addToast('Trip request cancelled', 'info');
      realtime.declineRide(tripId);
    }
  };
  const rawFirst = user?.firstName || (user?.name ? user.name.trim().split(' ')[0] : 'there');
  const first = rawFirst ? rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1) : 'there';

  const userActiveTrip = requestedTrip || isAccepted || inProg;

  const ensureNoActiveTripOrWarn = () => {
    if (userActiveTrip) {
      if (addToast) addToast('You already have an active ride in progress. Please complete your ongoing trip before booking a new one.', 'warn');
      if (setActiveTrackingTripId) setActiveTrackingTripId(userActiveTrip.id);
      setLiveTrackingOpen(true);
      return false;
    }
    return true;
  };

  const openBooking = (cat) => {
    if (!ensureNoActiveTripOrWarn()) return;
    setBookingCategory(cat);
    setBookingOpen(true);
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim()) {
      setSearchOpen(true);
    } else {
      setSearchOpen(false);
    }
  };

  const handleClearSearch = (e) => {
    e.stopPropagation();
    setSearchQuery('');
    setSearchOpen(false);
  };

  const handlePickPlace = (placeTitle) => {
    if (!ensureNoActiveTripOrWarn()) {
      setSearchOpen(false);
      return;
    }
    const isAirport = placeTitle.toLowerCase().includes('airport');
    setBookingCategory(isAirport ? 'airport' : 'hourly');
    setBookingDestination(placeTitle);
    setBookingOpen(true);
    setSearchOpen(false);
  };

  const handlePickTrip = (t) => {
    if (!ensureNoActiveTripOrWarn()) {
      setSearchOpen(false);
      return;
    }
    setBookingCategory(t.cat || 'hourly');
    setBookingDestination(t.drop_loc);
    setBookingOpen(true);
    setSearchOpen(false);
  };

  const handlePickSetting = (s) => {
    if (s.action === 'open_notifs') {
      setNotifsOpen(true);
    } else if (s.tab) {
      setUTab(s.tab);
    }
    setSearchOpen(false);
  };

  const handlePickService = (srv) => {
    if (!ensureNoActiveTripOrWarn()) {
      setSearchOpen(false);
      return;
    }
    setBookingCategory(srv.cat);
    setBookingOpen(true);
    setSearchOpen(false);
  };

  const handleMapPick = (addr) => {
    if (!ensureNoActiveTripOrWarn()) {
      setMapModalOpen(false);
      return;
    }
    setBookingCategory('hourly');
    setBookingDestination(addr);
    setBookingOpen(true);
    setMapModalOpen(false);
  };

  const recs = getRecommendations(searchQuery, { trips });
  const hasTripOrSettingRecs = recs.trips.length > 0 || recs.settings.length > 0;

  return (
    <div>
      {/* Top Bar with Brand Logo and Notification Bell */}
      <div className="row stagger-1" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <BrandLogo height={38} width={152} />
        </div>
        <button className="iconbtn" aria-label="Notifications" onClick={() => setNotifsOpen(true)}>
          <Icon name="bell" size={20} />
          {unreadCount > 0 && <span className="dotbadge" />}
        </button>
      </div>

      {/* Greeting Header */}
      <div className="hello stagger-1">
        <h1>Hi, {first}</h1>
        <p>Need a driver for your own car?</p>
      </div>

      {/* Destination Search Bar - Always pinned on top */}
      <div
        id="u-search-wrap"
        ref={searchWrapRef}
        className="search-wrap stagger-2"
        style={{
          position: 'relative',
          zIndex: 20,
          marginTop: '12px',
          marginBottom: '14px'
        }}
      >
        <div className="search-anim-inner">
          <div className="search-box">
            <span className="search-ic">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </span>
            <input
              type="text"
              className="search-inp"
              id="u-dest-search"
              placeholder="Search recent trips, settings..."
              autoComplete="off"
              spellCheck="false"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => {
                if (searchQuery.trim()) setSearchOpen(true);
              }}
            />
            {searchQuery && (
              <button
                className="search-clr"
                type="button"
                onClick={handleClearSearch}
                aria-label="Clear search"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {/* Keyword-based Recommendations Dropdown (Trips, Settings, Services, Places) */}
        {searchOpen && searchQuery.trim() && (
          <div className="search-dropdown" id="u-search-drop">
            {/* 1. Recent Trips Section */}
            {recs.trips.length > 0 && (
              <>
                <div className="search-drop-h">Recent Trips</div>
                {recs.trips.map(t => (
                  <button
                    key={t.id}
                    className="search-item"
                    type="button"
                    onClick={() => handlePickTrip(t)}
                  >
                    <span className="search-item-ic" style={{ background: 'var(--yellow-soft)', color: 'var(--on-yellow-soft, var(--yellow))' }}>
                      <Icon name="route" size={16} />
                    </span>
                    <div className="search-item-meta">
                      <div className="search-item-route">
                        <span className="loc-to" style={{ fontWeight: 700 }}>
                          {t.drop_loc}
                        </span>
                      </div>
                      <span className="search-item-sub">
                        From {t.pickup} · Driver: {t.driver || 'Assigned'}
                      </span>
                    </div>
                    <span className="search-item-badge" style={{ background: 'var(--yellow)', color: 'var(--on-yellow)' }}>
                      Rebook
                    </span>
                  </button>
                ))}
              </>
            )}

            {/* 2. Settings & Preferences Section */}
            {recs.settings.length > 0 && (
              <>
                <div className="search-drop-h">Settings & Features</div>
                {recs.settings.map(s => (
                  <button
                    key={s.id}
                    className="search-item"
                    type="button"
                    onClick={() => handlePickSetting(s)}
                  >
                    <span className="search-item-ic" style={{ background: 'var(--field)', color: 'var(--ink)' }}>
                      <Icon name={s.icon} size={16} />
                    </span>
                    <div className="search-item-meta">
                      <b style={{ fontSize: '14px', color: 'var(--ink)', display: 'block' }}>
                        {s.title}
                      </b>
                      <span className="search-item-sub">{s.sub}</span>
                    </div>
                    <span className="search-item-badge" style={{ background: 'var(--field)', color: 'var(--muted)' }}>
                      {s.badge}
                    </span>
                  </button>
                ))}
              </>
            )}

            {/* Fallback if no matching trips or settings */}
            {!hasTripOrSettingRecs && (
              <div className="search-empty" style={{ padding: '20px 14px', textAlign: 'center' }}>
                <span className="search-empty-ic" style={{ display: 'inline-flex', marginBottom: '6px', color: 'var(--muted)' }}>
                  <Icon name="search" size={20} />
                </span>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>
                  No trips or settings matching "{searchQuery}"
                </p>
              </div>
            )}
          </div>
        )}
          
      </div>


      {/* =========================================================
          1. TRIP REQUEST ACTIVE (WAITING FOR DRIVER TO ACCEPT)
          Live status card with prominent "Track Live Status" button
          ========================================================= */}
      {requestedTrip && (
        <div
          className="stagger-1"
          style={{
            marginTop: '14px',
            marginBottom: '16px',
            padding: '16px 18px',
            borderRadius: '20px',
            background: 'var(--card)',
            border: '1.5px solid var(--yellow, #F59E0B)',
            boxShadow: '0 6px 24px rgba(245, 158, 11, 0.16)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Top pulse accent */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: 'linear-gradient(90deg, #F59E0B, #EAB308, #F59E0B)'
            }}
          />

          {/* Header Row: Live Status Pill & Fare */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '5px 12px',
                borderRadius: '999px',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.35)'
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#F59E0B',
                  boxShadow: '0 0 0 0 rgba(245, 158, 11, 0.7)',
                  animation: 'pulse-dot 1.5s infinite'
                }}
              />
              <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink)' }}>
                Finding Chauffeur · Live
              </span>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '10px', color: 'var(--muted)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
                Total Fare
              </span>
              <b style={{ fontSize: '17px', fontWeight: 850, color: 'var(--ink)' }}>
                ₹{requestedTrip.fare}
              </b>
            </div>
          </div>

          {/* Route Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22C55E', flexShrink: 0 }} />
              <span style={{ fontSize: '13px', color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <b>Pickup:</b> {requestedTrip.pickup}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', flexShrink: 0 }} />
              <span style={{ fontSize: '13px', color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <b>Drop:</b> {requestedTrip.drop_loc}
              </span>
            </div>
          </div>

          {/* Broadcast status notice */}
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '10px',
              background: 'var(--field)',
              border: '1px solid var(--line)',
              fontSize: '11.5px',
              color: 'var(--muted)',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>📡</span>
            <span>Request broadcasted to nearby verified chauffeurs. Waiting for acceptance...</span>
          </div>

          {/* Action Button: Track Live Request Status */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => {
                if (setActiveTrackingTripId) setActiveTrackingTripId(requestedTrip.id);
                setLiveTrackingOpen(true);
              }}
              style={{
                flex: 1,
                minWidth: 0,
                height: '44px',
                borderRadius: '12px',
                background: 'var(--solid)',
                color: 'var(--on-solid)',
                border: 'none',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '0 10px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
                whiteSpace: 'nowrap',
                overflow: 'hidden'
              }}
            >
              <Icon name="navigation" size={14} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Track Live Request
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleCancelRequest(requestedTrip.id)}
              style={{
                flexShrink: 0,
                padding: '0 14px',
                height: '44px',
                borderRadius: '12px',
                background: 'var(--field)',
                border: '1px solid var(--line)',
                color: '#EF4444',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* =========================================================
          2. CHAUFFEUR ACCEPTED & ARRIVING LIVE STATUS CARD
          ========================================================= */}
      {!inProg && isAccepted && (
        <div
          className="stagger-1"
          style={{
            marginTop: '14px',
            marginBottom: '16px',
            padding: '16px 18px',
            borderRadius: '20px',
            background: 'var(--card)',
            border: '1.5px solid #22C55E',
            boxShadow: '0 6px 24px rgba(34, 197, 94, 0.16)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '5px 12px',
                borderRadius: '999px',
                background: 'rgba(34, 197, 94, 0.12)',
                border: '1px solid rgba(34, 197, 94, 0.3)'
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#22C55E',
                  boxShadow: '0 0 0 0 rgba(34, 197, 94, 0.7)',
                  animation: 'pulse-dot 1.5s infinite'
                }}
              />
              <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink)' }}>
                Chauffeur Arriving
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700 }}>OTP:</span>
              <span style={{ background: 'var(--solid)', color: 'var(--on-solid)', padding: '2px 8px', borderRadius: '6px', fontSize: '13px', fontWeight: 800, letterSpacing: '1px' }}>
                {isAccepted.startOtp || '4821'}
              </span>
            </div>
          </div>

          <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--ink)', marginBottom: '3px' }}>
            {isAccepted.driver || 'Ravi Kumar'} is reaching your pickup
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '12px' }}>
            Pickup: {isAccepted.pickup}
          </div>

          <button
            type="button"
            onClick={() => {
              if (setActiveTrackingTripId) setActiveTrackingTripId(isAccepted.id);
              setLiveTrackingOpen(true);
            }}
            style={{
              width: '100%',
              height: '44px',
              borderRadius: '12px',
              background: 'var(--solid)',
              color: 'var(--on-solid)',
              border: 'none',
              fontSize: '13.5px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '0 12px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
              whiteSpace: 'nowrap',
              overflow: 'hidden'
            }}
          >
            <Icon name="navigation" size={14} />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Track Chauffeur Live ➔
            </span>
          </button>
        </div>
      )}

      

      {/* Live In-Progress Trip Card */}
      {inProg && !onboardingOpen && (
        <div className="live-hero-card" style={{ marginTop: '14px' }}>
          <div className="live-hero-header">
            <div className="live-indicator-pill">
              <span className="live-pulse-dot" />
              <span className="live-indicator-txt">LIVE TRIP IN PROGRESS</span>
            </div>
            <span className="live-eta-badge" id="live-eta-badge-mini">14 mins away</span>
          </div>

          {/* Minimal Modern Graphic Vector Map Viewport */}
          <GraphicLiveMap
            trip={inProg}
            isModal={false}
            progress={0.42}
            speed={38}
            onOpenModal={() => {
              if (setActiveTrackingTripId) setActiveTrackingTripId(inProg.id);
              setLiveTrackingOpen(true);
            }}
          />

          <div className="live-hud-row">
            <div className="live-hud-cell">
              <span className="live-hud-lbl">ETA</span>
              <b className="live-hud-val" id="live-hud-eta-mini">14m</b>
            </div>
            <div className="live-hud-divider" />
            <div className="live-hud-cell">
              <span className="live-hud-lbl">Remaining</span>
              <b className="live-hud-val" id="live-hud-dist-mini">4.8 km</b>
            </div>
            <div className="live-hud-divider" />
            <div className="live-hud-cell">
              <span className="live-hud-lbl">Live Speed</span>
              <b className="live-hud-val" id="live-hud-speed-mini">38 km/h</b>
            </div>
          </div>

          <div className="live-driver-strip">
            <span className="av" style={{ width: '38px', height: '38px', padding: 0, overflow: 'hidden' }}>
              <span style={{ fontSize: '13px', fontWeight: 700 }}>RK</span>
            </span>
            <div className="live-driver-info grow">
              <b>{inProg.driver || 'Ravi Kumar'} <span style={{ fontWeight: 400, color: 'var(--muted)' }}>★ 4.8</span></b>
              <span>Driving your {user?.car?.model || inProg.car?.model} ({user?.car?.plate || inProg.car?.plate})</span>
            </div>
            <button
              className="btn sm primary"
              onClick={() => {
                if (setActiveTrackingTripId) setActiveTrackingTripId(inProg.id);
                setLiveTrackingOpen(true);
              }}
            >
              Track
            </button>
          </div>
        </div>
      )}



      {/* Services Section Header */}
      <div className="sec stagger-3">
        <h3>Book a driver</h3>
        <span>Pay 30% now</span>
      </div>

      {/* Bento Grid */}
      <div className="bento-grid stagger-4">
        {/* Hourly Chauffeur Hero */}
        <button
          className="bento-hero"
          onClick={() => openBooking('hourly')}
          style={{ cursor: 'pointer', textAlign: 'left' }}
        >
          <div className="bento-hero-top">
            <span className="bento-badge" style={{ background: 'var(--yellow)', color: '#000000', fontWeight: 750, padding: '3px 10px', borderRadius: '999px', boxShadow: '0 2px 8px rgba(255, 199, 10, 0.3)' }}>
              RECOMMENDED
            </span>
            <span className="bento-hero-cta">
              Book now{' '}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </span>
          </div>

          <div className="bento-hero-body">
            <span className="bento-hero-ic">
              <Icon name="hourly" size={22} />
            </span>
            <div>
              <b className="bento-hero-title">Hourly driver</b>
              <div className="bento-hero-sub">Flexible duration for city errands, meetings & shopping</div>
            </div>
          </div>

          <div className="bento-hero-foot">
            <span className="bento-hero-tag">Minimum 2 hours · In-city</span>
            <span className="small mut">Hire for your car</span>
          </div>
        </button>

        {/* Airport, Daily, Outstation, Event */}
        {['airport', 'daily', 'outstation', 'event'].map(k => {
          const c = CATS[k];
          return (
            <button
              key={k}
              className="bento-card"
              onClick={() => openBooking(k)}
              style={{ cursor: 'pointer', textAlign: 'left' }}
            >
              <span className="bento-card-ic">
                <Icon name={c.icon} size={19} />
              </span>
              <div className="bento-card-main">
                <b className="bento-card-name">{c.name}</b>
                <span className="bento-card-desc">{c.blurb}</span>
              </div>
              <span className="bento-card-arr">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </span>
            </button>
          );
        })}
      </div>

      {/* Popular Destinations Quick Book */}
      <div className="sec stagger-5" style={{ marginTop: '22px' }}>
        <h3>Popular destinations</h3>
        <span>Quick booking</span>
      </div>

      <div className="rebook-list stagger-5">
        <div className="rebook-card">
          <span className="rebook-ic">
            <Icon name="plane" size={18} />
          </span>
          <div className="rebook-left">
            <b className="rebook-dest">Cochin International Airport (COK)</b>
            <div className="rebook-meta">
              <span className="rebook-from">From Edappally Toll</span>
              <span className="rebook-dot">·</span>
              <span className="rebook-cat">Airport (One way)</span>
            </div>
          </div>
          <button className="btn sm rebook-btn" onClick={() => openBooking('airport')}>
            <span>Book</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>

        <div className="rebook-card">
          <span className="rebook-ic">
            <Icon name="clock" size={18} />
          </span>
          <div className="rebook-left">
            <b className="rebook-dest">Lulu Mall, Edappally</b>
            <div className="rebook-meta">
              <span className="rebook-from">From Panampilly Nagar</span>
              <span className="rebook-dot">·</span>
              <span className="rebook-cat">Hourly (3 hours)</span>
            </div>
          </div>
          <button className="btn sm rebook-btn" onClick={() => openBooking('hourly')}>
            <span>Book</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Customer Reviews Section */}
      <div className="sec" style={{ marginTop: '24px' }}>
        <div>
          <h3 style={{ margin: 0, lineHeight: 1.2 }}>Keys in good hands</h3>
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Verified stories from car owners</span>
        </div>
        <span
          className="pill"
          style={{
            background: 'var(--yellow)',
            color: '#000000',
            fontWeight: 800,
            padding: '3px 10px',
            borderRadius: '999px',
            boxShadow: '0 2px 10px rgba(255, 199, 10, 0.35)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px'
          }}
        >
          4.9 ★
        </span>
      </div>

      <div className="reviews-slider">
        {REVIEWS.map((r, i) => (
          <div key={i} className="review-card">
            <div className="review-top">
              <div className="review-av">{r.init}</div>
              <div className="review-meta">
                <div className="review-name-row">
                  <b className="review-name">{r.name}</b>
                  <span className="review-check" title="Verified Owner">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m5 12.5 4.5 4.5L19 7.5" />
                    </svg>
                  </span>
                </div>
                <span className="review-car">{r.car}</span>
              </div>
              <div className="review-stars">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--yellow)' }}>
                  <path d="m12 4 2.4 5 5.4.7-4 3.7 1 5.4L12 16.2 7.2 18.8l1-5.4-4-3.7 5.4-.7z" />
                </svg>
                <span>5.0</span>
              </div>
            </div>
            <p className="review-quote">“{r.quote}”</p>
          </div>
        ))}
      </div>

      {/* Generous bottom scroll breathing room without visible text */}
      <div style={{ height: '48px', width: '100%', flexShrink: 0 }} aria-hidden="true" />

      {/* Map Picker Modal */}
      <MapPickerModal
        isOpen={mapModalOpen}
        onClose={() => setMapModalOpen(false)}
        onSelect={handleMapPick}
        targetField="drop"
      />
    </div>
  );
}
