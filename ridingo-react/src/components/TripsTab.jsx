import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Icon from './Icon';

const CATS = {
  hourly: { name: 'Hourly', icon: 'clock', unit: 'hr', units: 'hours' },
  daily: { name: 'Full day', icon: 'sun', unit: 'day', units: 'days' },
  airport: { name: 'Airport', icon: 'plane' },
  outstation: { name: 'Outstation', icon: 'route', unit: 'day', units: 'days' },
  event: { name: 'Night & events', icon: 'moon', unit: 'hr', units: 'hours' }
};

export default function TripsTab() {
  const { trips } = useApp();
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  const F = { all: 'All', up: 'Upcoming', done: 'Completed', cancel: 'Cancelled' };

  let list = trips;
  if (filter === 'up') list = list.filter(t => ['requested', 'accepted', 'scheduled', 'inprogress'].includes(t.status));
  if (filter === 'done') list = list.filter(t => t.status === 'completed');
  if (filter === 'cancel') list = list.filter(t => t.status === 'cancelled');

  const toggleExpand = (id) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const getStatusPill = (status) => {
    switch (status) {
      case 'inprogress':
        return (
          <span className="pill good" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span className="live-pulse-dot" style={{ width: '6px', height: '6px' }} /> On trip
          </span>
        );
      case 'completed':
        return <span className="pill done">Completed</span>;
      case 'scheduled':
        return <span className="pill good">Scheduled</span>;
      case 'cancelled':
        return <span className="pill bad">Cancelled</span>;
      default:
        return <span className="pill warn">Waiting for driver</span>;
    }
  };

  return (
    <div>
      <div className="hello" style={{ marginBottom: '14px' }}>
        <h1>History</h1>
        <p>All your driver bookings</p>
      </div>

      {/* Filter Chips */}
      <div className="chips" style={{ marginBottom: '14px', display: 'flex', gap: '6px', overflowX: 'auto' }}>
        {Object.keys(F).map(k => (
          <button
            key={k}
            className={`chip ${filter === k ? 'on' : ''}`}
            onClick={() => setFilter(k)}
          >
            {F[k]}
          </button>
        ))}
      </div>

      {/* Trip List */}
      {list.length === 0 ? (
        <div className="empty" style={{ textAlign: 'center', padding: '36px 0', color: 'var(--muted)' }}>
          No trips here yet.
        </div>
      ) : (
        <div className="trip-list">
          {list.map(t => {
            const c = CATS[t.cat] || CATS.hourly;
            const isOpen = expandedId === t.id;
            const destName = t.drop_loc || t.pickup || `${c.name} trip`;

            return (
              <div key={t.id} className="trip-row">
                <button
                  className="trip-row-head"
                  onClick={() => toggleExpand(t.id)}
                  aria-expanded={isOpen}
                  style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
                >
                  <span className="trip-row-ic">
                    <Icon name={c.icon} size={22} />
                  </span>
                  <div className="trip-row-main">
                    <b className="trip-row-title ell">{destName}</b>
                    <span className="trip-row-sub ell">
                      {c.name} · ₹{t.fare}
                    </span>
                  </div>
                  <div className="trip-row-right">
                    <span className="trip-row-amt">₹{t.fare}</span>
                    {getStatusPill(t.status)}
                  </div>
                </button>

                {isOpen && (
                  <div className="trip-row-body">
                    {t.status === 'requested' && (
                      <div className="searching">
                        <span className="pulse" />
                        Request sent to nearby drivers
                      </div>
                    )}

                    <div className="route">
                      <div>
                        <span className="ell" style={{ display: 'block' }}>{t.pickup}</span>
                      </div>
                      <div>
                        <span className="ell" style={{ display: 'block' }}>{t.drop_loc || 'Stays with you for the trip'}</span>
                      </div>
                    </div>

                    <div className="drv" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="av" style={{ width: '36px', height: '36px' }}>RK</span>
                      <div className="grow">
                        <b>{t.driver || 'Ravi Kumar'}</b>
                        <span className="sub">★ 4.8 · +91 98765 43210</span>
                      </div>
                    </div>

                    <div className="kv">
                      <div>
                        <span>Your car</span>
                        <b>{t.car?.model} · {t.car?.trans || 'Automatic'}</b>
                      </div>
                      <div>
                        <span>Total fare</span>
                        <b>₹{t.fare}</b>
                      </div>
                      <div>
                        <span>Advance (30%)</span>
                        <b>₹{Math.ceil(t.fare * 0.3)} paid</b>
                      </div>
                      {t.cashback > 0 && (
                        <div>
                          <span>Cashback earned</span>
                          <b style={{ color: 'var(--good)' }}>+₹{t.cashback}</b>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
