import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Icon from './Icon';
import { openPhonePeCheckout } from '../utils/phonepe';

const CATS = {
  hourly: { name: 'Hourly', icon: 'hourly', unit: 'hr', units: 'hours' },
  daily: { name: 'Full day', icon: 'sun', unit: 'day', units: 'days' },
  airport: { name: 'Airport', icon: 'plane' },
  outstation: { name: 'Outstation', icon: 'route', unit: 'day', units: 'days' },
  event: { name: 'Night & events', icon: 'moon', unit: 'hr', units: 'hours' }
};

export default function TripsTab() {
  const {
    trips,
    setTrips,
    setUtx,
    user,
    isUserTrip,
    addToast,
    setBookingOpen,
    setBookingCategory,
    setLiveTrackingOpen,
    setActiveTrackingTripId
  } = useApp();

  const [filter, setFilter] = useState('all');

  const handlePayRemaining = (trip) => {
    const rem = Math.max(0, trip.fare - (trip.advance || Math.round(trip.fare * 0.3)));
    if (rem <= 0) return;

    openPhonePeCheckout({
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
        const pId = paymentRes.phonepe_payment_id || paymentRes.phonepe_transaction_id || ('pay_ppe_' + Date.now().toString(36));
        setTrips(prev =>
          prev.map(t => (t.id === trip.id ? { ...t, balancePaid: true, balancePaymentId: pId } : t))
        );
        const newTx = {
          ts: Date.now(),
          type: 'trip',
          amount: -rem,
          title: `Trip Settlement · ${trip.id}`,
          sub: `PhonePe (${pId.slice(0, 14)}) · Just now`,
          gateway: 'PhonePe',
          paymentId: pId
        };
        setUtx(prev => [newTx, ...prev]);
        addToast(`Remaining ₹${rem} settled via PhonePe!`, 'check');
      },
      onError: () => {
        addToast('Settlement cancelled or failed', 'warn');
      }
    });
  };

  const F = { all: 'All', up: 'Upcoming', done: 'Completed', cancel: 'Cancelled' };

  let list = (trips || []).filter(t => isUserTrip(t, user));
  if (filter === 'up') {
    list = list.filter(t => ['requested', 'accepted', 'pickup_arrived', 'ready_to_start', 'scheduled', 'inprogress'].includes(t.status));
  }
  if (filter === 'done') {
    list = list.filter(t => t.status === 'completed');
  }
  if (filter === 'cancel') {
    list = list.filter(t => t.status === 'cancelled');
  }

  const getStatusPill = (status) => {
    switch (status) {
      case 'accepted':
        return (
          <span className="pill good" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(34, 197, 94, 0.12)', color: '#16A34A', fontWeight: 750 }}>
            Chauffeur Assigned
          </span>
        );
      case 'pickup_arrived':
        return (
          <span className="pill good" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(34, 197, 94, 0.16)', color: '#15803D', fontWeight: 800 }}>
            Driver Arrived
          </span>
        );
      case 'ready_to_start':
        return (
          <span className="pill good" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(34, 197, 94, 0.16)', color: '#15803D', fontWeight: 800 }}>
            Ready to Start
          </span>
        );
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
        <div className="card stagger-3" style={{ textAlign: 'center', padding: '40px 20px', borderRadius: '22px', background: 'var(--card)', border: '1.5px solid var(--line)', marginTop: '8px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--field)', color: 'var(--ink)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Icon name="route" size={26} />
          </div>
          <b style={{ fontSize: '17px', color: 'var(--ink)', display: 'block', marginBottom: '6px' }}>No rides yet</b>
          <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 auto 20px', maxWidth: '250px', lineHeight: 1.45 }}>
            Your upcoming and completed bookings will appear here once you hire a verified chauffeur.
          </p>
          <button
            type="button"
            className="btn primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '999px', fontSize: '13.5px', fontWeight: 750, margin: '0 auto' }}
            onClick={() => {
              const activeTrip = (trips || []).find(t =>
                isUserTrip(t, user) &&
                ['requested', 'accepted', 'pickup_arrived', 'ready_to_start', 'inprogress'].includes(t.status)
              );
              if (activeTrip) {
                if (addToast) addToast('You already have an active ride in progress. Complete your ongoing trip before booking another one.', 'warn');
                if (setActiveTrackingTripId) setActiveTrackingTripId(activeTrip.id);
                setLiveTrackingOpen(true);
                return;
              }
              setBookingCategory('hourly');
              setBookingOpen(true);
            }}
          >
            <Icon name="navigation" size={15} />
            <span>Book a Chauffeur</span>
          </button>
        </div>
      ) : (
        <div className="trip-list">
          {list.map((t, idx) => {
            const c = CATS[t.cat] || CATS.hourly;
            const destName = t.drop_loc || t.pickup || `${c.name} trip`;
            const isAssigned = ['accepted', 'pickup_arrived', 'ready_to_start', 'inprogress'].includes(t.status);

            return (
              <div
                key={t.id}
                className={`trip-row stagger-${Math.min(6, 3 + idx)}`}
                onClick={() => {
                  if (['accepted', 'pickup_arrived', 'ready_to_start', 'inprogress'].includes(t.status)) {
                    if (setActiveTrackingTripId) setActiveTrackingTripId(t.id);
                    if (setLiveTrackingOpen) setLiveTrackingOpen(true);
                  }
                }}
                style={{
                  cursor: isAssigned ? 'pointer' : 'default'
                }}
              >
                <div className="trip-row-head">
                  <span className="trip-row-ic">
                    <Icon name={c.icon || 'hourly'} size={22} />
                  </span>
                  <div className="trip-row-main">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <b className="trip-row-title ell">{destName}</b>
                      {isAssigned && (
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 800,
                            background: '#000000',
                            color: '#FFFFFF',
                            padding: '1.5px 6px',
                            borderRadius: '5px',
                            fontFamily: 'var(--font-mono, monospace)',
                            letterSpacing: '0.04em'
                          }}
                        >
                          OTP: {t.startOtp || '4821'}
                        </span>
                      )}
                    </div>
                    <span className="trip-row-sub ell">
                      {c.name} · {t.scheduleDisplay || 'Now'}
                    </span>
                  </div>
                  <div className="trip-row-right">
                    <span className="trip-row-amt">₹{t.fare}</span>
                    {getStatusPill(t.status)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
