import React from 'react';
import Icon from './Icon';
import { cleanLocationName } from '../utils/locationCleaner';

export default function TripCancellationModal({ trip, onConfirm, onClose }) {
  if (!trip) return null;

  const isDriverAssigned = Boolean(trip.driver || trip.driverId || trip.driver_id || ['accepted', 'pickup_arrived', 'ready_to_start', 'scheduled', 'on_the_way', 'arrived', 'started', 'in_progress'].includes(trip.status));
  const cancelFee = isDriverAssigned ? 100 : 0;
  const advancePaid = Number(trip.advance) || 0;
  const refundAmount = Math.max(0, advancePaid - cancelFee);
  const driverName = (typeof trip.driver === 'string' ? trip.driver : trip.driver?.name) || trip.driverObj?.name || 'Assigned Driver';

  // Format short address helper
  const formatShortLoc = (loc, fallback) => {
    if (!loc) return fallback;
    const clean = cleanLocationName(loc);
    const parts = clean.split(',');
    return parts[0]?.trim() || fallback;
  };

  const pickupShort = formatShortLoc(trip.pickup, 'Pickup Location');
  const dropShort = formatShortLoc(trip.drop_loc, 'Destination');

  return (
    <div
      className="cancel-modal-overlay"
      role="dialog"
      aria-modal="true"
    >
      <div className="cancel-modal-scrim" onClick={onClose} />

      <div
        className="cancel-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sleek Drag Pill */}
        <div className="cancel-modal-handle" />

        {/* Minimal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Icon name="alert-triangle" size={20} color="#EF4444" />
            </div>
            <div>
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: 750,
                  margin: 0,
                  color: 'var(--ink, #F5F5F7)',
                  lineHeight: 1.25,
                  letterSpacing: '-0.3px'
                }}
              >
                Cancel Upcoming Trip?
              </h3>
              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--muted, #9A9AA1)',
                  fontWeight: 500,
                  marginTop: '3px',
                  display: 'block'
                }}
              >
                Booking ID: {trip.id}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--field, #2C2C2E)',
              border: 'none',
              color: 'var(--muted, #9A9AA1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0
            }}
            aria-label="Close modal"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* Route & Driver Capsule */}
        <div
          style={{
            background: 'var(--field, #2C2C2E)',
            borderRadius: '16px',
            padding: '12px 14px',
            marginBottom: '14px',
            border: '1px solid var(--line, rgba(255, 255, 255, 0.08))',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          {/* Pickup -> Drop row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--ink, #F5F5F7)' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22C55E', flexShrink: 0 }} />
            <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '42%' }}>
              {pickupShort}
            </span>
            <Icon name="arrow-right" size={12} color="var(--muted, #9A9AA1)" style={{ flexShrink: 0, opacity: 0.7 }} />
            <span style={{ width: '7px', height: '7px', borderRadius: '2px', background: '#EF4444', flexShrink: 0 }} />
            <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {dropShort}
            </span>
          </div>

          {/* Schedule & Driver status */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11.5px',
              color: 'var(--muted, #9A9AA1)',
              paddingTop: '6px',
              borderTop: '1px solid var(--line, rgba(255, 255, 255, 0.08))'
            }}
          >
            <span>{trip.scheduleDisplay || 'Scheduled'}</span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontWeight: 650,
                color: isDriverAssigned ? '#22C55E' : '#F59E0B'
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: isDriverAssigned ? '#22C55E' : '#F59E0B'
                }}
              />
              {isDriverAssigned ? `Assigned · ${driverName}` : 'Driver Unassigned'}
            </span>
          </div>
        </div>

        {/* Clean Financial Breakdown Card */}
        <div
          style={{
            background: 'var(--field, #2C2C2E)',
            borderRadius: '16px',
            padding: '14px 16px',
            marginBottom: '12px',
            border: '1px solid var(--line, rgba(255, 255, 255, 0.08))'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '13px' }}>
            <span style={{ color: 'var(--muted, #9A9AA1)', fontWeight: 500 }}>Total Booking Fare</span>
            <span style={{ fontWeight: 650, color: 'var(--ink, #F5F5F7)' }}>₹{trip.fare || 0}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '13px' }}>
            <span style={{ color: 'var(--muted, #9A9AA1)', fontWeight: 500 }}>Advance Paid</span>
            <span style={{ fontWeight: 650, color: 'var(--ink, #F5F5F7)' }}>₹{advancePaid}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', fontSize: '13px' }}>
            <span style={{ color: '#EF4444', fontWeight: 600 }}>
              Cancellation Fee ({isDriverAssigned ? 'Assigned' : 'Unassigned'})
            </span>
            <span style={{ fontWeight: 700, color: '#EF4444' }}>-₹{cancelFee}</span>
          </div>

          <div style={{ height: '1px', background: 'var(--line, rgba(255, 255, 255, 0.08))', margin: '10px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 750, color: 'var(--ink, #F5F5F7)' }}>
                Refund to Wallet
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted, #9A9AA1)', marginTop: '2px' }}>
                Instant credit to your balance
              </div>
            </div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 800,
                color: refundAmount > 0 ? '#22C55E' : 'var(--ink, #F5F5F7)',
                background: refundAmount > 0 ? 'rgba(34, 197, 94, 0.12)' : 'transparent',
                padding: refundAmount > 0 ? '4px 10px' : '0',
                borderRadius: '10px'
              }}
            >
              ₹{refundAmount}
            </div>
          </div>
        </div>

        {/* Minimal Policy Notice */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '2px 4px',
            marginBottom: '18px',
            fontSize: '11.5px',
            color: 'var(--muted, #9A9AA1)',
            lineHeight: 1.45
          }}
        >
          <Icon name="info" size={14} color="var(--muted, #9A9AA1)" style={{ flexShrink: 0 }} />
          <span>
            A cancellation charge of ₹{cancelFee} is deducted for dispatch operations. Remaining advance is credited instantly.
          </span>
        </div>

        {/* Action Buttons: Minimal & Modern */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn"
            style={{
              height: '48px',
              borderRadius: '14px',
              background: 'var(--field, #2C2C2E)',
              border: '1px solid var(--line, rgba(255, 255, 255, 0.1))',
              color: 'var(--ink, #F5F5F7)',
              fontSize: '14px',
              fontWeight: 650,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 12px',
              boxSizing: 'border-box'
            }}
          >
            Keep Booking
          </button>
          <button
            type="button"
            onClick={() => onConfirm(trip.id)}
            className="btn"
            style={{
              height: '48px',
              borderRadius: '14px',
              background: '#DC2626',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(220, 38, 38, 0.28)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 12px',
              boxSizing: 'border-box'
            }}
          >
            Confirm & Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
