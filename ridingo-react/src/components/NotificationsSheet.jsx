import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import Icon from './Icon';

function formatTimeAgo(ts) {
  const diffSec = Math.floor((Date.now() - ts) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

/**
 * Swipeable Notification Tile Component
 * - Right swipe (drag right > 70px): Mark as read with yellow icon & smooth animation
 * - Left swipe (drag left < -70px): Delete notification with red icon & smooth slide-out
 * - Auto-demo hint: For first-time users, the first notification card smoothly peeks right (Yellow Read),
 *   then across to left (Red Delete), and glides back to center automatically.
 */
function SwipeableNotifItem({ note, onMarkRead, onDelete, isDemoHint, onDemoHintComplete }) {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReadFlash, setIsReadFlash] = useState(false);

  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const SWIPE_THRESHOLD = 70; // px threshold to trigger action

  // Choreographed automatic demo animation for first-time users
  useEffect(() => {
    if (!isDemoHint) return;

    let t1, t2, t3, t4;
    // Delay 380ms after bottom sheet finishes sliding into view
    t1 = setTimeout(() => {
      // Step 1: Smoothly slide Right -> reveals Yellow "Mark Read" with soft bounce
      setOffsetX(62);

      t2 = setTimeout(() => {
        // Step 2: Smoothly slide across to Left -> reveals Red "Delete"
        setOffsetX(-62);

        t3 = setTimeout(() => {
          // Step 3: Return smoothly to resting center position
          setOffsetX(0);

          t4 = setTimeout(() => {
            if (onDemoHintComplete) onDemoHintComplete();
          }, 400);
        }, 550);
      }, 550);
    }, 380);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [isDemoHint]);

  // --- Touch gesture handlers ---
  const handleTouchStart = (e) => {
    if (isDemoHint && onDemoHintComplete) onDemoHintComplete();
    setIsDragging(true);
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const clientX = e.touches[0].clientX;
    const diff = clientX - startXRef.current;
    // Dampen drag resistance past threshold
    const dampened = Math.sign(diff) * Math.min(Math.abs(diff), 130);
    setOffsetX(dampened);
    currentXRef.current = clientX;
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (offsetX > SWIPE_THRESHOLD) {
      triggerMarkRead();
    } else if (offsetX < -SWIPE_THRESHOLD) {
      triggerDelete();
    } else {
      setOffsetX(0);
    }
  };

  // --- Mouse drag handlers for desktop / testing ---
  const handleMouseDown = (e) => {
    if (isDemoHint && onDemoHintComplete) onDemoHintComplete();
    setIsDragging(true);
    startXRef.current = e.clientX;
    currentXRef.current = e.clientX;
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const diff = e.clientX - startXRef.current;
    const dampened = Math.sign(diff) * Math.min(Math.abs(diff), 130);
    setOffsetX(dampened);
    currentXRef.current = e.clientX;
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (offsetX > SWIPE_THRESHOLD) {
      triggerMarkRead();
    } else if (offsetX < -SWIPE_THRESHOLD) {
      triggerDelete();
    } else {
      setOffsetX(0);
    }
  };

  const triggerMarkRead = () => {
    setOffsetX(80);
    setIsReadFlash(true);
    setTimeout(() => {
      onMarkRead(note.id);
      setOffsetX(0);
      setTimeout(() => setIsReadFlash(false), 300);
    }, 240);
  };

  const triggerDelete = () => {
    setOffsetX(-320);
    setIsDeleting(true);
    setTimeout(() => {
      onDelete(note.id);
    }, 280);
  };

  const isGift = note.icon === 'gift';
  const isCar = note.icon === 'car';

  // Calculate underlay opacity
  const rightSwipeRatio = Math.max(0, Math.min(offsetX / SWIPE_THRESHOLD, 1));
  const leftSwipeRatio = Math.max(0, Math.min(Math.abs(offsetX) / SWIPE_THRESHOLD, 1));

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: '18px',
        overflow: 'hidden',
        userSelect: 'none',
        transition: isDeleting
          ? 'max-height 0.28s ease, margin 0.28s ease, opacity 0.24s ease'
          : 'none',
        maxHeight: isDeleting ? '0px' : '180px',
        marginBottom: isDeleting ? '0px' : '8px',
        opacity: isDeleting ? 0 : 1
      }}
      onMouseLeave={() => {
        if (isDragging) {
          setIsDragging(false);
          setOffsetX(0);
        }
      }}
    >
      {/* 1. LEFT UNDERLAY (Visible when swiping RIGHT: Mark As Read with Yellow Theme) */}
      <div
        onClick={triggerMarkRead}
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: '50%',
          background: 'linear-gradient(90deg, #FACC15 0%, #EAB308 100%)',
          color: '#111827',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: '20px',
          gap: '8px',
          cursor: 'pointer',
          opacity: offsetX > 0 ? Math.min(rightSwipeRatio * 1.25, 1) : 0,
          transform: `scale(${0.85 + rightSwipeRatio * 0.15})`,
          transformOrigin: 'left center',
          transition: isDragging ? 'none' : 'opacity 0.24s ease, transform 0.24s ease'
        }}
      >
        <span
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: '#111827',
            color: '#FACC15',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}
        >
          <Icon name="checkCircle" size={17} />
        </span>
        <b style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.02em', color: '#111827' }}>
          Mark Read
        </b>
      </div>

      {/* 2. RIGHT UNDERLAY (Visible when swiping LEFT: Delete with Red Theme) */}
      <div
        onClick={triggerDelete}
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 0,
          width: '50%',
          background: 'linear-gradient(90deg, #EF4444 0%, #DC2626 100%)',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingRight: '20px',
          gap: '8px',
          cursor: 'pointer',
          opacity: offsetX < 0 ? Math.min(leftSwipeRatio * 1.25, 1) : 0,
          transform: `scale(${0.85 + leftSwipeRatio * 0.15})`,
          transformOrigin: 'right center',
          transition: isDragging ? 'none' : 'opacity 0.24s ease, transform 0.24s ease'
        }}
      >
        <b style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.02em', color: '#FFFFFF' }}>
          Delete
        </b>
        <span
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: '#FFFFFF',
            color: '#DC2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.18)'
          }}
        >
          <Icon name="trash" size={16} />
        </span>
      </div>

      {/* 3. FOREGROUND NOTIFICATION CARD */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          padding: '14px',
          borderRadius: '18px',
          background: isReadFlash ? 'rgba(250, 204, 21, 0.12)' : 'var(--card)',
          border: isReadFlash ? '1.5px solid var(--yellow)' : '1px solid var(--line)',
          position: 'relative',
          transform: `translateX(${offsetX}px)`,
          transition: isDragging
            ? 'none'
            : 'transform 0.42s cubic-bezier(0.2, 0.9, 0.3, 1), background 0.25s ease, border-color 0.25s ease',
          boxShadow: Math.abs(offsetX) > 5 ? '0 8px 24px rgba(0, 0, 0, 0.12)' : 'none',
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
      >
        <span
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '12px',
            background: isGift
              ? 'rgba(52, 199, 89, 0.15)'
              : isCar
              ? 'var(--yellow-soft)'
              : 'var(--field)',
            color: isGift
              ? '#2E7D32'
              : isCar
              ? 'var(--on-yellow)'
              : 'var(--ink)',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0
          }}
        >
          <Icon name={note.icon || 'bell'} size={18} />
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
            <b style={{ fontSize: '14px', color: 'var(--ink)', fontWeight: note.read ? 600 : 750 }}>
              {note.title}
            </b>
            <span style={{ fontSize: '11px', color: 'var(--muted)', flexShrink: 0, marginLeft: '6px' }}>
              {formatTimeAgo(note.ts)}
            </span>
          </div>
          <p
            style={{
              margin: '2px 0 0',
              fontSize: '12.8px',
              color: 'var(--ink)',
              opacity: note.read ? 0.65 : 0.88,
              lineHeight: 1.35
            }}
          >
            {note.body}
          </p>
        </div>

        {/* Unread Indicator Badge */}
        {!note.read ? (
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--yellow)',
              flexShrink: 0,
              marginTop: '6px',
              boxShadow: '0 0 0 3px rgba(250, 204, 21, 0.22)'
            }}
            title="Unread"
          />
        ) : (
          <span
            style={{
              color: '#16A34A',
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
              marginTop: '4px',
              opacity: 0.7
            }}
            title="Read"
          >
            <Icon name="check" size={14} />
          </span>
        )}
      </div>
    </div>
  );
}

export default function NotificationsSheet() {
  const {
    notifsOpen,
    setNotifsOpen,
    unotes,
    markAllNotifsRead,
    markNotifRead,
    deleteNotif,
    clearAllNotifs,
    addToast
  } = useApp();

  // Check if first-time user for swipe demo hint animation
  const [shouldPlayDemoHint, setShouldPlayDemoHint] = useState(() => {
    try {
      return !localStorage.getItem('ridingo_notif_swipe_hint_seen');
    } catch (e) {
      return false;
    }
  });

  const handleDemoHintComplete = () => {
    try {
      localStorage.setItem('ridingo_notif_swipe_hint_seen', 'true');
    } catch (e) {}
    setShouldPlayDemoHint(false);
  };

  if (!notifsOpen) return null;

  const handleClose = () => {
    setNotifsOpen(false);
  };

  const handleClearAll = () => {
    if (!unotes || unotes.length === 0) {
      handleClose();
      return;
    }
    clearAllNotifs();
    addToast('All notifications cleared', 'info');
  };

  const handleItemMarkRead = (id) => {
    markNotifRead(id);
    addToast('Marked as read', 'check');
  };

  const handleItemDelete = (id) => {
    deleteNotif(id);
    addToast('Notification deleted', 'info');
  };

  const unreadCount = (unotes || []).filter(n => !n.read).length;

  return (
    <div className="layer on" id="u-notifs-layer" style={{ zIndex: 90 }}>
      <div className="scrim" onClick={handleClose} />

      <div className="sheet" role="dialog" aria-modal="true">
        {/* Sticky Header: Small bar (grab) + Title + Close icon */}
        <div className="sheet-sticky-top">
          <div className="grab" />
          <div className="sheet-h">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Notifications</h3>
              {unreadCount > 0 && (
                <span
                  style={{
                    background: 'var(--yellow)',
                    color: 'var(--on-yellow)',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '10px'
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>
            <button className="iconbtn" onClick={handleClose} aria-label="Close">
              <Icon name="x" size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="sheet-scroll-body">
          {unotes && unotes.length > 0 ? (
            <>
              {/* Header Action Row */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                  padding: '0 2px'
                }}
              >
                <span style={{ fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
                  Recent Updates ({unotes.length})
                </span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      markAllNotifsRead();
                      addToast('All notifications marked as read', 'check');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--ink)',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* Swipeable Notification Cards */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {unotes.map((n, idx) => (
                  <SwipeableNotifItem
                    key={n.id}
                    note={n}
                    onMarkRead={handleItemMarkRead}
                    onDelete={handleItemDelete}
                    isDemoHint={idx === 0 && shouldPlayDemoHint}
                    onDemoHintComplete={handleDemoHintComplete}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="empty" style={{ padding: '40px 16px', textAlign: 'center' }}>
              <span
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: 'var(--field)',
                  color: 'var(--muted)',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto 12px'
                }}
              >
                <Icon name="bell" size={24} />
              </span>
              <h4 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>
                No notifications
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', lineHeight: 1.4 }}>
                All clear! Live trip arrivals, cashback rewards, and driver alerts will appear here.
              </p>
            </div>
          )}

          {/* Bottom Button: Changed from "Done" to "Clear All" */}
          {unotes && unotes.length > 0 ? (
            <button
              type="button"
              className="btn"
              style={{
                width: '100%',
                height: '50px',
                borderRadius: '16px',
                marginTop: '16px',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#EF4444',
                border: '1.5px solid rgba(239, 68, 68, 0.25)',
                fontWeight: 700,
                fontSize: '14.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
              onClick={handleClearAll}
            >
              <Icon name="trash" size={17} />
              <span>Clear All Notifications ({unotes.length})</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn solid block"
              style={{
                marginTop: '16px',
                borderRadius: '16px',
                height: '48px',
                fontWeight: 700,
                fontSize: '15px',
                cursor: 'pointer'
              }}
              onClick={handleClose}
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
