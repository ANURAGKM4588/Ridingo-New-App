import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function BookingSheet() {
  const { bookingOpen, setBookingOpen, bookingCategory, setBookingCategory, bookRide } = useApp();

  const [qty, setQty] = useState(2);
  const [pickup, setPickup] = useState('Edappally Toll, Kochi');
  const [drop, setDrop] = useState('Cochin International Airport (COK)');

  if (!bookingOpen) return null;

  const catConfig = {
    hourly: { name: 'Hourly Chauffeur', base: 398, rate: 199, unit: 'hrs', min: 2, max: 12 },
    airport: { name: 'Airport Transfer', base: 699, rate: 0, unit: 'trip', min: 1, max: 1 },
    daily: { name: 'Daily Chauffeur', base: 1499, rate: 1499, unit: 'days', min: 1, max: 7 },
    outstation: { name: 'Outstation Trip', base: 1899, rate: 1899, unit: 'days', min: 1, max: 14 },
    event: { name: 'Event Chauffeur', base: 999, rate: 250, unit: 'hrs', min: 4, max: 8 }
  };

  const cfg = catConfig[bookingCategory] || catConfig.hourly;

  const calculateFare = () => {
    if (bookingCategory === 'hourly') {
      return cfg.base + Math.max(0, qty - 2) * cfg.rate;
    } else if (bookingCategory === 'event') {
      return cfg.base + Math.max(0, qty - 4) * cfg.rate;
    } else if (bookingCategory === 'airport') {
      return cfg.base;
    } else {
      return cfg.base * qty;
    }
  };

  const fare = calculateFare();

  return (
    <>
      {/* Scrim Overlay */}
      <div
        className="layer"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 998,
          backdropFilter: 'blur(4px)'
        }}
        onClick={() => setBookingOpen(false)}
      />

      {/* Sheet Content */}
      <div
        className="sheet"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'var(--sheet)',
          borderTopLeftRadius: '28px',
          borderTopRightRadius: '28px',
          padding: '24px 20px',
          zIndex: 999,
          boxShadow: '0 -10px 40px rgba(0,0,0,0.2)',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        <div style={{ width: '40px', height: '4px', background: 'var(--bar)', borderRadius: '2px', margin: '0 auto 16px' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>{cfg.name}</h3>
            <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '4px 0 0' }}>Professional chauffeur for your car</p>
          </div>
          <button
            onClick={() => setBookingOpen(false)}
            style={{ background: 'var(--chip)', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px' }}
          >
            ✕
          </button>
        </div>

        {/* Category Selector Tabs */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '20px', paddingBottom: '4px' }}>
          {Object.keys(catConfig).map(k => (
            <button
              key={k}
              className={`chip-btn ${bookingCategory === k ? 'on' : ''}`}
              style={{
                padding: '8px 14px',
                borderRadius: '16px',
                background: bookingCategory === k ? 'var(--yellow)' : 'var(--chip)',
                color: bookingCategory === k ? 'var(--on-yellow)' : 'var(--ink)',
                border: 'none',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
              onClick={() => {
                setBookingCategory(k);
                setQty(catConfig[k].min);
              }}
            >
              {catConfig[k].name.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Duration / Quantity Counter */}
        {cfg.max > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: 'var(--card)', borderRadius: '16px', border: '1px solid var(--line)', marginBottom: '16px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600 }}>Duration ({cfg.unit})</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <button
                disabled={qty <= cfg.min}
                onClick={() => setQty(q => Math.max(cfg.min, q - 1))}
                style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--chip)', border: 'none', fontWeight: 700, cursor: 'pointer' }}
              >
                -
              </button>
              <b style={{ fontSize: '16px', minWidth: '24px', textAlign: 'center' }}>{qty}</b>
              <button
                disabled={qty >= cfg.max}
                onClick={() => setQty(q => Math.min(cfg.max, q + 1))}
                style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--chip)', border: 'none', fontWeight: 700, cursor: 'pointer' }}
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* Locations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>PICKUP LOCATION</label>
            <input
              type="text"
              value={pickup}
              onChange={e => setPickup(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', background: 'var(--field)', border: '1px solid var(--line)', color: 'var(--ink)', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>DROP / DESTINATION</label>
            <input
              type="text"
              value={drop}
              onChange={e => setDrop(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', background: 'var(--field)', border: '1px solid var(--line)', color: 'var(--ink)', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Price Breakdown & CTA */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Estimated Fare</span>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink)' }}>₹{fare}</div>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--good)', fontWeight: 600 }}>Includes GST & Insurance</span>
        </div>

        <button
          className="btn"
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '16px',
            background: 'var(--yellow)',
            color: 'var(--on-yellow)',
            border: 'none',
            fontSize: '16px',
            fontWeight: 800,
            cursor: 'pointer'
          }}
          onClick={() => bookRide(bookingCategory, qty, pickup, drop, fare)}
        >
          Confirm & Book Chauffeur
        </button>
      </div>
    </>
  );
}
