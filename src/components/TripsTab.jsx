import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import Icon from './Icon';
import { openPhonePeCheckout } from '../utils/phonepe';
import { cleanLocationName, getLocationUpToFirstComma } from '../utils/locationCleaner';
import { generateTripInvoiceText, shareInvoiceViaWhatsApp, shareInvoiceViaEmail, autoShareTripInvoice } from '../utils/tripInvoiceSharing';

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
    tripsLoaded,
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
    isTripTrackingUnlocked,
    setTripCompleteModalOpen,
    setCompletedTripData
  } = useApp();

  const [filter, setFilter] = useState('all');

  const handlePayRemaining = (trip) => {
    const extraKm = Number(trip.extensionDistanceKm || trip.additionalKm || 0);
    const extensionFare = Number(trip.extensionFare || (extraKm * 18) || 0);
    const waitingMins = Number(trip.waitingMinutes || 0);
    const waitingFare = Number(trip.waitingFare || (waitingMins * 2) || 0);
    const baseFare = Number(trip.baseFare || trip.originalBaseFare || trip.fare || 0);
    const totalCalculated = baseFare + extensionFare + waitingFare;
    const advancePaid = Number(trip.advance || trip.advancePaid || Math.round(baseFare * 0.3));
    const rem = Math.max(0, totalCalculated - advancePaid);
    if (rem <= 0) return;

    const breakdown = {
      tripId: trip.id,
      bookingId: trip.id,
      baseFare,
      extraKm,
      extensionFare,
      waitingMinutes: waitingMins,
      waitingFare,
      totalTripFare: totalCalculated,
      advancePaid,
      balancePayable: rem,
      riderName: user?.name || trip?.rider?.name || 'Customer',
      riderPhone: user?.phone || trip?.rider?.phone || '',
      riderEmail: user?.email || trip?.rider?.email || '',
      pickup: trip?.pickup?.name || trip?.pickup || 'Pickup',
      drop: trip?.drop?.name || trip?.drop || 'Destination',
      driverName: trip?.driver?.name || 'Assigned Driver'
    };

    openPhonePeCheckout({
      amount: rem,
      name: 'Ridingo Trip Final Settlement',
      description: `Remaining balance for #${trip.id}`,
      trip,
      breakdown,
      prefill: {
        name: user?.name || trip?.rider?.name,
        email: user?.email || trip?.rider?.email,
        phone: user?.phone || trip?.rider?.phone
      },
      notes: {
        tripId: trip.id
      },
      onSuccess: (paymentRes) => {
        const pId = paymentRes.phonepe_payment_id || paymentRes.phonepe_transaction_id || ('pay_ppe_' + Date.now().toString(36));
        setTrips(prev =>
          prev.map(t => (t.id === trip.id ? {
            ...t,
            balancePaid: true,
            balancePaymentId: pId,
            fare: totalCalculated,
            baseFare,
            extensionDistanceKm: extraKm,
            extensionFare,
            waitingMinutes: waitingMins,
            waitingFare
          } : t))
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

        // Auto-share invoice via WhatsApp with Email fallback
        try {
          autoShareTripInvoice({
            trip,
            invoiceData: {
              ...breakdown,
              amountPaid: rem
            },
            preferredMethod: 'whatsapp'
          });
        } catch (e) {
          console.warn('Invoice auto share error:', e);
        }
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
          {!tripsLoaded && list.length === 0 ? (
            <div className="trip-list" style={{ marginTop: '8px' }}>
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="card"
                  style={{
                    padding: '16px',
                    borderRadius: '20px',
                    background: 'var(--card)',
                    border: '1.5px solid var(--line)',
                    marginBottom: '10px',
                    opacity: 0.85
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        background: 'var(--field)',
                        animation: 'pulse 1.4s ease-in-out infinite'
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          width: '55%',
                          height: '14px',
                          borderRadius: '6px',
                          background: 'var(--field)',
                          marginBottom: '8px',
                          animation: 'pulse 1.4s ease-in-out infinite'
                        }}
                      />
                      <div
                        style={{
                          width: '35%',
                          height: '11px',
                          borderRadius: '5px',
                          background: 'var(--field)',
                          animation: 'pulse 1.4s ease-in-out infinite'
                        }}
                      />
                    </div>
                    <div
                      style={{
                        width: '54px',
                        height: '24px',
                        borderRadius: '8px',
                        background: 'var(--field)',
                        animation: 'pulse 1.4s ease-in-out infinite'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : list.length === 0 ? (
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
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', fontSize: '13.5px', fontWeight: 750, margin: '0 auto' }}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            if (setActiveTrackingTripId) setActiveTrackingTripId(t.id);
                            if (setLiveTrackingOpen) setLiveTrackingOpen(true);
                          }}
                          style={{
                            height: '32px',
                            minHeight: 'unset',
                            padding: '0 12px',
                            fontSize: '12px',
                            fontWeight: 700,
                            borderRadius: '8px',
                            background: 'var(--solid, #0F172A)',
                            color: 'var(--on-solid, #FFFFFF)',
                            border: 'none',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <Icon name="navigation" size={12} style={{ color: 'var(--on-solid, #FFFFFF)' }} />
                          <span>Track Live</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const isDriverAssigned = Boolean(
                            t.driver ||
                            t.driverId ||
                            t.driver_id ||
                            ['accepted', 'pickup_arrived', 'ready_to_start', 'scheduled', 'on_the_way', 'arrived', 'started', 'in_progress'].includes(t.status)
                          );
                          if (isDriverAssigned) {
                            if (setTripToCancel) setTripToCancel(t);
                          } else {
                            if (cancelTripByUser) cancelTripByUser(t.id, { feeOverride: 0 });
                            if (setActiveTrackingTripId) setActiveTrackingTripId(null);
                            setLiveTrackingOpen(false);
                            addToast('Trip request cancelled freely. No cancellation fee.', 'check');
                          }
                        }}
                        style={{
                          height: '32px',
                          minHeight: 'unset',
                          padding: '0 12px',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#EF4444',
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.22)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          transition: 'all 0.15s ease'
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

                {/* Completed Trip Invoice Breakdown & Free Auto-Share Buttons */}
                {t.status === 'completed' && (
                  <div style={{ marginTop: '10px', paddingTop: '9px', borderTop: '1px solid var(--line)' }}>
                    <div style={{ background: 'var(--field)', borderRadius: '12px', padding: '10px 12px', marginBottom: '8px', border: '1px solid var(--line)', fontSize: '12px', color: 'var(--muted)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span>Base Booking Fare</span>
                        <b style={{ color: 'var(--ink)' }}>₹{t.baseFare || (t.fare - (t.extensionFare || 0) - (t.waitingFare || 0))}</b>
                      </div>
                      {(t.extensionDistanceKm > 0 || t.extensionFare > 0) && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.25)', marginBottom: '4px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: '#16A34A', fontWeight: 600 }}>
                            <Icon name="route" size={12} color="#16A34A" />
                            <span>Additional Trip ({t.extensionDistanceKm ? `${Number(t.extensionDistanceKm).toFixed(2)} km` : 'Extra km'} @ ₹18/km)</span>
                          </span>
                          <b style={{ color: '#16A34A', fontSize: '12px' }}>+₹{t.extensionFare || Math.round((Number(t.extensionDistanceKm) || 0) * 18)}</b>
                        </div>
                      )}
                      {(t.waitingMinutes > 0 || t.waitingFare > 0) && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)', marginBottom: '4px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: '#EF4444', fontWeight: 600 }}>
                            <Icon name="clock" size={12} color="#EF4444" />
                            <span>Waiting Charge ({t.waitingMinutes ? `${t.waitingMinutes}m billable` : 'Waiting'} @ ₹2/m)</span>
                          </span>
                          <b style={{ color: '#EF4444', fontSize: '12px' }}>+₹{t.waitingFare || (Number(t.waitingMinutes) * 2)}</b>
                        </div>
                      )}
                      <div style={{ height: '1px', background: 'var(--line)', margin: '4px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <b style={{ color: 'var(--ink)' }}>Total Settled Fare</b>
                        <b style={{ color: '#16A34A', fontSize: '13px' }}>₹{t.fare}</b>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const inv = generateTripInvoiceText({
                            trip: t,
                            baseFare: t.baseFare || (t.fare - (t.extensionFare || 0) - (t.waitingFare || 0)),
                            extraKm: Number(t.extensionDistanceKm) || 0,
                            extensionFare: Number(t.extensionFare) || 0,
                            waitingSeconds: Number(t.waitingSeconds) || 0,
                            billableWaitingMinutes: Number(t.waitingMinutes) || 0,
                            waitingFare: Number(t.waitingFare) || 0,
                            totalTripFare: Number(t.fare) || 600,
                            driverName: t.driver || 'Verified Partner',
                            riderName: user?.name || 'Customer',
                            riderPhone: user?.phone || t.rider?.phone || ''
                          });
                          shareInvoiceViaWhatsApp(user?.phone || t.rider?.phone, inv);
                        }}
                        style={{
                          height: '32px',
                          minHeight: 'unset',
                          padding: '0 12px',
                          borderRadius: '8px',
                          background: 'rgba(16, 185, 129, 0.12)',
                          border: '1px solid rgba(16, 185, 129, 0.28)',
                          color: '#10B981',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Icon name="whatsapp" size={13} color="#10B981" />
                        <span>WhatsApp Invoice</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const inv = generateTripInvoiceText({
                            trip: t,
                            baseFare: t.baseFare || (t.fare - (t.extensionFare || 0) - (t.waitingFare || 0)),
                            extraKm: Number(t.extensionDistanceKm) || 0,
                            extensionFare: Number(t.extensionFare) || 0,
                            waitingSeconds: Number(t.waitingSeconds) || 0,
                            billableWaitingMinutes: Number(t.waitingMinutes) || 0,
                            waitingFare: Number(t.waitingFare) || 0,
                            totalTripFare: Number(t.fare) || 600,
                            driverName: t.driver || 'Verified Partner',
                            riderName: user?.name || 'Customer',
                            riderPhone: user?.phone || t.rider?.phone || ''
                          });
                          shareInvoiceViaEmail(user?.email || t.rider?.email, t.id, inv);
                        }}
                        style={{
                          height: '32px',
                          minHeight: 'unset',
                          padding: '0 12px',
                          borderRadius: '8px',
                          background: 'rgba(59, 130, 246, 0.12)',
                          border: '1px solid rgba(59, 130, 246, 0.28)',
                          color: '#3B82F6',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Icon name="mail" size={13} color="#3B82F6" />
                        <span>Email Invoice</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (setCompletedTripData) setCompletedTripData(t);
                          if (setTripCompleteModalOpen) setTripCompleteModalOpen(true);
                        }}
                        style={{
                          height: '32px',
                          minHeight: 'unset',
                          padding: '0 12px',
                          borderRadius: '8px',
                          background: '#FEF3C7',
                          border: '1px solid #F59E0B',
                          color: '#92400E',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span style={{ color: '#D97706' }}>★</span>
                        <span>Trip Complete & Rating</span>
                      </button>
                    </div>
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
