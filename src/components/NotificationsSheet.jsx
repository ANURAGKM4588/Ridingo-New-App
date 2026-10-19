import React, { useState, useRef, useEffect } from 'react';
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
 * Offer Details Banner Modal
 * Displays offer criteria, terms and conditions, and a direct claim button.
 */
function OfferDetailsModal({ offer, onClose, onClaim }) {
  if (!offer) return null;

  const defaultTerms = [
    'Offer valid on all Driver bookings booked via the Ridingo mobile app.',
    'Cashback of 20% (up to ₹250) is credited to your Ridingo Wallet immediately upon trip completion.',
    'Applicable for both Manual and Automatic transmission personal vehicles.',
    'Cannot be combined with any other promotional coupons or corporate discounts.',
    'Platform terms and driver service policies apply.'
  ];

  const terms = offer.terms || defaultTerms;
  const promoCode = offer.code || 'RIDE20';
  const discountLabel = offer.discount || '20% Cashback';
  const serviceCat = offer.category || 'hourly';

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
          maxWidth: '460px',
          background: 'var(--card, #FFFFFF)',
          borderTopLeftRadius: '26px',
          borderTopRightRadius: '26px',
          padding: '20px 20px max(24px, calc(env(safe-area-inset-bottom, 0px) + 20px))',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.3)',
          position: 'relative',
          boxSizing: 'border-box',
          animation: 'slideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ width: '40px', height: '4px', borderRadius: '999px', background: 'var(--line, #E2E8F0)', margin: '0 auto 16px' }} />

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '12px',
                background: 'rgba(250, 204, 21, 0.16)',
                color: '#D97706',
                display: 'grid',
                placeItems: 'center'
              }}
            >
              <Icon name="star" size={20} />
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--ink, #0F172A)' }}>
                Offer Details
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--muted, #64748B)' }}>
                Exclusive Driver Promotion
              </span>
            </div>
          </div>
          <button
            type="button"
            className="iconbtn"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'var(--field, #F1F5F9)',
              border: '1px solid var(--line, #E2E8F0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ink, #0F172A)',
              cursor: 'pointer'
            }}
          >
            <Icon name="x" size={17} />
          </button>
        </div>

        {/* Promo Graphic Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
            color: '#FFFFFF',
            borderRadius: '18px',
            padding: '18px 20px',
            marginBottom: '16px',
            position: 'relative',
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <div style={{ display: 'inline-block', background: 'rgba(250, 204, 21, 0.22)', border: '1px solid #FACC15', color: '#FACC15', borderRadius: '999px', padding: '3px 10px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
            {discountLabel}
          </div>
          <h4 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 800, color: '#FFFFFF' }}>
            {offer.title || 'Special Driver Offer'}
          </h4>
          <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#94A3B8', lineHeight: 1.45 }}>
            {offer.body || 'Enjoy professional drivers at exceptional discounts.'}
          </p>

          {/* Coupon Code Pill */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px dashed #FACC15',
              padding: '6px 14px',
              borderRadius: '12px'
            }}
          >
            <span style={{ fontSize: '11.5px', color: '#CBD5E1', fontWeight: 600 }}>Promo Code:</span>
            <b style={{ fontSize: '14px', color: '#FACC15', letterSpacing: '0.05em' }}>{promoCode}</b>
          </div>
        </div>

        {/* Criteria & Terms Section */}
        <div style={{ maxHeight: '230px', overflowY: 'auto', marginBottom: '18px', paddingRight: '4px' }}>
          <h5 style={{ margin: '0 0 8px', fontSize: '12.5px', fontWeight: 800, color: 'var(--ink, #0F172A)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Criteria & Eligibility
          </h5>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
            <div style={{ background: 'var(--field, #F8FAFC)', padding: '10px 12px', borderRadius: '12px', border: '1px solid var(--line, #E2E8F0)' }}>
              <span style={{ fontSize: '11px', color: 'var(--muted, #64748B)', display: 'block' }}>Applicable Service</span>
              <b style={{ fontSize: '12.5px', color: 'var(--ink, #0F172A)', textTransform: 'capitalize' }}>{serviceCat} Driver</b>
            </div>
            <div style={{ background: 'var(--field, #F8FAFC)', padding: '10px 12px', borderRadius: '12px', border: '1px solid var(--line, #E2E8F0)' }}>
              <span style={{ fontSize: '11px', color: 'var(--muted, #64748B)', display: 'block' }}>Min Booking</span>
              <b style={{ fontSize: '12.5px', color: 'var(--ink, #0F172A)' }}>3+ Hours</b>
            </div>
          </div>

          <h5 style={{ margin: '0 0 8px', fontSize: '12.5px', fontWeight: 800, color: 'var(--ink, #0F172A)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Terms & Conditions
          </h5>
          <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--muted, #64748B)', fontSize: '12px', lineHeight: 1.6 }}>
            {terms.map((t, idx) => (
              <li key={idx} style={{ marginBottom: '4px' }}>{t}</li>
            ))}
          </ul>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="btn"
            style={{
              flex: 1,
              height: '46px',
              borderRadius: '14px',
              border: '1.5px solid var(--line, #E2E8F0)',
              background: 'var(--field, #F1F5F9)',
              color: 'var(--ink, #0F172A)',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer'
            }}
            onClick={onClose}
          >
            Close
          </button>
          <button
            type="button"
            className="btn primary"
            style={{
              flex: 1.6,
              height: '46px',
              borderRadius: '14px',
              background: '#000000',
              color: '#FFFFFF',
              fontWeight: 750,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
            onClick={() => onClaim(offer)}
          >
            <span>Claim & Book Now</span>
            <Icon name="chevron-right" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Expandable Notification Card
 * - Main content only (title + time) by default
 * - Tap expands the body content & automatically marks notification as read
 * - When read, unread dot/badge is removed
 * - Unread style: light white theme (#FFFFFF)
 * - Read style: light gray theme (#F1F5F9 / var(--field))
 * - If offer notification: shows "Claim Now" & "View More" action buttons
 */
/**
 * Modern Minimalist Notification Card
 * - 40x40 circular tinted badge with lightweight micro-icon (bg-amber-50, bg-emerald-50, etc.)
 * - Bold title (14px, font-weight: 600, #0F172A)
 * - Single/double-line body text (13px, #64748B)
 * - Right-aligned timestamp (11px, #94A3B8)
 * - Rounded-2xl (16px), subtle 1px border (#F1F5F9), elevation 2 soft ambient shadow, 16px padding
 */
function ExpandableNotifCard({
  note,
  index = 0,
  isExpanded,
  onToggleExpand,
  onClaimOffer,
  onViewOfferDetails,
  isClearingAll = false
}) {
  const isRead = !!note.read;
  const isOffer = note.isOffer ||
    note.category === 'promo' ||
    note.category === 'offer' ||
    (note.title && /offer|cashback|pass|discount|promo/i.test(note.title));

  const isGift = note.icon === 'gift' || note.icon === 'star';
  const isCar = note.icon === 'car';
  const isSuccess = note.icon === 'check' || (note.title && /completed|success|credited|accepted/i.test(note.title));

  // 40x40 circular tinted badge colors
  let badgeBg = '#F8FAFC'; // default bg-slate-50
  let badgeColor = '#64748B';
  let badgeIcon = note.icon || 'bell';

  if (isOffer) {
    badgeBg = '#FEF3C7'; // bg-amber-50 / amber-100 soft
    badgeColor = '#D97706';
    badgeIcon = 'star';
  } else if (isGift || isSuccess) {
    badgeBg = '#ECFDF5'; // bg-emerald-50
    badgeColor = '#059669';
    badgeIcon = isGift ? 'gift' : 'check';
  } else if (isCar) {
    badgeBg = '#EFF6FF'; // bg-blue-50
    badgeColor = '#2563EB';
    badgeIcon = 'car';
  }

  const handleClick = (e) => {
    if (e.target.closest('button')) return;
    onToggleExpand(note.id);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{
        opacity: isClearingAll ? 0 : 1,
        x: isClearingAll ? -36 : 0,
        scale: isClearingAll ? 0.94 : 1,
        y: 0,
        transition: {
          duration: isClearingAll ? 0.28 : 0.24,
          delay: isClearingAll ? index * 0.04 : 0,
          ease: [0.16, 1, 0.3, 1]
        }
      }}
      exit={{
        opacity: 0,
        x: -40,
        scale: 0.92,
        transition: { duration: 0.22, ease: 'easeIn' }
      }}
      onClick={handleClick}
      style={{
        borderRadius: '16px', // rounded-2xl
        padding: '16px', // consistent 16px padding
        marginBottom: '10px',
        cursor: 'pointer',
        userSelect: 'none',
        background: isRead ? '#F8FAFC' : '#FFFFFF', // neutral light-gray surface vs crisp white
        border: isRead ? '1px solid #F1F5F9' : '1px solid #E2E8F0', // subtle 1px border divider
        boxShadow: isRead ? 'none' : '0 2px 8px -2px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.03)', // soft elevation 2
        transition: 'background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Top Card Row: 40x40 Circular Tinted Badge + Content */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
        {/* 40x40 Circular Tinted Micro-Icon Badge */}
        <span
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: isRead ? '#F1F5F9' : badgeBg,
            color: isRead ? '#94A3B8' : badgeColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'background 0.2s ease, color 0.2s ease'
          }}
        >
          <Icon name={badgeIcon} size={18} />
        </span>

        {/* Content Column */}
        <div style={{ flex: 1, minWidth: 0, paddingTop: '1px' }}>
          {/* Title & Right-Aligned Timestamp */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: isRead ? '#334155' : '#0F172A',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                lineHeight: 1.35,
                letterSpacing: '-0.01em'
              }}
            >
              {note.title}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              {!isRead && (
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#059669',
                    display: 'inline-block'
                  }}
                  title="Unread"
                />
              )}
              <span
                style={{
                  fontSize: '11px',
                  color: '#94A3B8',
                  fontWeight: 500,
                  whiteSpace: 'nowrap'
                }}
              >
                {formatTimeAgo(note.ts)}
              </span>
            </div>
          </div>

          {/* Single/Double-Line Body Text (13px, #64748B) */}
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              color: isRead ? '#94A3B8' : '#64748B',
              lineHeight: 1.45,
              display: isExpanded ? 'block' : '-webkit-box',
              WebkitLineClamp: isExpanded ? 'unset' : 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {note.body}
          </p>

          {/* Offer Action Buttons (Shown when offer or expanded) */}
          {isOffer && isExpanded && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '12px'
              }}
            >
              <button
                type="button"
                className="btn primary"
                style={{
                  height: '32px',
                  padding: '0 14px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
                onClick={() => onClaimOffer(note)}
              >
                <span>Claim Now</span>
                <Icon name="arrow-right" size={13} />
              </button>
              <button
                type="button"
                className="btn"
                style={{
                  height: '32px',
                  padding: '0 12px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: '#F1F5F9',
                  color: '#475569',
                  border: '1px solid #E2E8F0',
                  cursor: 'pointer'
                }}
                onClick={() => onViewOfferDetails(note)}
              >
                View Details
              </button>
            </div>
          )}
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
    clearAllNotifs,
    addToast,
    setBookingCategory,
    setBookingOpen
  } = useApp();

  const [expandedId, setExpandedId] = useState(null);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [isClearingAll, setIsClearingAll] = useState(false);

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

  // Ultra-clean modern cleaning animation:
  // Cards smoothly sweep out with staggered delay, then empty state dissolves in gracefully.
  // No layout shift, no secondary popups or toasts.
  const handleClearAll = () => {
    if (!unotes || unotes.length === 0 || isClearingAll) return;
    setIsClearingAll(true);
    if (navigator.vibrate) {
      try { navigator.vibrate(20); } catch (e) {}
    }

    // Wait for the sweeping cards animation to gracefully finish
    setTimeout(() => {
      clearAllNotifs();
      setExpandedId(null);
      setIsClearingAll(false);
    }, 320);
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
            maxWidth: '460px',
            margin: '0 auto',
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
            overflow: 'hidden'
          }}
        >
          {/* Modern Minimalist Sticky Header */}
          <div
            className="sheet-sticky-top"
            style={{
              padding: '16px 20px 14px',
              borderBottom: '1px solid #F1F5F9',
              background: '#FFFFFF'
            }}
          >
            <div
              style={{
                width: '36px',
                height: '4px',
                borderRadius: '999px',
                background: '#E2E8F0',
                margin: '0 auto 14px',
                opacity: 0.9
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: 700,
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
                      fontWeight: 600,
                      color: '#059669',
                      background: '#ECFDF5',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      border: '1px solid #A7F3D0'
                    }}
                  >
                    {unotes.length}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* Minimal Header "Clear all" text button */}
                {hasNotes && !isClearingAll && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '4px 8px',
                      fontSize: '12.5px',
                      fontWeight: 500,
                      color: '#64748B',
                      cursor: 'pointer',
                      borderRadius: '8px',
                      transition: 'color 0.18s ease'
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
                    width: '32px',
                    height: '32px',
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
                  <Icon name="x" size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Body with guaranteed stable height to prevent layout shifts */}
          <div
            className="sheet-scroll-body"
            style={{
              padding: '12px 18px 24px',
              minHeight: '280px',
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
                    transition: { duration: 0.2, ease: 'easeOut' }
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  {unotes.map((n, idx) => (
                    <ExpandableNotifCard
                      key={n.id}
                      note={n}
                      index={idx}
                      isExpanded={expandedId === n.id}
                      onToggleExpand={handleToggleExpand}
                      onClaimOffer={handleClaimOffer}
                      onViewOfferDetails={handleViewOfferDetails}
                      isClearingAll={isClearingAll}
                    />
                  ))}
                </motion.div>
              ) : (
                /* Ultra Minimal Empty State */
                <motion.div
                  key="notifications-empty"
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1], delay: 0.05 }
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
                  <span
                    style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '50%',
                      background: 'var(--field, #F8FAFC)',
                      border: '1px solid var(--line, #E2E8F0)',
                      color: '#94A3B8',
                      display: 'grid',
                      placeItems: 'center',
                      marginBottom: '14px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                    }}
                  >
                    <Icon name="bell" size={22} />
                  </span>
                  <h4
                    style={{
                      margin: '0 0 5px',
                      fontSize: '15px',
                      fontWeight: 700,
                      color: 'var(--ink, #0F172A)',
                      letterSpacing: '-0.01em'
                    }}
                  >
                    No notifications
                  </h4>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '12.5px',
                      color: 'var(--muted, #64748B)',
                      lineHeight: 1.5,
                      maxWidth: '260px'
                    }}
                  >
                    You're all caught up. Live trip updates and special driver offers will arrive here.
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
