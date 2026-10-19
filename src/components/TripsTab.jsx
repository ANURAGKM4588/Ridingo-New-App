import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import Icon from './Icon';
import { openPhonePeCheckout } from '../utils/phonepe';
import { cleanLocationName, getLocationUpToFirstComma } from '../utils/locationCleaner';

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
    setActiveTrackingTripId,
    setTripToCancel,
    isUpcomingFutureTrip,
    isTripTrackingUnlocked
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
            Driver Assigned
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

      {/* Apple-Style Minimal Segmented Trip Status Bar */}
      <div
        className="stagger-2"
        style={{
          marginBottom: '16px',
          background: 'var(--field)',
          borderRadius: '16px',
          padding: '4px',
          display: 'grid',
          gridTemplateColumns: `repeat(${Object.keys(F).length}, 1fr)`,
          gap: '4px',
          border: '1px solid var(--line)',
          position: 'relative'
        }}
      >
        {Object.keys(F).map((k) => {
          const isActive = filter === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              style={{
                position: 'relative',
                height: '38px',
                border: 'none',
                background: 'transparent',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: isActive ? 700 : 550,
                color: isActive ? 'var(--ink)' : 'var(--muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
                zIndex: 1,
                transition: 'color 0.18s ease',
                WebkitTapHighlightColor: 'transparent',
                userSelect: 'none'
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="appleTripStatusActivePill"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '12px',
                    background: 'var(--card)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
                    zIndex: -1
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 480,
                    damping: 38,
                    mass: 0.8
                  }}
                />
              )}
              <span style={{ position: 'relative', zIndex: 2 }}>{F[k]}</span>
            </button>
          );
        })}
      </div>

      {/* Trip List with Apple-style smooth crossfade */}
      <AnimatePresence mode="wait">
        <motion.div
          key={filter}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {list.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px 20px', borderRadius: '22px', background: 'var(--card)', border: '1.5px solid var(--line)', marginTop: '8px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--field)', color: 'var(--ink)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Icon name="route" size={26} />
          </div>
          <b style={{ fontSize: '17px', color: 'var(--ink)', display: 'block', marginBottom: '6px' }}>No rides yet</b>
          <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 auto 20px', maxWidth: '250px', lineHeight: 1.45 }}>
            Your upcoming and completed bookings will appear here once you hire a verified driver.
          </p>
          <button
            type="button"
            className="btn primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '999px', fontSize: '13.5px', fontWeight: 750, margin: '0 auto' }}
            onClick={() => {
              setBookingCategory('hourly');
              setBookingOpen(true);
            }}
          >
            <Icon name="navigation" size={15} />
            <span>Book a Driver</span>
          </button>
        </div>
      ) : (
        <div className="trip-list">
          {list.map((t, idx) => {
            const c = CATS[t.cat] || CATS.hourly;
            const destName = getLocationUpToFirstComma(t.drop_loc) || getLocationUpToFirstComma(t.pickup) || `${c.name} trip`;
            const isAssigned = ['accepted', 'pickup_arrived', 'ready_to_start', 'inprogress'].includes(t.status);
            const isFuture = isUpcomingFutureTrip ? isUpcomingFutureTrip(t) : false;
            const trackingUnlocked = isTripTrackingUnlocked ? isTripTrackingUnlocked(t) : !isFuture;
            const canTrack = trackingUnlocked && isAssigned;

            return (
              <div
                key={t.id}
                className={`trip-row stagger-${Math.min(6, 3 + idx)}`}
                onClick={() => {
                  if (canTrack) {
                    if (setActiveTrackingTripId) setActiveTrackingTripId(t.id);
                    if (setLiveTrackingOpen) setLiveTrackingOpen(true);
                  } else if (isFuture) {
                    if (addToast) addToast(`Scheduled for ${t.scheduleDisplay || 'upcoming'}. Live GPS tracking unlocks 2 hours before pickup.`, 'info');
                  }
                }}
                style={{
                  cursor: canTrack ? 'pointer' : 'default'
                }}
              >
                <div className="trip-row-head">
                  <span className="trip-row-ic">
                    <Icon name={c.icon || 'hourly'} size={22} />
                  </span>
                  <div className="trip-row-main">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <b className="trip-row-title ell">{destName}</b>
                      {isAssigned && !isFuture && (
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 800,
                            background: 'var(--solid)',
                            color: 'var(--on-solid)',
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
                    {isFuture && ['requested', 'accepted', 'scheduled'].includes(t.status) ? (
                      <span className="pill good" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        Scheduled
                      </span>
                    ) : (
                      getStatusPill(t.status)
                    )}
                  </div>
                </div>

                {['requested', 'accepted', 'pickup_arrived', 'ready_to_start', 'scheduled'].includes(t.status) && (
                  <div
                    style={{
                      marginTop: '10px',
                      paddingTop: '9px',
                      borderTop: '1px solid var(--line)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px'
                    }}
                  >
                    <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>
                      {isFuture
                        ? 'Scheduled · Tracking unlocks 2h before trip'
                        : ['accepted', 'pickup_arrived', 'ready_to_start'].includes(t.status)
                          ? 'Driver assigned · Tracking active'
                          : 'Searching driver · ₹50 fee applies'}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {canTrack && (
                        <button
                          type="button"
                          className="btn primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (setActiveTrackingTripId) setActiveTrackingTripId(t.id);
                            if (setLiveTrackingOpen) setLiveTrackingOpen(true);
                          }}
                          style={{
                            padding: '4px 12px',
                            fontSize: '11.5px',
                            fontWeight: 750,
                            borderRadius: '999px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Icon name="navigation" size={12} />
                          <span>Track Live</span>
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (setTripToCancel) setTripToCancel(t);
                        }}
                        style={{
                          padding: '4px 12px',
                          fontSize: '11.5px',
                          fontWeight: 750,
                          color: '#EF4444',
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.28)',
                          borderRadius: '999px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Cancel Ride
                      </button>
                    </div>
                  </div>
                )}

                {t.status === 'cancelled' && (t.cancellationFee || t.cancelFee) && (
                  <div
                    style={{
                      marginTop: '8px',
                      paddingTop: '8px',
                      borderTop: '1px solid var(--line)',
                      fontSize: '11.5px',
                      color: '#EF4444',
                      fontWeight: 650,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span>Cancellation fee charged</span>
                    <b>₹{t.cancellationFee || t.cancelFee}</b>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
