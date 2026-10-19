import React, { useState, useEffect } from 'react';
import Icon from './Icon';
import { getLocationUpToFirstComma } from '../utils/locationCleaner';
import { playNativeAlertChime, stopActiveTone } from '../services/pushNotificationService';

/**
 * DriverCustomTripNotification:
 * Bottom-to-Top Slide-Up Popup Modal for Incoming Trip Requests.
 * 
 * Features:
 * - 20-second countdown timer that automatically auto-hides the popup when expired.
 * - Displays To-From locations stripped cleanly up to the first comma only.
 * - Shows Fare Amount (₹), Advance Paid, Scheduled Time, Distance & ETA.
 * - Full Dark/Light mode support with custom action buttons (Decline & Accept).
 */
export default function DriverCustomTripNotification({ trip, onAccept, onDecline, onExpand }) {
  const [countdown, setCountdown] = useState(20);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    if (typeof document !== 'undefined') {
      const docTheme = document.documentElement.getAttribute('data-theme');
      if (docTheme) return docTheme === 'dark';
    }
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Track dynamic theme changes
  useEffect(() => {
    const checkTheme = () => {
      const docTheme = document.documentElement.getAttribute('data-theme');
      if (docTheme) {
        setIsDarkTheme(docTheme === 'dark');
      } else if (window.matchMedia) {
        setIsDarkTheme(window.matchMedia('(prefers-color-scheme: dark)').matches);
      }
    };

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    let mediaQuery = null;
    if (window.matchMedia) {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', checkTheme);
    }

    return () => {
      observer.disconnect();
      if (mediaQuery) mediaQuery.removeEventListener('change', checkTheme);
    };
  }, []);

  // Audio chime & 20s Countdown Timer with auto-hide
  useEffect(() => {
    setCountdown(20);
    try {
      playNativeAlertChime('alert');
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([150, 75, 150, 75, 300]);
      }
    } catch (_) {}

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          stopActiveTone();
          if (onDecline) onDecline(trip?.id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      stopActiveTone();
    };
  }, [trip?.id]);

  if (!trip) return null;

  const fare = Number(trip.fare) || 600;
  const advance = Number(trip.advance) || Math.round(fare * 0.3);
  
  // Locations cleanly extracted up to the first comma only
  const pickup = getLocationUpToFirstComma(trip.pickup || trip.from, 'Pickup Location');
  const drop = getLocationUpToFirstComma(trip.drop_loc || trip.drop || trip.to, 'Destination');
  const distance = trip.distanceText || trip.distance || '12.4 km';
  const duration = trip.durationText || trip.duration || '28 mins';
  const time = trip.time || trip.scheduled_time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const theme = {
    bg: isDarkTheme ? '#121318' : '#FFFFFF',
    textPrimary: isDarkTheme ? '#FFFFFF' : '#0F172A',
    textSecondary: isDarkTheme ? '#94A3B8' : '#64748B',
    border: isDarkTheme ? '1.5px solid #27272A' : '1.5px solid #E2E8F0',
    fieldBg: isDarkTheme ? '#1E2028' : '#F8FAFC',
    pillBorder: isDarkTheme ? '1px solid #334155' : '1px solid #E2E8F0',
    handle: isDarkTheme ? '#334155' : '#CBD5E1',
    shadow: isDarkTheme
      ? '0 -16px 48px rgba(0, 0, 0, 0.85), 0 -2px 0 rgba(255, 255, 255, 0.08)'
      : '0 -16px 48px rgba(0, 0, 0, 0.22), 0 -1px 0 rgba(0, 0, 0, 0.05)'
  };

  return (
    <div
      className="driver-popup-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100010,
        background: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={() => {
        if (onDecline) onDecline(trip.id);
      }}
    >
      <div
        className="driver-custom-bottom-popup"
        style={{
          width: '100%',
          maxWidth: '460px',
          background: theme.bg,
          borderTop: theme.border,
          borderTopLeftRadius: '28px',
          borderTopRightRadius: '28px',
          padding: '12px 20px calc(20px + env(safe-area-inset-bottom, 12px))',
          boxShadow: theme.shadow,
          boxSizing: 'border-box',
          color: theme.textPrimary,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
          userSelect: 'none',
          animation: 'slideUpFromBottom 0.28s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Centered Drag Handle Indicator */}
        <div
          style={{
            width: '42px',
            height: '4.5px',
            borderRadius: '999px',
            background: theme.handle,
            margin: '0 auto 12px',
            cursor: 'grab'
          }}
        />

        {/* Header: Branding + Countdown Timer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '14px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: '#FFC70A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(255, 199, 10, 0.35)'
              }}
            >
              <Icon name="car" size={19} color="#000000" />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 800,
                    letterSpacing: '0.03em',
                    color: theme.textPrimary,
                    textTransform: 'uppercase'
                  }}
                >
                  New Ride Request
                </span>
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: '#16A34A',
                    boxShadow: '0 0 0 3px rgba(22, 163, 74, 0.28)',
                    display: 'inline-block'
                  }}
                />
              </div>
              <span style={{ fontSize: '11px', color: theme.textSecondary, fontWeight: 500 }}>
                Auto-hide in {countdown}s
              </span>
            </div>
          </div>

          {/* Countdown Pill & Close Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 850,
                padding: '4px 10px',
                borderRadius: '999px',
                background: countdown <= 6 ? 'rgba(220, 38, 38, 0.15)' : theme.fieldBg,
                color: countdown <= 6 ? '#EF4444' : theme.textPrimary,
                border: countdown <= 6 ? '1.5px solid rgba(220, 38, 38, 0.35)' : theme.pillBorder,
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              ⏱️ {countdown}s
            </span>

            <button
              type="button"
              onClick={() => onDecline(trip.id)}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: theme.fieldBg,
                border: theme.pillBorder,
                color: theme.textSecondary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0
              }}
              aria-label="Dismiss Notification"
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        </div>

        {/* Fare & Schedule Details Card */}
        <div
          onClick={() => {
            if (onExpand) onExpand(trip);
          }}
          style={{
            cursor: 'pointer',
            padding: '12px 14px',
            borderRadius: '16px',
            background: theme.fieldBg,
            border: theme.pillBorder,
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <span style={{ fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', color: theme.textSecondary, letterSpacing: '0.04em' }}>
              Fare Amount
            </span>
            <div style={{ fontSize: '26px', fontWeight: 900, color: '#16A34A', letterSpacing: '-0.02em', marginTop: '1px' }}>
              ₹{fare}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11.5px',
                fontWeight: 750,
                padding: '3px 8px',
                borderRadius: '6px',
                background: '#FFC70A',
                color: '#000000'
              }}
            >
              <span>₹{advance} Advance</span>
            </div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: theme.textSecondary, marginTop: '4px' }}>
              ⏰ {time} · {distance} ({duration})
            </div>
          </div>
        </div>

        {/* Route: Locations up to the first comma only */}
        <div
          onClick={() => {
            if (onExpand) onExpand(trip);
          }}
          style={{
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            marginBottom: '16px',
            padding: '0 2px'
          }}
        >
          {/* Pickup */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#16A34A', flexShrink: 0 }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: theme.textSecondary, letterSpacing: '0.04em' }}>
                Pickup
              </span>
              <div style={{ fontSize: '14px', fontWeight: 750, color: theme.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {pickup}
              </div>
            </div>
          </div>

          {/* Destination */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#DC2626', flexShrink: 0 }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: theme.textSecondary, letterSpacing: '0.04em' }}>
                Destination
              </span>
              <div style={{ fontSize: '14px', fontWeight: 750, color: theme.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {drop}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons: Red Decline & Green Accept */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.6fr',
            gap: '10px',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          {/* Decline Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDecline(trip.id);
            }}
            style={{
              height: '48px',
              borderRadius: '14px',
              border: 'none',
              background: '#DC2626',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)'
            }}
          >
            <span>✕ Decline</span>
          </button>

          {/* Accept Button */}
          <button
            type="button"
            disabled={isAccepting}
            onClick={(e) => {
              e.stopPropagation();
              if (isAccepting) return;
              setIsAccepting(true);
              onAccept(trip.id);
            }}
            style={{
              height: '48px',
              borderRadius: '14px',
              border: 'none',
              background: '#16A34A',
              color: '#FFFFFF',
              fontSize: '15px',
              fontWeight: 850,
              cursor: isAccepting ? 'not-allowed' : 'pointer',
              opacity: isAccepting ? 0.75 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 4px 16px rgba(22, 163, 74, 0.45)'
            }}
          >
            <span>✓ {isAccepting ? 'Accepting...' : `Accept ₹${fare}`}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
