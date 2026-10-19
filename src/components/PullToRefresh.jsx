import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * PullToRefresh
 * Scroll-linked pull-to-refresh mechanism designed to work with fixed header bars.
 * Features:
 * - Dynamic loading animation linked directly to scroll progress (0% to 100% fill)
 * - The logo and notification header remain securely fixed
 * - Circular loader emerges beneath the fixed bar and expands with scroll depth
 * - Haptic feedback pulse upon reaching activation threshold
 * - Seamless dual-phase spinner during reload
 */
export default function PullToRefresh({
  onRefresh,
  children,
  scrollContainerId = 'u-content',
  headerOffset = 54, // Positioned right beneath the fixed header
  pullThreshold = 65,
  maxPull = 92,
  disabled = false
}) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasCrossedThreshold, setHasCrossedThreshold] = useState(false);

  const startYRef = useRef(0);
  const isPullingRef = useRef(false);
  const hapticTriggeredRef = useRef(false);

  const getScrollContainer = useCallback(() => {
    if (scrollContainerId) {
      const el = document.getElementById(scrollContainerId);
      if (el) return el;
    }
    return document.documentElement;
  }, [scrollContainerId]);

  const handleTouchStart = (e) => {
    if (disabled || isRefreshing) return;
    const container = getScrollContainer();
    if (container && container.scrollTop <= 2) {
      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
      hapticTriggeredRef.current = false;
    } else {
      isPullingRef.current = false;
    }
  };

  const handleTouchMove = (e) => {
    if (!isPullingRef.current || isRefreshing || disabled) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;

    const container = getScrollContainer();
    if (container && container.scrollTop > 2) {
      isPullingRef.current = false;
      setPullDistance(0);
      return;
    }

    if (diff > 0) {
      // Natural logarithmic rubber-banding resistance
      const damped = Math.min(maxPull, Math.pow(diff * 0.72, 0.9));
      setPullDistance(damped);

      if (damped >= pullThreshold) {
        setHasCrossedThreshold(true);
        if (!hapticTriggeredRef.current) {
          hapticTriggeredRef.current = true;
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate(12); } catch (_) {}
          }
        }
      } else {
        setHasCrossedThreshold(false);
      }
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (!isPullingRef.current || isRefreshing || disabled) return;
    isPullingRef.current = false;

    if (pullDistance >= pullThreshold && onRefresh) {
      setIsRefreshing(true);
      setPullDistance(50); // Hold indicator while refreshing

      try {
        await Promise.resolve(onRefresh());
      } catch (err) {
        console.warn('[PullToRefresh] onRefresh error:', err);
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
          setHasCrossedThreshold(false);
        }, 350);
      }
    } else {
      setPullDistance(0);
      setHasCrossedThreshold(false);
    }
  };

  // Scroll-linked progress ratio (0.0 to 1.0)
  const progress = Math.min(1, Math.max(0, pullDistance / pullThreshold));
  const circumference = 56.5; // 2 * PI * 9

  return (
    <div
      className="ptr-wrapper"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Scroll-Linked Pull-To-Refresh Modern Indicator */}
      <div
        className="ptr-indicator"
        style={{
          position: 'absolute',
          top: `${headerOffset}px`,
          left: '50%',
          transform: `translate(-50%, ${pullDistance - 36}px) scale(${Math.min(1.05, 0.75 + progress * 0.3)})`,
          zIndex: 75,
          pointerEvents: 'none',
          opacity: pullDistance > 6 ? Math.min(1, progress * 1.3) : 0,
          transition: isPullingRef.current
            ? 'opacity 0.1s linear'
            : 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease'
        }}
      >
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: 'var(--card, #FFFFFF)',
            boxShadow: `0 ${3 + progress * 6}px ${12 + progress * 12}px rgba(0, 0, 0, ${0.12 + progress * 0.08})`,
            border: '1.5px solid var(--line, rgba(0, 0, 0, 0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)'
          }}
        >
          {isRefreshing ? (
            <svg
              width="21"
              height="21"
              viewBox="0 0 24 24"
              style={{
                animation: 'ptrSpin 0.72s linear infinite',
                color: '#FFC70A'
              }}
            >
              {/* Dual-phase spinner */}
              <circle
                cx="12"
                cy="12"
                r="9"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                opacity="0.22"
              />
              <circle
                cx="12"
                cy="12"
                r="9"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.8"
                strokeDasharray="42"
                strokeDashoffset="14"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              style={{
                transform: `rotate(${progress * 360}deg)`,
                transition: isPullingRef.current ? 'none' : 'transform 0.2s linear'
              }}
            >
              {/* Background circular guide */}
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="var(--line, rgba(0,0,0,0.1))"
                strokeWidth="2.4"
                fill="none"
              />
              {/* Dynamic scroll-linked progress arc */}
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke={hasCrossedThreshold ? '#FFC70A' : 'var(--muted, #64748B)'}
                strokeWidth="2.8"
                strokeLinecap="round"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress)}
                style={{
                  transition: 'stroke 0.15s ease'
                }}
              />
              {/* Directional arrowhead */}
              <path
                d="M12 7.5l2 2-2 2"
                stroke={hasCrossedThreshold ? '#FFC70A' : 'var(--muted, #64748B)'}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={progress > 0.2 ? 1 : 0}
              />
            </svg>
          )}
        </div>
      </div>

      {/* Main Content with damped scroll-linked push translation */}
      <div
        className="ptr-content-stage"
        style={{
          flex: 1,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          transform: `translateY(${isRefreshing ? 48 : pullDistance * 0.42}px)`,
          transition: isPullingRef.current ? 'none' : 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {children}
      </div>
    </div>
  );
}
