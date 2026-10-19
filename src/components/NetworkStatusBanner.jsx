import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * NetworkStatusBanner
 * - Red background (#DC2626) with white text: "You are now offline" when disconnected
 * - Green background (#16A34A) with white text: "You are now online" upon reconnection
 * - Fades all interactive functions to be disabled and dimmed when offline
 * - Any tap on a disabled function triggers haptic vibration and animates the offline text banner subtly
 * - Smooth entrance and exit transitions
 */
export default function NetworkStatusBanner() {
  const [animState, setAnimState] = useState(() => {
    return typeof navigator !== 'undefined' && !navigator.onLine ? 'visible' : 'hidden';
  });
  const [status, setStatus] = useState(() => {
    return typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'online';
  });
  const [message, setMessage] = useState(() => {
    return typeof navigator !== 'undefined' && !navigator.onLine ? 'You are now offline' : '';
  });
  const [isNudging, setIsNudging] = useState(false);

  const dismissTimerRef = useRef(null);
  const nudgeTimerRef = useRef(null);
  const initialMountRef = useRef(true);

  // Trigger subtle shake/pulse animation on the offline banner
  const triggerOfflineNudge = useCallback(() => {
    if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
    setIsNudging(true);
    nudgeTimerRef.current = setTimeout(() => {
      setIsNudging(false);
    }, 420);
  }, []);

  const hideBanner = useCallback(() => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    setAnimState('hidden');
  }, []);

  const showBanner = useCallback((newStatus, msg) => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);

    setStatus(newStatus);
    setMessage(msg);
    setAnimState('visible');
  }, []);

  // Update body class for dimming and disabling interactive functions
  useEffect(() => {
    if (status === 'offline' && animState === 'visible') {
      document.body.classList.add('app-offline-mode');
    } else {
      document.body.classList.remove('app-offline-mode');
    }
  }, [status, animState]);

  // Global capture listener: when offline, intercept all taps on disabled functions
  useEffect(() => {
    const isCurrentlyOffline = status === 'offline' && animState === 'visible';
    if (!isCurrentlyOffline) return;

    const handleCaptureClick = (e) => {
      if (e.target.closest('.native-network-banner-frame')) return;

      e.preventDefault();
      e.stopPropagation();

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([22, 35, 20]);
        } catch (_) {}
      }

      triggerOfflineNudge();
    };

    const handleCaptureTouch = (e) => {
      if (e.target.closest('.native-network-banner-frame')) return;

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([22, 35, 20]);
        } catch (_) {}
      }

      triggerOfflineNudge();
    };

    window.addEventListener('click', handleCaptureClick, true);
    window.addEventListener('touchstart', handleCaptureTouch, { capture: true, passive: true });

    return () => {
      window.removeEventListener('click', handleCaptureClick, true);
      window.removeEventListener('touchstart', handleCaptureTouch, { capture: true });
    };
  }, [status, animState, triggerOfflineNudge]);

  useEffect(() => {
    const handleOnline = () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);

      if (!initialMountRef.current) {
        showBanner('online', 'You are now online');

        // Auto-dismiss smoothly after 3 seconds
        dismissTimerRef.current = setTimeout(() => {
          hideBanner();
        }, 3000);
      }
    };

    const handleOffline = () => {
      initialMountRef.current = false;
      showBanner('offline', 'You are now offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Development & automated preview verification test hooks
    if (typeof window !== 'undefined') {
      window.__triggerOfflineBanner = () => showBanner('offline', 'You are now offline');
      window.__triggerOnlineBanner = () => {
        showBanner('online', 'You are now online');
        if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = setTimeout(hideBanner, 3000);
      };
      window.__hideNetworkBanner = hideBanner;
    }

    initialMountRef.current = false;

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
    };
  }, [showBanner, hideBanner]);

  const isOffline = status === 'offline';
  const bgColor = isOffline ? '#DC2626' : '#16A34A';
  const isVisible = animState === 'visible';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`native-network-banner-frame ${isVisible ? 'banner-frame-open' : 'banner-frame-closed'}`}
      style={{
        width: '100%',
        height: isVisible ? 'calc(36px + env(safe-area-inset-top, 0px))' : '0px',
        overflow: 'hidden',
        flexShrink: 0,
        zIndex: 99999,
        visibility: isVisible ? 'visible' : 'hidden',
        transition: isVisible
          ? 'height 0.44s cubic-bezier(0.16, 1, 0.3, 1), visibility 0s linear'
          : 'height 0.38s cubic-bezier(0.32, 0.72, 0, 1), visibility 0s linear 0.38s',
        willChange: 'height'
      }}
    >
      <div
        className="native-network-banner-inner"
        style={{
          width: '100%',
          height: 'calc(36px + env(safe-area-inset-top, 0px))',
          boxSizing: 'border-box',
          background: bgColor,
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: 'max(8px, env(safe-area-inset-top, 0px)) 16px 8px',
          fontSize: '12.5px',
          fontWeight: 600,
          letterSpacing: '-0.012em',
          lineHeight: 1.25,
          boxShadow: isNudging
            ? '0 0 20px rgba(220, 38, 38, 0.65), 0 4px 14px rgba(0, 0, 0, 0.25)'
            : '0 2px 10px rgba(0, 0, 0, 0.12)',
          transform: isVisible ? 'translateY(0)' : 'translateY(-100%)',
          opacity: isVisible ? 1 : 0,
          transition: isVisible
            ? 'transform 0.44s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.32s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.35s ease'
            : 'transform 0.38s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.26s cubic-bezier(0.32, 0.72, 0, 1), background-color 0.35s ease',
          willChange: 'transform, opacity',
          userSelect: 'none'
        }}
      >
        <div
          className={isNudging ? 'offline-banner-subtle-shake' : ''}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          {/* Status Icon */}
          {isOffline ? (
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                flexShrink: 0,
                transform: isNudging ? 'scale(1.15)' : 'scale(1)',
                transition: 'transform 0.2s ease'
              }}
            >
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
              <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
              <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
              <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
              <line x1="12" y1="20" x2="12.01" y2="20" strokeWidth="3" />
            </svg>
          ) : (
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0 }}
            >
              <path d="M5 12.55a11 11 0 0 1 14.08 0" />
              <path d="M1.42 9a16 16 0 0 1 21.16 0" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
              <line x1="12" y1="20" x2="12.01" y2="20" strokeWidth="3" />
            </svg>
          )}

          {/* Banner Text with subtle pulse on nudge */}
          <span
            style={{
              display: 'inline-block',
              transform: isNudging ? 'scale(1.04)' : 'scale(1)',
              transition: 'transform 0.18s ease'
            }}
          >
            {message}
          </span>
        </div>
      </div>
    </div>
  );
}
