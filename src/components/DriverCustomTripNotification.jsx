import React, { useState, useEffect } from 'react';
import Icon from './Icon';
import { cleanLocationName } from '../utils/locationCleaner';
import { playNativeAlertChime, stopActiveTone } from '../services/pushNotificationService';

/**
 * DriverCustomTripNotification:
 * Native-style Heads-Up Push Notification UI specifically for Driver App Trip Requests.
 * 
 * Strict UI Requirements:
 * - Light Mode: Pure White Background (#FFFFFF) with Pure Black Text (#000000)
 * - Dark Mode: Pure Black Background (#000000) with Pure White Text (#FFFFFF)
 * - Shows Pickup & Drop Location, Route Distance & Duration, and Total Fare (₹)
 * - Green Accept Button (#16A34A) and Red Decline Button (#DC2626)
 * - Slides down from top of the screen with Apple-style spring physics
 */
export default function DriverCustomTripNotification({ trip, onAccept, onDecline, onExpand }) {
  const [countdown, setCountdown] = useState(30);
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

  // Audio, Haptic & 30s Countdown Timer
  useEffect(() => {
    setCountdown(30);
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
  const pickup = cleanLocationName(trip.pickup || trip.from) || 'Customer Pickup';
  const drop = cleanLocationName(trip.drop_loc || trip.drop || trip.to) || 'Destination Route';
  const distance = trip.distanceText || trip.distance || '12.4 km';
  const duration = trip.durationText || trip.duration || '28 mins';
  const customerName = trip.rider?.name || 'Customer';

  // Strict Theme Colors:
  // Light: White #FFFFFF background, Black #000000 text
  // Dark: Black #000000 background, White #FFFFFF text
  const theme = {
    bg: isDarkTheme ? '#000000' : '#FFFFFF',
    textPrimary: isDarkTheme ? '#FFFFFF' : '#000000',
    textSecondary: isDarkTheme ? '#A1A1AA' : '#52525B',
    border: isDarkTheme ? '1.5px solid #27272A' : '1.5px solid #E4E4E7',
    fieldBg: isDarkTheme ? '#18181B' : '#F4F4F5',
    pillBorder: isDarkTheme ? '1px solid #27272A' : '1px solid #E4E4E7',
    shadow: isDarkTheme
      ? '0 20px 48px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.1)'
      : '0 20px 48px rgba(0, 0, 0, 0.22), 0 0 0 1px rgba(0, 0, 0, 0.06)'
  };

  return (
    <div
      className="driver-custom-push-banner"
      style={{
        position: 'fixed',
        top: 'max(14px, env(safe-area-inset-top, 14px))',
        left: '12px',
        right: '12px',
        maxWidth: '440px',
        margin: '0 auto',
        zIndex: 100010,
        background: theme.bg,
        border: theme.border,
        borderRadius: '24px',
        padding: '16px 18px',
        boxShadow: theme.shadow,
        boxSizing: 'border-box',
        color: theme.textPrimary,
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        userSelect: 'none'
      }}
    >
      {/* Top Header: App Branding + Pulsing Badge + Countdown Timer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          {/* Ridingo Brand Icon Badge */}
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: '#FFC70A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000000',
              fontWeight: 900,
              boxShadow: '0 2px 6px rgba(255, 199, 10, 0.4)'
            }}
          >
            <Icon name="car" size={17} color="#000000" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 800,
                  letterSpacing: '0.02em',
                  color: theme.textPrimary,
                  textTransform: 'uppercase'
                }}
              >
                Ridingo Dispatch
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
              New Trip Request · Now
            </span>
          </div>
        </div>

        {/* Countdown Pill & Close Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 800,
              padding: '3px 9px',
              borderRadius: '999px',
              background: countdown <= 8 ? 'rgba(220, 38, 38, 0.15)' : theme.fieldBg,
              color: countdown <= 8 ? '#EF4444' : theme.textPrimary,
              border: countdown <= 8 ? '1px solid rgba(220, 38, 38, 0.3)' : theme.pillBorder,
              fontVariantNumeric: 'tabular-nums'
            }}
          >
            {countdown}s
          </span>

          <button
            type="button"
            onClick={() => onDecline(trip.id)}
            style={{
              width: '26px',
              height: '26px',
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
            <Icon name="x" size={13} />
          </button>
        </div>
      </div>

      {/* Main Fare Section */}
      <div
        onClick={() => {
          if (onExpand) onExpand(trip);
        }}
        style={{
          cursor: 'pointer',
          padding: '10px 14px',
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
          <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: theme.textSecondary, letterSpacing: '0.04em' }}>
            Trip Fare
          </span>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#16A34A', letterSpacing: '-0.02em', marginTop: '1px' }}>
            ₹{fare}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span
            style={{
              display: 'inline-block',
              fontSize: '11.5px',
              fontWeight: 750,
              padding: '3px 8px',
              borderRadius: '6px',
              background: '#FFC70A',
              color: '#000000'
            }}
          >
            ₹{advance} Advance Paid
          </span>
          <div style={{ fontSize: '11px', fontWeight: 600, color: theme.textSecondary, marginTop: '3px' }}>
            {distance} · {duration}
          </div>
        </div>
      </div>

      {/* Locations Summary */}
      <div
        onClick={() => {
          if (onExpand) onExpand(trip);
        }}
        style={{
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginBottom: '14px',
          padding: '0 4px'
        }}
      >
        {/* Pickup */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '9px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#16A34A', marginTop: '4px', flexShrink: 0 }} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: '10px', fontWeight: 750, textTransform: 'uppercase', color: theme.textSecondary, letterSpacing: '0.04em' }}>
              Pickup
            </span>
            <div style={{ fontSize: '13.5px', fontWeight: 750, color: theme.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {pickup}
            </div>
          </div>
        </div>

        {/* Drop */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '9px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#DC2626', marginTop: '4px', flexShrink: 0 }} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: '10px', fontWeight: 750, textTransform: 'uppercase', color: theme.textSecondary, letterSpacing: '0.04em' }}>
              Destination
            </span>
            <div style={{ fontSize: '13.5px', fontWeight: 750, color: theme.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {drop}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons: Green Accept (#16A34A) & Red Decline (#DC2626) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.6fr',
          gap: '10px',
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        {/* Red Decline Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDecline(trip.id);
          }}
          style={{
            height: '46px',
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
            boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)',
            transition: 'transform 0.15s ease, opacity 0.15s ease'
          }}
        >
          <span>✕</span>
          <span>Decline</span>
        </button>

        {/* Green Accept Button */}
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
            height: '46px',
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
            boxShadow: '0 4px 16px rgba(22, 163, 74, 0.45)',
            transition: 'transform 0.15s ease, opacity 0.15s ease'
          }}
        >
          <span>✓</span>
          <span>{isAccepting ? 'Accepting...' : `Accept ₹${fare}`}</span>
        </button>
      </div>
    </div>
  );
}
