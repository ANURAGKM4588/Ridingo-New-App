import React from 'react';
import { useApp } from '../context/AppContext';

export default function TripsTab() {
  const { trips, tripsFilter, setTripsFilter, setBookingOpen, setBookingCategory } = useApp();

  const filteredTrips = trips.filter(t => {
    if (tripsFilter === 'all') return true;
    return t.status === tripsFilter;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'inprogress':
        return <span className="pill good" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><span className="live-pulse-dot" style={{ width: '6px', height: '6px' }}></span> On trip</span>;
      case 'completed':
        return <span className="pill done">Completed</span>;
      case 'scheduled':
        return <span className="pill good">Scheduled</span>;
      case 'cancelled':
        return <span className="pill bad">Cancelled</span>;
      default:
        return <span className="pill warn">Requested</span>;
    }
  };

  return (
    <div className="tab-pane active" id="tab-trips">
      <div className="hello" style={{ marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '34px', fontWeight: 700, letterSpacing: '-1px', lineHeight: 1.1 }}>History</h1>
          <p>Your recent chauffeur bookings</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="seg" style={{ display: 'flex', overflowX: 'auto', gap: '6px', marginBottom: '16px' }}>
        {['all', 'inprogress', 'completed', 'scheduled', 'cancelled'].map(f => (
          <button
            key={f}
            className={tripsFilter === f ? 'on' : ''}
            onClick={() => setTripsFilter(f)}
            style={{ textTransform: 'capitalize' }}
          >
            {f === 'inprogress' ? 'On Trip' : f}
          </button>
        ))}
      </div>

      {/* Trips List */}
      {filteredTrips.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--muted)' }}>
          <p style={{ fontSize: '15px' }}>No trips found under this filter.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredTrips.map(t => (
            <div
              key={t.id}
              className="rcard"
              style={{ padding: '16px', borderRadius: '18px', background: 'var(--card)', border: '1px solid var(--line)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)' }}>{t.id}</span>
                {getStatusBadge(t.status)}
              </div>

              {/* Route line */}
              <div className="route-line" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--good)' }}></span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>{t.pickup}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--bad)' }}></span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>{t.drop_loc || 'City Tour'}</span>
                </div>
              </div>

              {/* Footer info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--line)' }}>
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Chauffeur: <b>{t.driver}</b></span>
                  {t.cashback > 0 && (
                    <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--good)', fontWeight: 600 }}>
                      +₹{t.cashback} cashback
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>
                  ₹{t.fare}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
