import React from 'react';
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

export default function NotificationsSheet() {
  const { notifsOpen, setNotifsOpen, unotes, markAllNotifsRead } = useApp();

  if (!notifsOpen) return null;

  const handleClose = () => {
    setNotifsOpen(false);
  };

  const unreadCount = (unotes || []).filter(n => !n.read).length;

  return (
    <div className="layer on" id="u-notifs-layer" style={{ zIndex: 90 }}>
      <div className="scrim" onClick={handleClose} />

      <div className="sheet" role="dialog" aria-modal="true">
        {/* Sticky Header: Small bar (grab) + Title + Close icon (Same as Booking Details Page) */}
        <div className="sheet-sticky-top">
          <div className="grab" />
          <div className="sheet-h">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              <h3 style={{ margin: 0 }}>Notifications</h3>
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

        {/* Scrollable Body (Same smooth scroll as Booking Details) */}
        <div className="sheet-scroll-body">
          {unotes && unotes.length > 0 ? (
            <>
              {/* Header Action Row */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                  padding: '0 2px'
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
                  Recent Updates
                </span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllNotifsRead}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--muted)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* Notification Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {unotes.map((n) => {
                  const isGift = n.icon === 'gift';
                  const isCar = n.icon === 'car';
                  return (
                    <div
                      key={n.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        padding: '14px',
                        borderRadius: '18px',
                        background: 'var(--card)',
                        border: '1px solid var(--line)',
                        position: 'relative'
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
                        <Icon name={n.icon || 'bell'} size={18} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                          <b style={{ fontSize: '14.5px', color: 'var(--ink)' }}>{n.title}</b>
                          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{formatTimeAgo(n.ts)}</span>
                        </div>
                        <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--ink)', opacity: 0.85, lineHeight: 1.35 }}>
                          {n.body}
                        </p>
                      </div>
                      {!n.read && (
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: 'var(--yellow)',
                            flexShrink: 0,
                            marginTop: '6px'
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="empty" style={{ padding: '36px 16px', textAlign: 'center' }}>
              <span
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'var(--field)',
                  color: 'var(--muted)',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto 12px'
                }}
              >
                <Icon name="bell" size={22} />
              </span>
              <h4 style={{ margin: '0 0 4px', fontSize: '16px' }}>No notifications yet</h4>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
                You will receive live trip updates, cashback rewards, and driver alerts right here.
              </p>
            </div>
          )}

          {/* Bottom Done Button */}
          <button
            className="btn solid block"
            style={{
              marginTop: '16px',
              borderRadius: '20px',
              padding: '14px',
              fontWeight: 700,
              fontSize: '15px',
              cursor: 'pointer'
            }}
            onClick={handleClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
