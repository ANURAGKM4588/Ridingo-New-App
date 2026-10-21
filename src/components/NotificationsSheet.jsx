import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import Icon from './Icon';

function formatTimeAgo(ts) {
  if (!ts) return 'Just now';
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
 * Offer Details Modal - Minimal & Clean
 */
function OfferDetailsModal({ offer, onClose, onClaim }) {
  if (!offer) return null;

  const defaultTerms = [
    'Offer valid on all Driver bookings booked via the Ridingo mobile app.',
    'Cashback or discount is credited to your wallet upon trip completion.',
    'Applicable for both Manual and Automatic personal vehicles.',
    'Cannot be combined with other promotional coupons.'
  ];

  const terms = offer.terms || defaultTerms;
  const promoCode = offer.code || 'RIDE20';
  const discountLabel = offer.discount || 'Special Offer';

  return (
    <div
      className="layer on"
      style={{
        zIndex: 10020,
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
          maxWidth: '440px',
          background: 'var(--card, #FFFFFF)',
          borderTopLeftRadius: '22px',
          borderTopRightRadius: '22px',
          padding: '16px 18px max(20px, calc(env(safe-area-inset-bottom, 0px) + 16px))',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.22)',
          position: 'relative',
          boxSizing: 'border-box'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ width: '36px', height: '4px', borderRadius: '999px', background: '#E2E8F0', margin: '0 auto 14px' }} />

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: '#FEF3C7',
                color: '#D97706',
                display: 'grid',
                placeItems: 'center'
              }}
            >
              <Icon name="star" size={17} />
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 750, color: 'var(--ink, #0F172A)' }}>
                Offer Details
              </h3>
              <span style={{ fontSize: '11px', color: '#64748B' }}>
                Promotion Terms
              </span>
            </div>
          </div>
          <button
            type="button"
            className="iconbtn"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0F172A',
              cursor: 'pointer'
            }}
          >
            <Icon name="x" size={15} />
          </button>
        </div>

        {/* Promo Graphic Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
            color: '#FFFFFF',
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '14px',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          <div style={{ display: 'inline-block', background: 'rgba(250, 204, 21, 0.2)', border: '1px solid #FACC15', color: '#FACC15', borderRadius: '999px', padding: '2px 8px', fontSize: '10.5px', fontWeight: 750, letterSpacing: '0.03em', marginBottom: '6px' }}>
            {discountLabel}
          </div>
          <h4 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 750, color: '#FFFFFF' }}>
            {offer.title || 'Special Promotion'}
          </h4>
          <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#94A3B8', lineHeight: 1.4 }}>
            {offer.body}
          </p>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(255, 255, 255, 0.07)',
              border: '1px dashed #FACC15',
              padding: '4px 10px',
              borderRadius: '10px'
            }}
          >
            <span style={{ fontSize: '11px', color: '#E2E8F0', fontWeight: 500 }}>Code:</span>
            <b style={{ fontSize: '13px', color: '#FACC15', fontFamily: 'monospace', letterSpacing: '0.06em' }}>
              {promoCode}
            </b>
          </div>
        </div>

        {/* Terms list */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
            Terms & Conditions
          </div>
          <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11.5px', color: '#64748B', lineHeight: 1.5 }}>
            {terms.map((t, idx) => (
              <li key={idx} style={{ marginBottom: '3px' }}>{t}</li>
            ))}
          </ul>
        </div>

        {/* Claim Button */}
        <button
          type="button"
          className="btn primary"
          style={{
            width: '100%',
            height: '42px',
            borderRadius: '12px',
            fontWeight: 700,
            fontSize: '13px',
            background: 'var(--solid, #000000)',
            color: '#FFFFFF',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
          onClick={() => onClaim(offer)}
        >
          <span>Claim & Book Now</span>
          <Icon name="chevron-right" size={15} />
        </button>
      </div>
    </div>
  );
}

/**
 * Modern Minimalist Expandable Notification Card
 */
function MinimalNotifCard({
  note,
  index = 0,
  isExpanded,
  onToggleExpand,
  onClaimOffer,
  onViewOfferDetails,
  onDismiss,
  isClearingAll = false
}) {
  const [copied, setCopied] = useState(false);
  const isRead = !!note.read;
  const isOffer = note.isOffer ||
    note.category === 'promo' ||
    note.category === 'offer' ||
    (note.title && /offer|cashback|pass|discount|promo/i.test(note.title));

  const isGift = note.icon === 'gift' || note.icon === 'star';
  const isCar = note.icon === 'car';
  const isSuccess = note.icon === 'check' || (note.title && /completed|success|credited|accepted/i.test(note.title));

  let badgeBg = '#F1F5F9';
  let badgeColor = '#64748B';
  let badgeIcon = note.icon || 'bell';

  if (isOffer) {
    badgeBg = '#FEF3C7';
    badgeColor = '#D97706';
    badgeIcon = 'star';
  } else if (isGift || isSuccess) {
    badgeBg = '#DCFCE7';
    badgeColor = '#166534';
    badgeIcon = isGift ? 'gift' : 'check';
  } else if (isCar) {
    badgeBg = '#E0F2FE';
    badgeColor = '#0369A1';
    badgeIcon = 'car';
  }

  const handleCopyCode = (e, code) => {
    e.stopPropagation();
    if (!code) return;
    try {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{
        opacity: isClearingAll ? 0 : 1,
        x: isClearingAll ? -24 : 0,
        y: 0,
        transition: {
          duration: isClearingAll ? 0.22 : 0.2,
          delay: isClearingAll ? index * 0.03 : 0,
          ease: [0.2, 0, 0, 1]
        }
      }}
      exit={{
        opacity: 0,
        x: -24,
        transition: { duration: 0.18, ease: 'easeIn' }
      }}
      onClick={() => onToggleExpand(note.id)}
      style={{
        borderRadius: '14px',
        padding: '12px 14px',
        marginBottom: '8px',
        cursor: 'pointer',
        background: isRead ? '#F8FAFC' : '#FFFFFF',
        border: isRead ? '1px solid #F1F5F9' : '1px solid #E2E8F0',
        boxShadow: isRead ? 'none' : '0 1px 3px rgba(15, 23, 42, 0.03)',
        transition: 'background 0.18s ease, border-color 0.18s ease',
        position: 'relative'
      }}
    >
      {/* Top Header Row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '11px' }}>
        {/* 34x34 Circular Badge */}
        <span
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: isRead ? '#F1F5F9' : badgeBg,
            color: isRead ? '#94A3B8' : badgeColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginTop: '1px'
          }}
        >
          <Icon name={badgeIcon} size={16} />
        </span>

        {/* Content Area */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
              {!isRead && (
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#059669',
                    flexShrink: 0
                  }}
                  title="Unread"
                />
              )}
              <span
                style={{
                  fontSize: '13.5px',
                  fontWeight: isRead ? 600 : 700,
                  color: isRead ? '#334155' : '#0F172A',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.25,
                  letterSpacing: '-0.01em'
                }}
              >
                {note.title}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              <span style={{ fontSize: '10.5px', color: '#94A3B8', fontWeight: 500, whiteSpace: 'nowrap' }}>
                {formatTimeAgo(note.ts)}
              </span>
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.18, ease: 'easeInOut' }}
                style={{ display: 'flex', alignItems: 'center', color: '#94A3B8' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </motion.div>
            </div>
          </div>

          {/* Collapsed single-line preview */}
          {!isExpanded ? (
            <p
              style={{
                margin: '3px 0 0',
                fontSize: '12px',
                color: isRead ? '#94A3B8' : '#64748B',
                lineHeight: 1.35,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {note.body}
            </p>
          ) : null}

          {/* Smooth Expanding Body */}
          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                style={{ overflow: 'hidden' }}
              >
                <p
                  style={{
                    margin: '6px 0 0',
                    fontSize: '12.5px',
                    color: '#475569',
                    lineHeight: 1.45
                  }}
                >
                  {note.body}
                </p>

                {/* Offer Action Buttons - Small, minimal, properly aligned */}
                {isOffer && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '7px',
                      marginTop: '10px'
                    }}
                  >
                    <button
                      type="button"
                      style={{
                        height: '28px',
                        padding: '0 11px',
                        borderRadius: '8px',
                        fontSize: '11.5px',
                        fontWeight: 650,
                        background: '#0F172A',
                        color: '#FFFFFF',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'opacity 0.15s ease'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onClaimOffer(note);
                      }}
                    >
                      <span>Claim Now</span>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14" />
                        <path d="m12 5 7 7-7 7" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      style={{
                        height: '28px',
                        padding: '0 10px',
                        borderRadius: '8px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        background: '#F1F5F9',
                        color: '#475569',
                        border: '1px solid #E2E8F0',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewOfferDetails(note);
                      }}
                    >
                      Details
                    </button>

                    {note.offerCode && (
                      <button
                        type="button"
                        style={{
                          height: '28px',
                          padding: '0 8px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: 650,
                          background: copied ? '#DCFCE7' : '#FEF3C7',
                          color: copied ? '#166534' : '#B45309',
                          border: '1px dashed currentColor',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        onClick={(e) => handleCopyCode(e, note.offerCode)}
                        title="Click to copy code"
                      >
                        <span>{copied ? 'Copied!' : note.offerCode}</span>
                        {!copied && <Icon name="copy" size={11} />}
                      </button>
                    )}
                  </div>
                )}

                {/* Dismiss single notification button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: isOffer ? '8px' : '6px' }}>
                  <button
                    type="button"
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '11px',
                      color: '#94A3B8',
                      cursor: 'pointer',
                      padding: '2px 4px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'color 0.15s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDismiss(note.id);
                    }}
                  >
                    <Icon name="trash" size={11} />
                    <span>Dismiss</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

export default function NotificationsSheet() {
  const {
    notifsOpen,
    setNotifsOpen,
    unotes,
    markNotifRead,
    deleteNotif,
    clearAllNotifs,
    addToast,
    setBookingCategory,
    setBookingOpen
  } = useApp();

  const [expandedId, setExpandedId] = useState(null);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const unreadCount = useMemo(() => (unotes ? unotes.filter(n => !n.read).length : 0), [unotes]);

  if (!notifsOpen) return null;

  const handleClose = () => {
    setNotifsOpen(false);
  };

  const handleToggleExpand = (id) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      markNotifRead(id);
    }
  };

  const handleDismissSingle = (id) => {
    if (expandedId === id) setExpandedId(null);
    deleteNotif(id);
  };

  // Light, smooth clearing animation:
  const handleClearAll = () => {
    if (!unotes || unotes.length === 0 || isClearingAll) return;
    setIsClearingAll(true);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(15); } catch (_) {}
    }

    setTimeout(() => {
      clearAllNotifs();
      setExpandedId(null);
      setIsClearingAll(false);
    }, 240);
  };

  const handleClaimOffer = (note) => {
    const offerCat = note.category === 'airport' ? 'airport' : note.category === 'outstation' ? 'outstation' : 'hourly';
    setBookingCategory(offerCat);
    setNotifsOpen(false);
    setBookingOpen(true);
    addToast(`Offer activated! Book your ${offerCat} driver now.`, 'check');
  };

  const handleViewOfferDetails = (note) => {
    setSelectedOffer({
      title: note.title,
      body: note.body,
      code: note.offerCode || 'RIDE20',
      discount: note.offerDiscount || '20% Cashback',
      category: note.category || 'hourly',
      terms: note.terms
    });
  };

  const hasNotes = unotes && unotes.length > 0;
  const showList = hasNotes && !isClearingAll;

  return (
    <>
      <div className="layer on" id="u-notifs-layer" style={{ zIndex: 90 }}>
        <div className="scrim" onClick={handleClose} />

        <div
          className="sheet"
          role="dialog"
          aria-modal="true"
          style={{
            maxWidth: '440px',
            margin: '0 auto',
            borderTopLeftRadius: '22px',
            borderTopRightRadius: '22px',
            overflow: 'hidden',
            background: 'var(--card, #FFFFFF)'
          }}
        >
          {/* Minimal Modern Header */}
          <div
            className="sheet-sticky-top"
            style={{
              padding: '12px 18px 12px',
              borderBottom: '1px solid #F1F5F9',
              background: '#FFFFFF'
            }}
          >
            {/* Grab Handle */}
            <div
              style={{
                width: '36px',
                height: '4px',
                borderRadius: '999px',
                background: '#E2E8F0',
                margin: '0 auto 10px',
                opacity: 0.9
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '17px',
                    fontWeight: 750,
                    color: '#0F172A',
                    letterSpacing: '-0.02em'
                  }}
                >
                  Notifications
                </h3>
                {hasNotes && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: unreadCount > 0 ? '#059669' : '#64748B',
                      background: unreadCount > 0 ? '#DCFCE7' : '#F1F5F9',
                      padding: '1.5px 7px',
                      borderRadius: '999px',
                      letterSpacing: '0.01em'
                    }}
                  >
                    {unreadCount > 0 ? `${unreadCount} new` : unotes.length}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {hasNotes && !isClearingAll && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '4px 6px',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#64748B',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      transition: 'color 0.15s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#64748B')}
                  >
                    Clear all
                  </button>
                )}

                <button
                  type="button"
                  className="iconbtn"
                  onClick={handleClose}
                  aria-label="Close"
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: '#F8FAFC',
                    border: '1px solid #F1F5F9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0F172A',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease'
                  }}
                >
                  <Icon name="x" size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* Body with Light Animation */}
          <div
            className="sheet-scroll-body"
            style={{
              padding: '12px 16px 24px',
              minHeight: '260px',
              maxHeight: '75vh',
              position: 'relative'
            }}
          >
            <AnimatePresence mode="wait">
              {showList ? (
                <motion.div
                  key="notifications-list"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 1 }}
                  exit={{
                    opacity: 0,
                    transition: { duration: 0.16, ease: 'easeOut' }
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  {unotes.map((n, idx) => (
                    <MinimalNotifCard
                      key={n.id}
                      note={n}
                      index={idx}
                      isExpanded={expandedId === n.id}
                      onToggleExpand={handleToggleExpand}
                      onClaimOffer={handleClaimOffer}
                      onViewOfferDetails={handleViewOfferDetails}
                      onDismiss={handleDismissSingle}
                      isClearingAll={isClearingAll}
                    />
                  ))}
                </motion.div>
              ) : (
                /* Light & Smooth Empty State */
                <motion.div
                  key="notifications-empty"
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: { duration: 0.24, ease: [0.2, 0, 0, 1] }
                  }}
                  exit={{ opacity: 0 }}
                  style={{
                    padding: '48px 16px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <motion.div
                    animate={{
                      y: [0, -3, 0]
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: 'easeInOut'
                    }}
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      color: '#94A3B8',
                      display: 'grid',
                      placeItems: 'center',
                      marginBottom: '12px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                    }}
                  >
                    <Icon name="bell" size={20} />
                  </motion.div>
                  <h4
                    style={{
                      margin: '0 0 4px',
                      fontSize: '14.5px',
                      fontWeight: 700,
                      color: 'var(--ink, #0F172A)',
                      letterSpacing: '-0.01em'
                    }}
                  >
                    No notifications yet
                  </h4>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '12px',
                      color: '#64748B',
                      lineHeight: 1.45,
                      maxWidth: '240px'
                    }}
                  >
                    Trip updates, driver alerts, and exclusive offers will appear right here.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Offer Details Modal */}
      {selectedOffer && (
        <OfferDetailsModal
          offer={selectedOffer}
          onClose={() => setSelectedOffer(null)}
          onClaim={(offer) => {
            setSelectedOffer(null);
            handleClaimOffer(offer);
          }}
        />
      )}
    </>
  );
}
