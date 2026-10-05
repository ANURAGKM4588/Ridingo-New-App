import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Icon from './Icon';
import { openRazorpayCheckout } from '../utils/razorpay';

const CATS = {
  hourly: { name: 'Hourly', icon: 'clock', unit: 'hr', units: 'hours' },
  daily: { name: 'Full day', icon: 'sun', unit: 'day', units: 'days' },
  airport: { name: 'Airport', icon: 'plane' },
  outstation: { name: 'Outstation', icon: 'route', unit: 'day', units: 'days' },
  event: { name: 'Night & events', icon: 'moon', unit: 'hr', units: 'hours' }
};

export default function TripsTab() {
  const { trips, setTrips, setUtx, user, addToast } = useApp();
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  const handlePayRemaining = (trip) => {
    const rem = Math.max(0, trip.fare - (trip.advance || Math.round(trip.fare * 0.3)));
    if (rem <= 0) return;

    openRazorpayCheckout({
      amount: rem,
      name: 'Ridingo Trip Final Settlement',
      description: `Remaining balance for ${trip.id}`,
      prefill: {
        name: user?.name,
        email: user?.email,
        phone: user?.phone
      },
      notes: {
        tripId: trip.id
      },
      onSuccess: (paymentRes) => {
        const pId = paymentRes.razorpay_payment_id || ('pay_test_' + Date.now().toString(36));
        setTrips(prev =>
          prev.map(t => (t.id === trip.id ? { ...t, balancePaid: true, balancePaymentId: pId } : t))
        );
        const newTx = {
          ts: Date.now(),
          type: 'trip',
          amount: -rem,
          title: `Trip Settlement · ${trip.id}`,
          sub: `Razorpay (${pId.slice(0, 14)}) · Just now`,
          gateway: 'Razorpay',
          paymentId: pId
        };
        setUtx(prev => [newTx, ...prev]);
        addToast(`Remaining ₹${rem} settled via Razorpay!`, 'check');
      },
      onError: () => {
        addToast('Settlement cancelled or failed', 'warn');
      }
    });
  };

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
      <div className="hello stagger-1" style={{ marginBottom: '14px' }}>
        <h1>History</h1>
        <p>All your driver bookings</p>
      </div>

      {/* Filter Chips */}
      <div className="chips stagger-2" style={{ marginBottom: '14px', display: 'flex', gap: '6px', overflowX: 'auto' }}>
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
        <div className="empty stagger-3" style={{ textAlign: 'center', padding: '36px 0', color: 'var(--muted)' }}>
          No trips here yet.
        </div>
      ) : (
        <div className="trip-list">
          {list.map((t, idx) => {
            const c = CATS[t.cat] || CATS.hourly;
            const isOpen = expandedId === t.id;
            const destName = t.drop_loc || t.pickup || `${c.name} trip`;

            return (
              <div key={t.id} className={`trip-row stagger-${Math.min(6, 3 + idx)}`}>
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
                      {c.name} · {t.scheduleDisplay || 'Now'} · ₹{t.fare}
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
                        <b style={{ color: 'var(--good)' }}>
                          ₹{t.advance || Math.ceil(t.fare * 0.3)} paid {t.paymentId ? `(Razorpay: ${t.paymentId.slice(0, 10)}...)` : '(Razorpay)'}
                        </b>
                      </div>
                      {t.cashback > 0 && (
                        <div>
                          <span>Razorpay Cashback</span>
                          <b style={{ color: '#22C55E' }}>+₹{t.cashback} (5%)</b>
                        </div>
                      )}
                    </div>

                    {/* Pay Remaining Balance via Razorpay */}
                    {['inprogress', 'completed'].includes(t.status) && !t.balancePaid && (
                      <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--line)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12.5px', color: 'var(--muted)' }}>
                            Remaining Balance (70%)
                          </span>
                          <b style={{ fontSize: '14px', color: 'var(--ink)' }}>
                            ₹{Math.max(0, t.fare - (t.advance || Math.round(t.fare * 0.3)))}
                          </b>
                        </div>
                        <button
                          type="button"
                          className="btn primary block"
                          onClick={() => handlePayRemaining(t)}
                          style={{
                            width: '100%',
                            height: '42px',
                            borderRadius: '12px',
                            fontWeight: 750,
                            fontSize: '13.5px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                        >
                          <span>Pay Remaining via Razorpay</span>
                          <span style={{ fontSize: '10px', background: 'rgba(0,0,0,0.15)', padding: '2px 5px', borderRadius: '4px' }}>
                            Test
                          </span>
                        </button>
                      </div>
                    )}

                    {t.balancePaid && (
                      <div style={{ marginTop: '10px', padding: '8px 10px', borderRadius: '10px', background: 'rgba(34, 197, 94, 0.1)', color: '#16A34A', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>✓</span>
                        <span>Trip fare 100% fully settled via Razorpay ({t.balancePaymentId?.slice(0, 12) || 'RZP'})</span>
                      </div>
                    )}
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
