import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import Icon from './Icon';
import BrandLogo from './BrandLogo';
import MapPickerModal from './MapPickerModal';
import GraphicLiveMap from './GraphicLiveMap';
import { searchPlaces } from '../lib/locationService';
import { getRecommendations, APP_SETTINGS } from '../lib/searchEngine';

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
    setBookingOpen,
    setBookingCategory,
    setBookingDestination,
    notifsOpen,
    setNotifsOpen,
    liveTrackingOpen,
    setLiveTrackingOpen,
    unotes,
    setUTab
  } = useApp();

  const unreadCount = (unotes || []).filter(n => !n.read).length;

  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [isScrolledHidden, setIsScrolledHidden] = useState(false);
  const isHiddenRef = useRef(false);
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

  // Ensure HomeTab always lands on the very top section on load
  useEffect(() => {
    const uc = document.getElementById('u-content');
    if (uc) {
      uc.scrollTop = 0;
    }
    isHiddenRef.current = false;
    setIsScrolledHidden(false);
    if (searchWrapRef.current) {
      searchWrapRef.current.classList.remove('scrolled-hidden');
    }
  }, []);

  // Smooth blur fade-out / fade-in scroll animation
  useEffect(() => {
    const uc = document.getElementById('u-content');
    let lastScroll = 0;
    let ticking = false;

    const getScrollTop = () => {
      if (uc) return uc.scrollTop;
      return window.scrollY || document.documentElement.scrollTop || 0;
    };

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const st = getScrollTop();
          const delta = st - lastScroll;

          if (st <= 10) {
            // Near top: always show search bar
            if (isHiddenRef.current) {
              isHiddenRef.current = false;
              setIsScrolledHidden(false);
              if (searchWrapRef.current) {
                searchWrapRef.current.classList.remove('scrolled-hidden');
              }
            }
          } else if (delta > 1.8 && st > 20) {
            // Scrolling down: smooth minimal blur fade-out
            if (!isHiddenRef.current) {
              isHiddenRef.current = true;
              setIsScrolledHidden(true);
              setSearchOpen(false);
              if (searchWrapRef.current) {
                searchWrapRef.current.classList.add('scrolled-hidden');
              }
            }
          } else if (delta < -3) {
            // Scrolling up: smooth blur fade-in
            if (isHiddenRef.current) {
              isHiddenRef.current = false;
              setIsScrolledHidden(false);
              if (searchWrapRef.current) {
                searchWrapRef.current.classList.remove('scrolled-hidden');
              }
            }
          }

          lastScroll = Math.max(0, st);
          ticking = false;
        });
        ticking = true;
      }
    };

    if (uc) {
      uc.addEventListener('scroll', handleScroll, { passive: true });
    }
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      if (uc) uc.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const inProg = trips.find(t => t.status === 'inprogress');
  const requestedTrip = trips.find(t => t.status === 'requested');
  const rawFirst = user?.firstName || (user?.name ? user.name.trim().split(' ')[0] : 'there');
  const first = rawFirst ? rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1) : 'there';

  const openBooking = (cat) => {
    setBookingCategory(cat);
    setBookingOpen(true);
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim()) {
      setSearchOpen(true);
      searchPlaces(val, (matches) => {
        setSearchResults(matches);
      });
    } else {
      setSearchResults([]);
      setSearchOpen(false);
    }
  };

  const handleClearSearch = (e) => {
    e.stopPropagation();
    setSearchQuery('');
    setSearchResults([]);
    setSearchOpen(false);
  };

  const handlePickPlace = (placeTitle) => {
    const isAirport = placeTitle.toLowerCase().includes('airport');
    setBookingCategory(isAirport ? 'airport' : 'hourly');
    setBookingDestination(placeTitle);
    setBookingOpen(true);
    setSearchOpen(false);
  };

  const handlePickTrip = (t) => {
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
    setBookingCategory(srv.cat);
    setBookingOpen(true);
    setSearchOpen(false);
  };

  const handleMapPick = (addr) => {
    setBookingCategory('hourly');
    setBookingDestination(addr);
    setBookingOpen(true);
    setMapModalOpen(false);
  };

  const recs = getRecommendations(searchQuery, { trips });
  const hasAnyRecs = recs.trips.length > 0 || recs.settings.length > 0 || recs.services.length > 0 || recs.landmarks.length > 0;

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

      {/* Destination Search Bar with Typing Feature & Autocomplete */}
      <div
        className={`search-wrap stagger-2 ${isScrolledHidden ? 'scrolled-hidden' : ''}`}
        id="u-search-wrap"
        ref={searchWrapRef}
        style={{ position: 'relative', zIndex: 20 }}
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
              placeholder="Where you go today?"
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
                    <span className="search-item-ic" style={{ background: 'var(--yellow-soft)', color: 'var(--on-yellow)' }}>
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

            {/* 3. Driver Services Section */}
            {recs.services.length > 0 && (
              <>
                <div className="search-drop-h">Driver Services</div>
                {recs.services.map(s => (
                  <button
                    key={s.id}
                    className="search-item"
                    type="button"
                    onClick={() => handlePickService(s)}
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
                    <span className="search-item-badge">Book</span>
                  </button>
                ))}
              </>
            )}

            {/* 4. Locations & Landmarks Section */}
            {recs.landmarks.length > 0 && (
              <>
                <div className="search-drop-h">Locations & Places</div>
                {recs.landmarks.map((p, idx) => (
                  <button
                    key={`${p.title}-${idx}`}
                    className="search-item"
                    type="button"
                    onClick={() => handlePickPlace(p.title)}
                  >
                    <span className="search-item-ic">
                      <Icon
                        name={
                          p.type === 'airport'
                            ? 'plane'
                            : p.type === 'station' || p.type === 'metro'
                            ? 'route'
                            : p.type === 'mall' || p.type === 'tech'
                            ? 'bank'
                            : 'pin'
                        }
                        size={16}
                      />
                    </span>
                    <div className="search-item-meta">
                      <div className="search-item-route">
                        <span className="loc-to" style={{ fontWeight: 700 }}>
                          {p.title}
                        </span>
                      </div>
                      <span className="search-item-sub">{p.sub}</span>
                    </div>
                    <span className="search-item-badge">Go</span>
                  </button>
                ))}
              </>
            )}

            {/* Choose on Map option */}
            <button
              className="search-item"
              type="button"
              onClick={() => {
                setSearchOpen(false);
                setMapModalOpen(true);
              }}
              style={{ borderTop: '1px solid var(--line)', marginTop: '4px' }}
            >
              <span className="search-item-ic">
                <Icon name="pin" size={16} />
              </span>
              <div className="search-item-meta">
                <b style={{ fontSize: '13px', color: 'var(--ink)' }}>Choose destination on map</b>
                <span className="search-item-sub">Drag pin to any exact street</span>
              </div>
              <span className="search-item-badge" style={{ background: 'var(--yellow)', color: 'var(--on-yellow)' }}>
                Map
              </span>
            </button>

            {/* Fallback if no matching results */}
            {!hasAnyRecs && (
              <div className="search-empty">
                <span className="search-empty-ic">
                  <Icon name="pin" size={20} />
                </span>
                <p>Search for "{searchQuery}"</p>
                <button
                  className="btn primary sm"
                  style={{ marginTop: '8px' }}
                  type="button"
                  onClick={() => handlePickPlace(searchQuery)}
                >
                  Book driver to {searchQuery}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Live In-Progress Trip Card */}
      {inProg && (
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
            onOpenModal={() => setLiveTrackingOpen(true)}
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
            <button className="btn sm primary" onClick={() => setLiveTrackingOpen(true)}>
              Track
            </button>
          </div>
        </div>
      )}

      {/* Requested / Searching Ride Banner (when ride has been initiated) */}
      {!inProg && requestedTrip && (
        <div
          className="card stagger-2"
          style={{
            marginTop: '14px',
            padding: '14px 16px',
            borderRadius: '20px',
            border: '1.5px solid rgba(250, 204, 21, 0.4)',
            background: 'var(--card)',
            boxShadow: '0 4px 18px rgba(255, 199, 10, 0.12)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
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
                color: '#B45309'
              }}
            >
              <span className="live-pulse-dot" style={{ background: '#F59E0B' }} />
              FINDING CHAUFFEUR
            </span>
            <b style={{ fontSize: '15px', color: 'var(--ink)' }}>₹{requestedTrip.fare}</b>
          </div>

          <div style={{ fontSize: '13px', color: 'var(--ink)', marginBottom: '10px' }}>
            Broadcasting request for <b>{String(requestedTrip?.cat || 'hourly').toUpperCase()}</b> chauffeur near <b>{(typeof requestedTrip?.pickup === 'string' && requestedTrip.pickup ? requestedTrip.pickup.split(',')[0] : 'Edappally')}</b>
          </div>

          <button
            className="btn primary sm block"
            style={{ width: '100%', height: '38px', borderRadius: '12px', fontWeight: 750, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            onClick={() => setLiveTrackingOpen(true)}
          >
            <Icon name="navigation" size={14} />
            <span>Track Live Request Status</span>
          </button>
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
            <span className="bento-badge">Most Popular</span>
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
        <span className="pill" style={{ background: 'var(--yellow-soft)', color: 'var(--on-yellow)', fontWeight: 700 }}>
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
