import React from 'react';
import Icon from './Icon';

export default function TripCancellationModal({ trip, onConfirm, onClose }) {
  if (!trip) return null;

  const isDriverAssigned = ['accepted', 'pickup_arrived', 'ready_to_start', 'scheduled'].includes(trip.status);
  const cancelFee = isDriverAssigned ? 100 : 50;
  const advancePaid = Number(trip.advance) || 0;
  const refundAmount = Math.max(0, advancePaid - cancelFee);
  const driverName = (typeof trip.driver === 'string' ? trip.driver : trip.driver?.name) || trip.driverObj?.name || 'Assigned Chauffeur';

  return (
    <div
      className="layer on"
      style={{
        zIndex: 10005,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: 0
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="scrim" onClick={onClose} />

      <div
        className="sheet"
        style={{
          width: '100%',
          maxWidth: '460px',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--card, #FFFFFF)',
          borderTopLeftRadius: '28px',
          borderTopRightRadius: '28px',
          padding: '26px 24px max(34px, calc(env(safe-area-inset-bottom, 0px) + 26px))',
          boxShadow: '0 -12px 48px rgba(0, 0, 0, 0.22)',
          borderTop: '2.5px solid #EF4444',
          position: 'relative',
          boxSizing: 'border-box',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab bar with generous breathing space */}
        <div
          style={{
            width: '44px',
            height: '4px',
            borderRadius: '999px',
            background: 'var(--line, #CBD5E1)',
            margin: '0 auto 22px'
          }}
        />

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Icon name="alert-triangle" size={24} color="#DC2626" />
            </div>
            <div>
              <h3
                style={{
                  fontSize: '19px',
                  fontWeight: 800,
                  margin: 0,
                  color: 'var(--ink, #0F172A)',
                  lineHeight: 1.25,
                  letterSpacing: '-0.3px'
                }}
              >
                Cancel Upcoming Trip?
              </h3>
              <span
                style={{
                  fontSize: '12.5px',
                  color: 'var(--muted, #64748B)',
                  fontWeight: 600,
                  marginTop: '4px',
                  display: 'block'
                }}
              >
                Booking ID: {trip.id}
              </span>
            </div>
          </div>
        </div>

        {/* Chauffeur & Route Status Badge */}
        <div
          style={{
            padding: '13px 16px',
            borderRadius: '14px',
            background: isDriverAssigned ? 'rgba(34, 197, 94, 0.08)' : 'rgba(245, 158, 11, 0.1)',
            border: isDriverAssigned ? '1px solid rgba(34, 197, 94, 0.25)' : '1px solid rgba(245, 158, 11, 0.25)',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isDriverAssigned ? '#16A34A' : '#F59E0B',
                flexShrink: 0
              }}
            />
            <span
              style={{
                fontSize: '13px',
                fontWeight: 750,
                color: isDriverAssigned ? '#16A34A' : '#D97706',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {isDriverAssigned ? `Chauffeur Dispatched · ${driverName}` : 'Chauffeur Not Assigned Yet'}
            </span>
          </div>
          <span
            style={{
              fontSize: '11.5px',
              fontWeight: 700,
              color: 'var(--muted, #64748B)',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            {trip.scheduleDisplay || 'Scheduled'}
          </span>
        </div>

        {/* Route Details Box */}
        <div
          style={{
            padding: '16px 18px',
            borderRadius: '16px',
            background: 'var(--field, #F8FAFC)',
            border: '1px solid var(--line, #E2E8F0)',
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#22C55E',
                flexShrink: 0,
                marginTop: '5px'
              }}
            />
            <div style={{ fontSize: '13px', color: 'var(--ink, #0F172A)', lineHeight: 1.45, flex: 1 }}>
              <b style={{ color: '#0F172A', marginRight: '6px' }}>Pickup:</b> {trip.pickup}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '2px',
                background: '#EF4444',
                flexShrink: 0,
                marginTop: '5px'
              }}
            />
            <div style={{ fontSize: '13px', color: 'var(--ink, #0F172A)', lineHeight: 1.45, flex: 1 }}>
              <b style={{ color: '#0F172A', marginRight: '6px' }}>Drop:</b> {trip.drop_loc || 'City Destination'}
            </div>
          </div>
        </div>

        {/* Cancellation Fee & Refund Breakdown Card */}
        <div
          style={{
            padding: '18px 20px',
            borderRadius: '16px',
            background: 'var(--field, #F8FAFC)',
            border: '1.5px solid var(--line, #E2E8F0)',
            marginBottom: '16px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '11px', fontSize: '13.5px' }}>
            <span style={{ color: 'var(--muted, #64748B)', fontWeight: 600 }}>Total Booking Fare</span>
            <span style={{ fontWeight: 700, color: 'var(--ink, #0F172A)' }}>₹{trip.fare}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '11px', fontSize: '13.5px' }}>
            <span style={{ color: 'var(--muted, #64748B)', fontWeight: 600 }}>Advance Paid Online</span>
            <span style={{ fontWeight: 700, color: 'var(--ink, #0F172A)' }}>₹{advancePaid}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '11px', fontSize: '13.5px' }}>
            <span style={{ color: '#DC2626', fontWeight: 750 }}>
              Platform Cancellation Fee ({isDriverAssigned ? 'Chauffeur Assigned' : 'Unassigned'})
            </span>
            <span style={{ fontWeight: 800, color: '#DC2626' }}>-₹{cancelFee}</span>
          </div>

          <div style={{ height: '1px', background: 'var(--line, #E2E8F0)', margin: '12px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div>
              <b style={{ fontSize: '14px', color: 'var(--ink, #0F172A)' }}>Refund to Wallet</b>
              <span style={{ fontSize: '11.5px', color: 'var(--muted, #64748B)', display: 'block', marginTop: '2px' }}>
                Instant credit to your balance
              </span>
            </div>
            <b
              style={{
                fontSize: '20px',
                fontWeight: 850,
                color: refundAmount > 0 ? '#16A34A' : 'var(--ink, #0F172A)'
              }}
            >
              ₹{refundAmount}
            </b>
          </div>
        </div>

        {/* Cancellation Notice Policy Card */}
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.04)',
            border: '1px solid rgba(239, 68, 68, 0.16)',
            borderRadius: '14px',
            padding: '14px 16px',
            margin: '0 0 24px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px'
          }}
        >
          <div style={{ marginTop: '2px', flexShrink: 0 }}>
            <Icon name="info" size={16} color="#EF4444" />
          </div>
          <p style={{ fontSize: '12px', color: 'var(--muted, #64748B)', lineHeight: 1.5, margin: 0 }}>
            <b style={{ color: 'var(--ink, #0F172A)' }}>Platform Policy:</b> A cancellation charge of ₹{cancelFee} is deducted to cover dispatch & operational costs. Any remaining advance of ₹{refundAmount} is instantly credited to your wallet.
          </p>
        </div>

        {/* Action Buttons: Balanced Rounded Corner Rectangles */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn"
            style={{
              height: '52px',
              borderRadius: '14px',
              background: 'var(--field, #F1F5F9)',
              border: '1.5px solid var(--line, #CBD5E1)',
              color: 'var(--ink, #0F172A)',
              fontSize: '14.5px',
              fontWeight: 750,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 12px'
            }}
          >
            Keep Booking
          </button>
          <button
            type="button"
            onClick={() => onConfirm(trip.id)}
            className="btn"
            style={{
              height: '52px',
              borderRadius: '14px',
              background: '#DC2626',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '14.5px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(220, 38, 38, 0.28)',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 12px'
            }}
          >
            Confirm & Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
