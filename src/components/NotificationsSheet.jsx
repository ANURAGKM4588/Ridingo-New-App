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
    'Offer valid on all Chauffeur bookings booked via the Ridingo mobile app.',
    'Cashback of 20% (up to ₹250) is credited to your Ridingo Wallet immediately upon trip completion.',
    'Applicable for both Manual and Automatic transmission personal vehicles.',
    'Cannot be combined with any other promotional coupons or corporate discounts.',
    'Platform terms and chauffeur service policies apply.'
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
                Exclusive Chauffeur Promotion
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
            {offer.title || 'Special Chauffeur Offer'}
          </h4>
          <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#94A3B8', lineHeight: 1.45 }}>
            {offer.body || 'Enjoy professional chauffeurs at exceptional discounts.'}
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
 * Expandable Notification Card (Minimal Modern Aesthetic)
 * - Ultra-clean card geometry, delicate borders, crisp typography
 * - Tap smoothly expands details and automatically marks as read
 * - Smooth staggered exit on clear with cleaning animation
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
        borderRadius: '16px',
        padding: '13px 15px',
        marginBottom: '8px',
        cursor: 'pointer',
        userSelect: 'none',
        background: isRead ? 'var(--field, #F8FAFC)' : 'var(--card, #FFFFFF)',
        border: isRead ? '1px solid var(--line, #E2E8F0)' : '1px solid rgba(0, 0, 0, 0.08)',
        boxShadow: isRead ? 'none' : '0 1px 4px rgba(0, 0, 0, 0.03)',
        transition: 'background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Main Bar (Always Visible) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Minimal Rounded Icon */}
        <span
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '11px',
            background: isOffer
              ? 'rgba(245, 158, 11, 0.12)'
              : isGift
              ? 'rgba(16, 185, 129, 0.12)'
              : isCar
              ? 'rgba(59, 130, 246, 0.12)'
              : isRead
              ? 'var(--line, #E2E8F0)'
              : 'rgba(15, 23, 42, 0.06)',
            color: isOffer
              ? '#D97706'
              : isGift
              ? '#059669'
              : isCar
              ? '#2563EB'
              : 'var(--ink, #0F172A)',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0
          }}
        >
          <Icon name={note.icon || (isOffer ? 'star' : 'bell')} size={17} />
        </span>

        {/* Title & Timestamp */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span
              style={{
                fontSize: '13.5px',
                fontWeight: isRead ? 550 : 650,
                color: isRead ? 'var(--muted, #64748B)' : 'var(--ink, #0F172A)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: isExpanded ? 'normal' : 'nowrap',
                lineHeight: 1.35,
                letterSpacing: '-0.01em'
              }}
            >
              {note.title}
            </span>
            <span
              style={{
                fontSize: '11px',
                color: '#94A3B8',
                fontWeight: 500,
                flexShrink: 0,
                whiteSpace: 'nowrap'
              }}
            >
              {formatTimeAgo(note.ts)}
            </span>
          </div>
        </div>

        {/* Minimal Unread Dot */}
        {!isRead && (
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#2563EB',
              flexShrink: 0,
              boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.2)'
            }}
            title="Unread"
          />
        )}

        {/* Minimal Micro Chevron */}
        <span
          style={{
            color: '#94A3B8',
            display: 'flex',
            alignItems: 'center',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
            flexShrink: 0
          }}
        >
          <Icon name="chevron-down" size={15} />
        </span>
      </div>

      {/* Expandable Body */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ height: '1px', background: 'var(--line, #E2E8F0)', margin: '10px 0 8px', opacity: 0.8 }} />
            <p
              style={{
                margin: 0,
                fontSize: '12.5px',
                color: isRead ? 'var(--muted, #64748B)' : 'var(--ink, #334155)',
                lineHeight: 1.55,
                paddingLeft: '48px'
              }}
            >
              {note.body}
            </p>

            {/* Offer Action Buttons */}
            {isOffer && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '11px',
                  paddingLeft: '48px'
                }}
              >
                <button
                  type="button"
                  className="btn primary"
                  style={{
                    height: '32px',
                    padding: '0 13px',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: 700,
                    background: '#000000',
                    color: '#FFFFFF',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  onClick={() => onClaimOffer(note)}
                >
                  <span>Claim Offer</span>
                  <Icon name="chevron-right" size={13} />
                </button>

                <button
                  type="button"
                  className="btn"
                  style={{
                    height: '32px',
                    padding: '0 11px',
                    borderRadius: '999px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    background: 'var(--field, #F1F5F9)',
                    color: 'var(--ink, #0F172A)',
                    border: '1px solid var(--line, #E2E8F0)',
                    cursor: 'pointer'
                  }}
                  onClick={() => onViewOfferDetails(note)}
                >
                  Details
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
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
    addToast(`Offer activated! Book your ${offerCat} chauffeur now.`, 'check');
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
          {/* Minimal Modern Sticky Header */}
          <div className="sheet-sticky-top" style={{ padding: '12px 18px 8px' }}>
            <div
              style={{
                width: '36px',
                height: '4px',
                borderRadius: '999px',
                background: 'var(--line, #CBD5E1)',
                margin: '0 auto 12px',
                opacity: 0.8
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '17px',
                    fontWeight: 700,
                    color: 'var(--ink, #0F172A)',
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
                      color: 'var(--muted, #64748B)',
                      background: 'var(--field, #F1F5F9)',
                      padding: '2px 7px',
                      borderRadius: '999px',
                      border: '1px solid var(--line, #E2E8F0)'
                    }}
                  >
                    {unotes.length}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Minimal Header "Clear all" text button */}
                {hasNotes && !isClearingAll && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '5px 8px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: '#64748B',
                      cursor: 'pointer',
                      borderRadius: '6px',
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
                    width: '30px',
                    height: '30px',
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
                    You're all caught up. Live trip updates and special chauffeur offers will arrive here.
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
