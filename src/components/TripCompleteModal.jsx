import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Icon from './Icon';
import { cleanLocationName } from '../utils/locationCleaner';
import { generateTripTicketImage } from '../utils/tripTicketGenerator';
import { shareTicketImageWithCaption } from '../services/installedUpiService';
import { generateTripInvoiceText } from '../utils/tripInvoiceSharing';

export default function TripCompleteModal({ trip: propTrip, onClose }) {
  const {
    tripCompleteModalOpen,
    setTripCompleteModalOpen,
    completedTripData,
    setBookingOpen,
    addToast,
    user
  } = useApp();

  const trip = propTrip || completedTripData;

  const [paymentMethod, setPaymentMethod] = useState('UPI'); // 'UPI' | 'Cash' | 'Wallet'
  const [rating, setRating] = useState(4); // Default to 4 or 5 stars like screenshot
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedFeedback, setSelectedFeedback] = useState(['Careful driving', 'On time']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  if (!trip && !tripCompleteModalOpen) return null;

  const handleClose = () => {
    if (onClose) onClose();
    if (setTripCompleteModalOpen) setTripCompleteModalOpen(false);
  };

  // Safe trip attributes
  const pickupName = cleanLocationName(trip?.pickup || 'MG Road').split(',')[0].trim();
  const dropName = cleanLocationName(trip?.drop || trip?.drop_loc || 'Airport').split(',')[0].trim();
  const durationLabel = trip?.qty
    ? `${trip.qty} ${trip.qty === 1 ? 'hour' : 'hours'}`
    : trip?.durationText || '3 hours';

  // Dynamic Fare & Settlement Calculations
  const totalFare = Number(trip?.fare || trip?.amount || 750);
  const advancePaid = Number(trip?.advance || Math.round(totalFare * 0.3) || 225);
  const extraKm = Number(trip?.extensionDistanceKm || 0);
  const extraWaiting = Number(trip?.waitingFare || 0);
  const waitingAndExtraKm = Number(trip?.extensionFare || 0) + extraWaiting;
  const balanceToPay = Math.max(0, totalFare - advancePaid + waitingAndExtraKm);

  // Driver Identity
  const rawDriverName = typeof trip?.driver === 'string'
    ? trip.driver
    : trip?.driver?.name || trip?.driverObj?.name || 'Suresh K.';
  const driverName = rawDriverName.replace(/\b\w/g, l => l.toUpperCase());

  const getInitials = (name) => {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (name.slice(0, 2) || 'SK').toUpperCase();
  };
  const driverInitials = getInitials(driverName);

  const feedbackOptions = [
    'Careful driving',
    'On time',
    'Polite'
  ];

  const toggleFeedbackTag = (tag) => {
    setSelectedFeedback(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmitRating = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setRatingSubmitted(true);
      if (addToast) {
        addToast(`Thank you! Rated ${rating} stars for ${driverName}.`, 'check');
      }
      setTimeout(() => {
        handleClose();
      }, 1200);
    }, 600);
  };

  const handleBookAgain = () => {
    handleClose();
    if (setBookingOpen) {
      setBookingOpen(true);
    }
  };

  const handleDownloadReceipt = async () => {
    setIsDownloading(true);
    try {
      if (trip) {
        const ticketImage = await generateTripTicketImage(trip);
        if (ticketImage) {
          const shared = await shareTicketImageWithCaption(
            ticketImage,
            `Ridingo Trip Receipt - ${trip.id}\nDriver: ${driverName}\nTotal Fare: ₹${totalFare}\nPaid: ₹${balanceToPay}`
          );
          if (shared) {
            if (addToast) addToast('Receipt pass downloaded and shared!', 'check');
            return;
          }
        }
      }
      // Web text fallback
      const invoiceText = generateTripInvoiceText(trip || {});
      if (navigator.share) {
        await navigator.share({
          title: `Ridingo Trip Receipt - ${trip?.id || 'Trip'}`,
          text: invoiceText
        });
      } else {
        await navigator.clipboard.writeText(invoiceText);
        if (addToast) addToast('Receipt details copied to clipboard!', 'check');
      }
    } catch (err) {
      console.warn('Receipt download note:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      className="layer on"
      id="trip-complete-modal"
      style={{
        zIndex: 110,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)'
      }}
    >
      <div
        className="scrim"
        onClick={handleClose}
        style={{ position: 'absolute', inset: 0 }}
      />

      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '430px',
          maxHeight: '94vh',
          background: '#FFFFFF',
          borderRadius: '28px 28px 0 0',
          boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.16)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 10
        }}
      >
        {/* Top Header Section */}
        <div
          style={{
            padding: '24px 20px 10px',
            textAlign: 'center',
            position: 'relative'
          }}
        >
          {/* Circular Close Button */}
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#F1F5F9',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748B'
            }}
          >
            <Icon name="x" size={16} />
          </button>

          {/* Large Green Checkmark Badge */}
          <div
            style={{
              width: '58px',
              height: '58px',
              borderRadius: '50%',
              background: '#228B22',
              backgroundColor: '#1E7E34',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
              boxShadow: '0 6px 18px rgba(30, 126, 52, 0.25)'
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          {/* Title */}
          <h2
            style={{
              fontSize: '24px',
              fontWeight: 900,
              color: '#111827',
              margin: '0 0 4px',
              letterSpacing: '-0.3px',
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}
          >
            Trip complete
          </h2>

          {/* Subtitle */}
          <p
            style={{
              fontSize: '13.5px',
              fontWeight: 500,
              color: '#4B5563',
              margin: '0 0 16px',
              letterSpacing: '-0.1px'
            }}
          >
            {pickupName} to {dropName} · {durationLabel}
          </p>
        </div>

        {/* Scrollable Content Cards */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: '0 20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}
        >
          {/* Card 1: Fare Breakdown & Payment Method */}
          <div
            style={{
              border: '1px solid #E5E7EB',
              borderRadius: '18px',
              padding: '16px 18px',
              background: '#FFFFFF',
              boxShadow: '0 1px 4px rgba(0, 0, 0, 0.02)'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '14px',
                color: '#374151',
                fontWeight: 500,
                marginBottom: '8px'
              }}
            >
              <span>Trip total</span>
              <span style={{ fontWeight: 700, color: '#111827' }}>₹{totalFare}</span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '14px',
                fontWeight: 600,
                color: '#15803D',
                marginBottom: '8px'
              }}
            >
              <span>Advance paid</span>
              <span>– ₹{advancePaid}</span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '14px',
                color: '#374151',
                fontWeight: 500,
                marginBottom: '14px'
              }}
            >
              <span>Waiting and extra km</span>
              <span style={{ fontWeight: 700, color: '#111827' }}>₹{waitingAndExtraKm}</span>
            </div>

            {/* Subtle Divider */}
            <div style={{ height: '1px', background: '#F3F4F6', margin: '10px 0 14px' }} />

            {/* Pay the driver Row */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '14px'
              }}
            >
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>
                Pay the driver
              </span>
              <span style={{ fontSize: '24px', fontWeight: 900, color: '#111827' }}>
                ₹{balanceToPay}
              </span>
            </div>

            {/* Payment Method Selector Pills: UPI | Cash | Wallet */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '8px'
              }}
            >
              {['UPI', 'Cash', 'Wallet'].map((method) => {
                const isSelected = paymentMethod === method;
                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    style={{
                      height: '38px',
                      borderRadius: '10px',
                      border: isSelected ? '1.5px solid #000000' : '1px solid #E5E7EB',
                      background: isSelected ? '#F3F4F6' : '#FFFFFF',
                      color: isSelected ? '#111827' : '#4B5563',
                      fontSize: '13px',
                      fontWeight: isSelected ? 800 : 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {method}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card 2: Driver Rating & Feedback */}
          <div
            style={{
              border: '1px solid #E5E7EB',
              borderRadius: '18px',
              padding: '16px 18px',
              background: '#FFFFFF',
              boxShadow: '0 1px 4px rgba(0, 0, 0, 0.02)'
            }}
          >
            {/* Header: Avatar with Gold Ring + Question */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '14px'
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  border: '2.5px solid #F59E0B',
                  background: '#FFFBEB',
                  color: '#111827',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '14.5px',
                  flexShrink: 0
                }}
              >
                {driverInitials}
              </div>
              <span
                style={{
                  fontSize: '15px',
                  fontWeight: 800,
                  color: '#111827',
                  letterSpacing: '-0.2px'
                }}
              >
                How was {driverName} ?
              </span>
            </div>

            {/* 5 Interactive Stars */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '14px',
                marginBottom: '16px'
              }}
            >
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    aria-label={`Rate ${star} stars`}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transform: isFilled ? 'scale(1.08)' : 'scale(1)',
                      transition: 'transform 0.15s ease'
                    }}
                  >
                    <svg
                      width="30"
                      height="30"
                      viewBox="0 0 24 24"
                      fill={isFilled ? '#F59E0B' : 'none'}
                      stroke={isFilled ? '#D97706' : '#9CA3AF'}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>
                );
              })}
            </div>

            {/* Quick Feedback Chips: Careful driving | On time | Polite */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '8px',
                flexWrap: 'wrap'
              }}
            >
              {feedbackOptions.map((tag) => {
                const isSelected = selectedFeedback.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleFeedbackTag(tag)}
                    style={{
                      borderRadius: '999px',
                      padding: '7px 15px',
                      fontSize: '12.5px',
                      fontWeight: isSelected ? 700 : 500,
                      border: isSelected ? '1.5px solid #111827' : '1px solid #D1D5DB',
                      background: isSelected ? '#F3F4F6' : '#FFFFFF',
                      color: isSelected ? '#111827' : '#374151',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons: Submit Rating + Book Again / Download Receipt */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
            <button
              type="button"
              onClick={handleSubmitRating}
              disabled={isSubmitting || ratingSubmitted}
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '12px',
                background: '#FBBF24',
                color: '#111827',
                fontSize: '15.5px',
                fontWeight: 800,
                border: 'none',
                cursor: (isSubmitting || ratingSubmitted) ? 'default' : 'pointer',
                boxShadow: '0 2px 8px rgba(251, 191, 36, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
            >
              {ratingSubmitted ? '✓ Rating Submitted' : (isSubmitting ? 'Submitting...' : 'Submit rating')}
            </button>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={handleBookAgain}
                style={{
                  flex: 1,
                  height: '44px',
                  borderRadius: '12px',
                  border: '1.5px solid #111827',
                  background: '#FFFFFF',
                  color: '#111827',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                Book again
              </button>

              <button
                type="button"
                onClick={handleDownloadReceipt}
                disabled={isDownloading}
                style={{
                  flex: 1,
                  height: '44px',
                  borderRadius: '12px',
                  border: '1.5px solid #111827',
                  background: '#FFFFFF',
                  color: '#111827',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: isDownloading ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {isDownloading ? 'Downloading...' : 'Download receipt'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
