import React, { useState, useRef, useEffect } from 'react';
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
function ExpandableNotifCard({
  note,
  isExpanded,
  onToggleExpand,
  onDelete,
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
    // If clicking on interactive action buttons inside expanded view, don't collapse
    if (e.target.closest('button')) return;
    onToggleExpand(note.id);
  };

  return (
    <div
      onClick={handleClick}
      style={{
        borderRadius: '18px',
        padding: '13px 14px',
        marginBottom: isClearingAll ? '0px' : '8px',
        cursor: 'pointer',
        userSelect: 'none',
        // Unread = Light White theme (#FFFFFF), Read = Light Gray theme (#F1F5F9)
        background: isRead ? 'var(--field, #F1F5F9)' : '#FFFFFF',
        border: isRead ? '1px solid var(--line, #E2E8F0)' : '1px solid rgba(0, 0, 0, 0.12)',
        boxShadow: isRead ? 'none' : '0 2px 10px rgba(0, 0, 0, 0.05)',
        transition: 'all 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
        opacity: isClearingAll ? 0 : 1,
        transform: isClearingAll ? 'translateY(18px) scale(0.95)' : 'none',
        maxHeight: isClearingAll ? '0px' : '400px',
        overflow: 'hidden'
      }}
    >
      {/* Main Content (Always Visible) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Leading Icon */}
        <span
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '12px',
            background: isOffer
              ? 'rgba(250, 204, 21, 0.2)'
              : isGift
              ? 'rgba(34, 197, 94, 0.16)'
              : isCar
              ? 'var(--yellow-soft, #FEF3C7)'
              : isRead
              ? '#E2E8F0'
              : 'var(--field, #F1F5F9)',
            color: isOffer
              ? '#D97706'
              : isGift
              ? '#16A34A'
              : isCar
              ? '#B45309'
              : 'var(--ink, #0F172A)',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0
          }}
        >
          <Icon name={note.icon || (isOffer ? 'star' : 'bell')} size={18} />
        </span>

        {/* Title & Timestamp */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
            <span
              style={{
                fontSize: '13.5px',
                fontWeight: isRead ? 600 : 750,
                color: isRead ? '#475569' : '#0F172A',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: isExpanded ? 'normal' : 'nowrap',
                lineHeight: 1.3
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

        {/* Unread indicator ONLY if unread. Tapping removes it! */}
        {!isRead && (
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#EAB308',
              flexShrink: 0,
              boxShadow: '0 0 0 3px rgba(234, 179, 8, 0.25)'
            }}
            title="Unread"
          />
        )}

        {/* Expand / Collapse Chevron */}
        <span
          style={{
            color: '#94A3B8',
            display: 'flex',
            alignItems: 'center',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.22s ease',
            flexShrink: 0
          }}
        >
          <Icon name="chevron-down" size={16} />
        </span>
      </div>

      {/* Expandable Body Content */}
      <div
        style={{
          maxHeight: isExpanded ? '300px' : '0px',
          opacity: isExpanded ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease',
          paddingTop: isExpanded ? '10px' : '0px'
        }}
      >
        <div style={{ height: '1px', background: isRead ? '#E2E8F0' : 'rgba(0,0,0,0.06)', margin: '4px 0 10px' }} />
        <p
          style={{
            margin: 0,
            fontSize: '12.8px',
            color: isRead ? '#475569' : '#1E293B',
            lineHeight: 1.5,
            paddingLeft: '48px'
          }}
        >
          {note.body}
        </p>

        {/* Offer Actions: "Claim Now" & "View More" */}
        {isOffer && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '12px',
              paddingLeft: '48px'
            }}
          >
            <button
              type="button"
              className="btn primary"
              style={{
                height: '34px',
                padding: '0 14px',
                borderRadius: '10px',
                fontSize: '12.5px',
                fontWeight: 750,
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
              <span>Claim Now</span>
              <Icon name="chevron-right" size={13} />
            </button>

            <button
              type="button"
              className="btn"
              style={{
                height: '34px',
                padding: '0 12px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: 700,
                background: 'var(--field, #F1F5F9)',
                color: 'var(--ink, #0F172A)',
                border: '1px solid var(--line, #E2E8F0)',
                cursor: 'pointer'
              }}
              onClick={() => onViewOfferDetails(note)}
            >
              View More
            </button>
          </div>
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
      // Auto mark as read on tap
      markNotifRead(id);
    }
  };

  // Smooth clean collapse animation into bottom without opening any new modal!
  const handleClearAll = () => {
    if (!unotes || unotes.length === 0 || isClearingAll) return;
    setIsClearingAll(true);
    if (navigator.vibrate) {
      try { navigator.vibrate([20, 35, 20]); } catch (e) {}
    }
    // Smooth transition delay so items smoothly collapse to bottom
    setTimeout(() => {
      clearAllNotifs();
      setExpandedId(null);
      setIsClearingAll(false);
      addToast('All notifications cleared', 'info');
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

  return (
    <>
      <div className="layer on" id="u-notifs-layer" style={{ zIndex: 90 }}>
        <div className="scrim" onClick={handleClose} />

        <div className="sheet" role="dialog" aria-modal="true">
          {/* Header without total count */}
          <div className="sheet-sticky-top">
            <div className="grab" />
            <div className="sheet-h" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--ink)' }}>
                Notifications
              </h3>
              <button
                className="iconbtn"
                onClick={handleClose}
                aria-label="Close"
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: 'var(--field)',
                  border: '1px solid var(--line)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--ink)'
                }}
              >
                <Icon name="x" size={18} />
              </button>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="sheet-scroll-body" style={{ padding: '16px 18px 24px' }}>
            {hasNotes ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.32s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                {unotes.map((n) => (
                  <ExpandableNotifCard
                    key={n.id}
                    note={n}
                    isExpanded={expandedId === n.id}
                    onToggleExpand={handleToggleExpand}
                    onClaimOffer={handleClaimOffer}
                    onViewOfferDetails={handleViewOfferDetails}
                    isClearingAll={isClearingAll}
                  />
                ))}
              </div>
            ) : (
              /* Appealing Empty State Message */
              <div
                className="empty"
                style={{
                  padding: '42px 18px',
                  textAlign: 'center',
                  animation: 'fadeIn 0.3s ease'
                }}
              >
                <span
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'var(--field, #F1F5F9)',
                    color: '#94A3B8',
                    display: 'grid',
                    placeItems: 'center',
                    margin: '0 auto 14px',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.06)'
                  }}
                >
                  <Icon name="bell" size={24} />
                </span>
                <h4 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 750, color: 'var(--ink)' }}>
                  No notifications
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', lineHeight: 1.45, maxWidth: '280px', marginInline: 'auto' }}>
                  You're all caught up! Live trip updates, chauffeur arrivals, and special rewards will appear here.
                </p>
              </div>
            )}

            {/* Clear All Button: Visible only when notifications exist. Smoothly collapses when clicked. */}
            <div
              style={{
                overflow: 'hidden',
                maxHeight: hasNotes ? '70px' : '0px',
                opacity: hasNotes ? 1 : 0,
                transition: 'max-height 0.32s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.28s ease',
                marginTop: hasNotes ? '14px' : '0px'
              }}
            >
              <button
                type="button"
                className="btn"
                disabled={isClearingAll}
                style={{
                  width: '100%',
                  height: '46px',
                  borderRadius: '14px',
                  background: isClearingAll ? 'rgba(239, 68, 68, 0.16)' : 'rgba(239, 68, 68, 0.08)',
                  color: '#EF4444',
                  border: '1px solid rgba(239, 68, 68, 0.22)',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: isClearingAll ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.22s ease'
                }}
                onClick={handleClearAll}
              >
                <Icon name="trash" size={16} />
                <span>{isClearingAll ? 'Clearing notifications...' : 'Clear All'}</span>
              </button>
            </div>
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
