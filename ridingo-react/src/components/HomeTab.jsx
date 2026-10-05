import React from 'react';
import { useApp } from '../context/AppContext';

export default function HomeTab() {
  const { user, trips, setBookingOpen, setBookingCategory, setUTab } = useApp();

  const inProgressTrip = trips.find(t => t.status === 'inprogress');

  const openBooking = (cat) => {
    setBookingCategory(cat);
    setBookingOpen(true);
  };

  return (
    <div className="tab-pane active" id="tab-home">
      {/* Hello Header */}
      <div className="hello">
        <div style={{ flex: 1 }}>
          <h1>Hello, {user?.name ? user.name.split(' ')[0] : 'there'}!</h1>
          <p>Where do you want your driver to take you?</p>
        </div>
        <span
          className="av"
          style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }}
          onClick={() => setUTab('profile')}
        >
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            user?.name?.slice(0, 2).toUpperCase() || 'CU'
          )}
        </span>
      </div>

      {/* Search Box */}
      <div className="sbox" onClick={() => openBooking('hourly')}>
        <svg className="si" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Where to? (e.g. Airport, Aluva, Office)"
          readOnly
        />
      </div>

      {/* Active In-Progress Ride Banner */}
      {inProgressTrip && (
        <div className="active-bar" style={{ marginTop: '14px', marginBottom: '14px' }}>
          <div className="active-bar-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="live-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span className="live-pulse-dot"></span>
              LIVE TRIP IN PROGRESS
            </span>
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--ink)' }}>
              ₹{inProgressTrip.fare}
            </span>
          </div>
          <div style={{ marginTop: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--ink)' }}>
            {inProgressTrip.pickup} → {inProgressTrip.drop_loc}
          </div>
          <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Driver: <b>{inProgressTrip.driver}</b></span>
            <span>OTP: <b>{user?.pinCode || '4821'}</b></span>
          </div>
        </div>
      )}

      {/* Bento Grid Services */}
      <div className="bento">
        {/* Hourly Chauffeur */}
        <div className="b-hero" onClick={() => openBooking('hourly')}>
          <div className="b-badge">MOST POPULAR</div>
          <h3 className="b-title">Hourly Chauffeur</h3>
          <p className="b-sub">Pay as you go • Multiple stops, shopping, meetings</p>
          <div className="b-price">
            <span className="b-val">₹398</span>
            <span className="b-unit">/ first 2 hrs</span>
          </div>
        </div>

        {/* Airport Transfer */}
        <div className="b-card" onClick={() => openBooking('airport')}>
          <h4 className="b-title-sm">Airport Transfer</h4>
          <p className="b-sub-sm">Flight tracking & punctual terminal drops</p>
          <div className="b-price-sm">
            <span className="b-val-sm">₹699</span>
            <span className="b-unit-sm">fixed fare</span>
          </div>
        </div>

        {/* Daily Chauffeur */}
        <div className="b-card" onClick={() => openBooking('daily')}>
          <h4 className="b-title-sm">Daily Chauffeur</h4>
          <p className="b-sub-sm">Full 8-12 hr dedicated chauffeur</p>
          <div className="b-price-sm">
            <span className="b-val-sm">₹1,499</span>
            <span className="b-unit-sm">/ day</span>
          </div>
        </div>

        {/* Outstation Trip */}
        <div className="b-card" onClick={() => openBooking('outstation')}>
          <h4 className="b-title-sm">Outstation Trip</h4>
          <p className="b-sub-sm">Highway-certified long distance drivers</p>
          <div className="b-price-sm">
            <span className="b-val-sm">₹1,899</span>
            <span className="b-unit-sm">/ day</span>
          </div>
        </div>

        {/* Event Chauffeur */}
        <div className="b-card" onClick={() => openBooking('event')}>
          <h4 className="b-title-sm">Event Chauffeur</h4>
          <p className="b-sub-sm">Weddings, VIP events & nightlife</p>
          <div className="b-price-sm">
            <span className="b-val-sm">₹999</span>
            <span className="b-unit-sm">/ 4 hrs</span>
          </div>
        </div>
      </div>

      {/* Popular Rides Rebook */}
      <div className="b-pop" style={{ marginTop: '20px' }}>
        <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '10px' }}>Quick Rebook</h4>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          <button
            className="chip-btn"
            style={{ padding: '8px 14px', borderRadius: '20px', background: 'var(--chip)', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
            onClick={() => openBooking('airport')}
          >
            ✈️ Cochin Airport (COK)
          </button>
          <button
            className="chip-btn"
            style={{ padding: '8px 14px', borderRadius: '20px', background: 'var(--chip)', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
            onClick={() => openBooking('hourly')}
          >
            🏢 Infopark Phase 2
          </button>
          <button
            className="chip-btn"
            style={{ padding: '8px 14px', borderRadius: '20px', background: 'var(--chip)', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
            onClick={() => openBooking('outstation')}
          >
            ⛰️ Munnar Weekend
          </button>
        </div>
      </div>

      {/* Customer Reviews & Testimonials */}
      <div style={{ marginTop: '24px', marginBottom: '16px' }}>
        <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '10px' }}>What Car Owners Say</h4>
        <div className="reviews-slider" style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
          <div className="rcard" style={{ minWidth: '240px', padding: '14px', borderRadius: '16px', background: 'var(--card)', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span className="av" style={{ width: '32px', height: '32px', fontSize: '12px' }}>AM</span>
              <div>
                <b style={{ fontSize: '13px' }}>Arjun Mehta</b>
                <div style={{ fontSize: '11px', color: 'var(--muted)' }}>BMW 330i • Hourly</div>
              </div>
            </div>
            <p style={{ fontSize: '12px', lineHeight: '1.4', color: 'var(--ink)' }}>
              "Handed over my keys for a late dinner. Rajesh drove smoothly and parked with extreme care."
            </p>
          </div>

          <div className="rcard" style={{ minWidth: '240px', padding: '14px', borderRadius: '16px', background: 'var(--card)', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span className="av" style={{ width: '32px', height: '32px', fontSize: '12px' }}>PN</span>
              <div>
                <b style={{ fontSize: '13px' }}>Priya Nair</b>
                <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Hyundai Creta • Airport</div>
              </div>
            </div>
            <p style={{ fontSize: '12px', lineHeight: '1.4', color: 'var(--ink)' }}>
              "Needed a 4:30 AM terminal drop. Vikram arrived 10 mins early in uniform and handled our luggage."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
