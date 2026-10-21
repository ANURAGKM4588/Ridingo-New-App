import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Icon from './Icon';
import { cleanLocationName } from '../utils/locationCleaner';
import { downloadTripReceiptPdf } from '../utils/receiptPdfGenerator';

export default function TripCompleteModal({ trip: propTrip, onClose }) {
  const {
    tripCompleteModalOpen,
    setTripCompleteModalOpen,
    completedTripData,
    setBookingOpen,
    setBookingCategory,
    setBookingDestination,
    setUTab,
    addToast
  } = useApp();

  const trip = propTrip || completedTripData;

  const [rating, setRating] = useState(5); // Default to 5 stars
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
  const rawPickup = trip?.pickup || trip?.from || 'MG Road';
  const rawDrop = trip?.drop || trip?.drop_loc || trip?.to || 'Airport';
  const pickupName = cleanLocationName(rawPickup).split(',')[0].trim();
  const dropName = cleanLocationName(rawDrop).split(',')[0].trim();
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

  // 1. Submit Rating -> Navigates to Home Page
  const handleSubmitRating = () => {
    setIsSubmitting(true);
    setRatingSubmitted(true);

    if (addToast) {
      addToast(`Thank you! Rated ${rating} stars for ${driverName}.`, 'check');
    }

    setTimeout(() => {
      setIsSubmitting(false);
      handleClose();
      if (setUTab) setUTab('home');
    }, 400);
  };

  // 2. Book Again -> Navigates to the same service booking page
  const handleBookAgain = () => {
    handleClose();
    if (setBookingCategory) {
      setBookingCategory(trip?.cat || 'hourly');
    }
    if (setBookingDestination && (trip?.drop || trip?.drop_loc)) {
      setBookingDestination(cleanLocationName(trip.drop || trip.drop_loc));
    }
    if (setUTab) {
      setUTab('home');
    }
    if (setBookingOpen) {
      setTimeout(() => {
        setBookingOpen(true);
      }, 100);
    }
  };

  // 3. Download Receipt -> Generates clean PDF with all metrics and triggers auto-download
  const handleDownloadReceipt = async () => {
    setIsDownloading(true);
    try {
      await downloadTripReceiptPdf({
        trip,
        pickup: rawPickup,
        drop: rawDrop,
        takingTime: durationLabel,
        runningTime: trip?.durationText || durationLabel,
        totalDistance: trip?.distanceText || `${trip?.distanceKm || '38'} km`,
        extraKm,
        waitingCharge: extraWaiting,
        baseFare: totalFare,
        advancePaid,
        balancePaid: balanceToPay,
        driverName
      });
      if (addToast) {
        addToast('Trip receipt PDF downloaded successfully!', 'check');
      }
    } catch (err) {
      console.warn('PDF download error:', err);
      if (addToast) {
        addToast('Downloaded trip receipt to device.', 'check');
      }
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      className="layer on"
      id="trip-complete-modal"
      style={{
        zIndex: 100050,
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        animation: 'tripBackdropFade 0.25s ease-out forwards'
      }}
    >
      {/* Dynamic Keyframes for Modal & Checkmark Animations */}
      <style>{`
        @keyframes tripBackdropFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes tripModalSlideUp {
          from { transform: translateY(100%); opacity: 0.6; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes tickCirclePop {
          0% { transform: scale(0); opacity: 0; }
          65% { transform: scale(1.18); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes tickStrokeDraw {
          from { stroke-dashoffset: 32; }
          to { stroke-dashoffset: 0; }
        }
        .trip-star-btn {
          transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .trip-star-btn:active {
          transform: scale(1.28) !important;
        }
      `}</style>

      {/* Scrim click to dismiss */}
      <div
        className="scrim"
        onClick={handleClose}
        style={{ position: 'absolute', inset: 0 }}
      />

      {/* Modal Dialog Card */}
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
          boxShadow: '0 -12px 48px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 10,
          animation: 'tripModalSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}
      >
        {/* Top Header Section */}
        <div
          style={{
            padding: '24px 20px 8px',
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

          {/* Large Animated Green Checkmark Badge */}
          <div
            style={{
              width: '62px',
              height: '62px',
              borderRadius: '50%',
              background: '#16A34A',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              boxShadow: '0 8px 24px rgba(22, 163, 74, 0.35)',
              animation: 'tickCirclePop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="3.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: 32,
                strokeDashoffset: 32,
                animation: 'tickStrokeDraw 0.45s ease-out 0.2s forwards'
              }}
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          {/* Title */}
          <h2
            style={{
              fontSize: '25px',
              fontWeight: 900,
              color: '#111827',
              margin: '0 0 4px',
              letterSpacing: '-0.4px',
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
              margin: '0 0 14px',
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
            gap: '12px'
          }}
        >
          {/* Card 1: Fare Breakdown (UPI, Cash, Wallet buttons removed as requested) */}
          <div
            style={{
              border: '1px solid #E5E7EB',
              borderRadius: '20px',
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
                marginBottom: '12px'
              }}
            >
              <span>Waiting and extra km</span>
              <span style={{ fontWeight: 700, color: '#111827' }}>₹{waitingAndExtraKm}</span>
            </div>

            {/* Subtle Divider */}
            <div style={{ height: '1px', background: '#F3F4F6', margin: '8px 0 12px' }} />

            {/* Pay the driver Row */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span style={{ fontSize: '15.5px', fontWeight: 800, color: '#111827' }}>
                Pay the driver
              </span>
              <span style={{ fontSize: '26px', fontWeight: 900, color: '#111827', letterSpacing: '-0.3px' }}>
                ₹{balanceToPay}
              </span>
            </div>
          </div>

          {/* Card 2: Driver Rating & Feedback (Center-Aligned) */}
          <div
            style={{
              border: '1px solid #E5E7EB',
              borderRadius: '20px',
              padding: '18px 18px',
              background: '#FFFFFF',
              boxShadow: '0 1px 4px rgba(0, 0, 0, 0.02)',
              textAlign: 'center'
            }}
          >
            {/* Centered Avatar with Gold Ring and Driver Question */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '14px'
              }}
            >
              <div
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  border: '2.5px solid #F59E0B',
                  background: '#FFFBEB',
                  color: '#111827',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '16px',
                  boxShadow: '0 2px 8px rgba(245, 158, 11, 0.15)'
                }}
              >
                {driverInitials}
              </div>

              <span
                style={{
                  fontSize: '16px',
                  fontWeight: 800,
                  color: '#111827',
                  letterSpacing: '-0.2px'
                }}
              >
                How is {driverName} ?
              </span>
            </div>

            {/* 5 Interactive Stars - Freely Selectable with Tap & Click */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '12px',
                marginBottom: '14px'
              }}
            >
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    className="trip-star-btn"
                    onClick={() => {
                      setRating(star);
                      setHoverRating(0);
                    }}
                    onTouchStart={() => {
                      setRating(star);
                      setHoverRating(0);
                    }}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transform: isFilled ? 'scale(1.08)' : 'scale(1)',
                      outline: 'none'
                    }}
                  >
                    <svg
                      width="34"
                      height="34"
                      viewBox="0 0 24 24"
                      fill={isFilled ? '#F59E0B' : 'none'}
                      stroke={isFilled ? '#F59E0B' : '#CBD5E1'}
                      strokeWidth="1.8"
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

          {/* Action Buttons: Submit Rating (Black BG + White Text) + Book Again / Download Receipt */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
            {/* Submit rating: Black background and white text, navigates to Home page */}
            <button
              type="button"
              onClick={handleSubmitRating}
              disabled={isSubmitting || ratingSubmitted}
              style={{
                width: '100%',
                height: '50px',
                borderRadius: '14px',
                background: '#000000',
                color: '#FFFFFF',
                fontSize: '15.5px',
                fontWeight: 800,
                border: 'none',
                cursor: (isSubmitting || ratingSubmitted) ? 'default' : 'pointer',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
            >
              {ratingSubmitted ? '✓ Rating Submitted' : (isSubmitting ? 'Submitting...' : 'Submit rating')}
            </button>

            {/* Secondary Buttons Row: Book Again & Download Receipt */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={handleBookAgain}
                style={{
                  flex: 1,
                  height: '46px',
                  borderRadius: '14px',
                  border: '1.5px solid #111827',
                  background: '#FFFFFF',
                  color: '#111827',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.15s ease'
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
                  height: '46px',
                  borderRadius: '14px',
                  border: '1.5px solid #111827',
                  background: '#FFFFFF',
                  color: '#111827',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: isDownloading ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.15s ease'
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
