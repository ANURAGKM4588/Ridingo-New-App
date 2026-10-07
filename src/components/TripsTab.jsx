import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Icon from './Icon';
import { openRazorpayCheckout } from '../utils/razorpay';

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
    addToast,
    setBookingOpen,
    setBookingCategory,
    setLiveTrackingOpen
  } = useApp();

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
  if (filter === 'up') {
    list = list.filter(t => ['requested', 'accepted', 'pickup_arrived', 'ready_to_start', 'scheduled', 'inprogress'].includes(t.status));
  }
  if (filter === 'done') {
    list = list.filter(t => t.status === 'completed');
  }
  if (filter === 'cancel') {
    list = list.filter(t => t.status === 'cancelled');
  }

  const toggleExpand = (id) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

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
            const isOpen = expandedId === t.id;
            const destName = t.drop_loc || t.pickup || `${c.name} trip`;
            const isAssigned = ['accepted', 'pickup_arrived', 'ready_to_start', 'inprogress'].includes(t.status);
            const isWaiting = t.status === 'requested';
            const advancePaid = t.advance || Math.ceil(t.fare * 0.3);
            const remainingDue = Math.max(0, t.fare - advancePaid);

            return (
              <div
                key={t.id}
                className={`trip-row stagger-${Math.min(6, 3 + idx)}`}
                style={{
                  background: isOpen ? 'var(--card, #FFFFFF)' : 'transparent',
                  borderRadius: isOpen ? '20px' : '0px',
                  border: isOpen ? '1.5px solid var(--line, #E2E8F0)' : 'none',
                  borderBottom: !isOpen ? '1px solid var(--line, #E2E8F0)' : '1.5px solid var(--line, #E2E8F0)',
                  padding: isOpen ? '16px' : '14px 4px',
                  margin: isOpen ? '10px 0' : '0',
                  boxShadow: isOpen ? '0 6px 24px rgba(0, 0, 0, 0.06)' : 'none',
                  transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                {/* Clickable Header */}
                <button
                  type="button"
                  className="trip-row-head"
                  onClick={() => toggleExpand(t.id)}
                  aria-expanded={isOpen}
                  style={{ width: '100%', textAlign: 'left', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                >
                  <span className="trip-row-ic">
                    <Icon name={c.icon || 'hourly'} size={22} />
                  </span>
                  <div className="trip-row-main">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <b className="trip-row-title ell" style={{ fontSize: '15px' }}>{destName}</b>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {getStatusPill(t.status)}
                      <span
                        style={{
                          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                          color: 'var(--muted)',
                          display: 'inline-flex',
                          alignItems: 'center'
                        }}
                      >
                        <Icon name="chevronDown" size={15} />
                      </span>
                    </div>
                  </div>
                </button>

                {/* Expanded Full Details (Very Minimal UI) */}
                {isOpen && (
                  <div className="trip-row-body" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--line, #E2E8F0)' }}>
                    
                    {/* Minimal Trip OTP Section (Only title and digits, no extra text) */}
                    <div
                      style={{
                        background: '#000000',
                        color: '#FFFFFF',
                        borderRadius: '13px',
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '8px'
                      }}
                    >
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>
                        {['inprogress', 'ending_otp'].includes(t.status) ? 'Trip End OTP' : 'Trip OTP'}
                      </span>
                      <span
                        style={{
                          fontSize: '22px',
                          fontWeight: 800,
                          letterSpacing: '5px',
                          color: '#FFFFFF',
                          fontFamily: 'var(--font-mono, monospace)',
                          lineHeight: 1
                        }}
                      >
                        {['inprogress', 'ending_otp'].includes(t.status) ? (t.endOtp || '8392') : (t.startOtp || '4821')}
                      </span>
                    </div>

                    {/* Minimal Route Details */}
                    <div className="route" style={{ margin: '4px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#16A34A', flexShrink: 0 }} />
                        <span className="ell" style={{ fontSize: '12.5px', color: 'var(--ink)' }}>{t.pickup}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#DC2626', flexShrink: 0 }} />
                        <span className="ell" style={{ fontSize: '12.5px', color: 'var(--ink)' }}>
                          {t.drop_loc || 'City Route · Stays with you'}
                        </span>
                      </div>
                    </div>

                    {/* Minimal Chauffeur & Vehicle Info */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        background: 'var(--field, #F8FAFC)',
                        borderRadius: '12px',
                        margin: '4px 0'
                      }}
                    >
                      <div>
                        <b style={{ fontSize: '13px', color: 'var(--ink)' }}>
                          {t.driver || (isWaiting ? 'Assigning Chauffeur...' : 'Ravi Kumar')}
                        </b>
                        <span style={{ display: 'block', fontSize: '11.5px', color: 'var(--muted)', marginTop: '1px' }}>
                          {t.car?.model || user?.car?.model || 'Hyundai Creta'} · {t.car?.trans || 'Automatic'}
                        </span>
                      </div>
                      {isAssigned && (
                        <a
                          href="tel:+919876543210"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            background: '#000000',
                            color: '#FFFFFF',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Icon name="phone" size={12} />
                          <span>Call</span>
                        </a>
                      )}
                    </div>

                    {/* Minimal Fare Summary */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        background: 'var(--field, #F8FAFC)',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: 'var(--muted)',
                        margin: '2px 0 6px'
                      }}
                    >
                      <span>Fare: <b style={{ color: 'var(--ink)' }}>₹{t.fare}</b></span>
                      <span>Paid: <b style={{ color: '#16A34A' }}>₹{advancePaid} (30%)</b></span>
                      <span>Due: <b style={{ color: 'var(--ink)' }}>₹{remainingDue}</b></span>
                    </div>

                    {/* Single Track on Live Map Button if Active */}
                    {['accepted', 'pickup_arrived', 'inprogress'].includes(t.status) && (
                      <button
                        type="button"
                        className="btn primary"
                        style={{
                          width: '100%',
                          height: '42px',
                          borderRadius: '12px',
                          background: '#000000',
                          color: '#FFFFFF',
                          border: '1.5px solid #000000',
                          fontWeight: 750,
                          fontSize: '13.5px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          cursor: 'pointer'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setLiveTrackingOpen(true);
                        }}
                      >
                        <Icon name="navigation" size={14} />
                        <span>Track Chauffeur on Live Map</span>
                        <span>➔</span>
                      </button>
                    )}

                    {/* Pay Remaining Balance via Razorpay */}
                    {['inprogress', 'completed'].includes(t.status) && !t.balancePaid && remainingDue > 0 && (
                      <button
                        type="button"
                        className="btn primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePayRemaining(t);
                        }}
                        style={{
                          width: '100%',
                          height: '42px',
                          borderRadius: '12px',
                          fontWeight: 750,
                          fontSize: '13.5px',
                          background: '#000000',
                          color: '#FFFFFF',
                          border: '1.5px solid #000000',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          marginTop: '4px'
                        }}
                      >
                        <span>Pay Remaining ₹{remainingDue} via Razorpay</span>
                      </button>
                    )}

                    {t.balancePaid && (
                      <div style={{ padding: '6px 10px', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.1)', color: '#16A34A', fontSize: '11.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>✓</span>
                        <span>100% Settled via Razorpay</span>
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
