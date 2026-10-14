import React, { useState, useEffect } from 'react';
import Icon from './Icon';

/**
 * DynamicIslandTripCard.jsx
 * 
 * Apple Dynamic Island & iOS Live Activity style miniature trip card.
 * Floats at the top of the Driver App when a new trip request is active.
 * 
 * Provides:
 * - Ultra-compact live status pill / dynamic banner
 * - Glowing radar pulse indicating incoming live dispatch
 * - Fare, category, advance payment indicator, and pickup snippet
 * - Direct 1-tap "Accept" action
 * - Tap card to expand into full detailed IncomingRideModal
 */
export default function DynamicIslandTripCard({
  trip,
  onAccept,
  onDecline,
  onExpand,
  isMinimized = false
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(45);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!trip) return null;

  const fare = trip.fare || 600;
  const advance = trip.advance || Math.round(fare * 0.3);
  const cat = (trip.cat || trip.category || 'hourly').toUpperCase();
  const pickup = trip.pickup || trip.from || 'Customer Location';

  return (
    <div
      className="dynamic-island-wrapper"
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 10px)',
        left: 0,
        right: 0,
        zIndex: 99999,
        display: 'flex',
        justifyContent: 'center',
        padding: '0 12px',
        pointerEvents: 'none',
        animation: 'islandSlideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      <div
        className="dynamic-island-card"
        onClick={() => {
          if (onExpand) onExpand();
        }}
        style={{
          pointerEvents: 'auto',
          width: '100%',
          maxWidth: '430px',
          background: 'rgba(12, 13, 17, 0.94)',
          backdropFilter: 'blur(30px) saturate(180%)',
          WebkitBackdropFilter: 'blur(30px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          borderRadius: '26px',
          padding: '10px 14px',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.08)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#FFFFFF',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          userSelect: 'none'
        }}
      >
        {/* Radar Pulse / Category Icon */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #FFC70A 0%, #F59E0B 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000000',
              fontWeight: 800,
              boxShadow: '0 4px 12px rgba(255, 199, 10, 0.35)',
              flexShrink: 0
            }}
          >
            <Icon name="car" size={20} color="#000000" />
          </div>
          {/* Animated radar pulsing ring */}
          <span
            style={{
              position: 'absolute',
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              border: '2px solid rgba(255, 199, 10, 0.6)',
              animation: 'radarPing 1.8s cubic-bezier(0, 0, 0.2, 1) infinite',
              pointerEvents: 'none'
            }}
          />
        </div>

        {/* Center: Trip Information */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
            <span
              style={{
                background: 'rgba(255, 199, 10, 0.18)',
                color: '#FFC70A',
                fontSize: '10.5px',
                fontWeight: 800,
                letterSpacing: '0.4px',
                padding: '2px 7px',
                borderRadius: '6px'
              }}
            >
              {cat}
            </span>
            <span style={{ fontSize: '15px', fontWeight: 800, color: '#10B981' }}>
              ₹{fare}
            </span>
            <span
              style={{
                fontSize: '11px',
                color: 'rgba(255, 255, 255, 0.55)',
                marginLeft: 'auto',
                fontWeight: 650
              }}
            >
              ⏱ {secondsLeft}s
            </span>
          </div>

          <div
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.92)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span style={{ color: '#FFC70A', fontSize: '11px' }}>📍</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{pickup}</span>
          </div>
        </div>

        {/* Quick Action Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onAccept) onAccept(trip.id);
            }}
            style={{
              background: '#16A34A',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '999px',
              padding: '8px 14px',
              fontSize: '12.5px',
              fontWeight: 750,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 4px 12px rgba(22, 163, 74, 0.35)',
              transition: 'transform 0.15s ease'
            }}
          >
            Accept
          </button>
        </div>
      </div>

      <style>{`
        @keyframes islandSlideDown {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.92);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes radarPing {
          0% {
            transform: scale(0.85);
            opacity: 0.9;
          }
          100% {
            transform: scale(1.4);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
