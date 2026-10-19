import React, { useState, useEffect } from 'react';
import Icon from './Icon';
import { generateTripTicketImage } from '../utils/tripTicketGenerator';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { shareTicketImageWithCaption } from '../services/installedUpiService';
import { cleanLocationName } from '../utils/locationCleaner';

export default function TripTicketModal({ trip, isOpen, onClose, addToast }) {
  const [ticketData, setTicketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (isOpen && trip) {
      setLoading(true);
      generateTripTicketImage(trip)
        .then((res) => {
          if (isMounted) {
            setTicketData(res);
            setLoading(false);
          }
        })
        .catch((err) => {
          console.error('Failed to generate ticket image:', err);
          if (isMounted) setLoading(false);
        });
    } else {
      setTicketData(null);
      setLoading(false);
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, trip]);

  if (!isOpen || !trip) return null;

  const driverName =
    (typeof trip.driver === 'string' ? trip.driver : trip.driver?.name) ||
    trip.driverObj?.name ||
    'Assigned Driver';
  const driverPhone =
    trip.driverObj?.phone ||
    (typeof trip.driver === 'object' ? trip.driver?.phone : null) ||
    trip.driverPhone ||
    trip.car?.driverPhone ||
    '+91 94471 23456';
  const pickupLoc = cleanLocationName(trip.pickup) || 'Pickup Location';
  const dropLoc = cleanLocationName(trip.drop_loc) || 'City Destination';
  const fare = Number(trip.fare) || 750;
  const otp = String(trip.startOtp || trip.otp || '4821').trim();
  const trackUrl = `https://ridingo.app/track/${trip.id}`;

  const shareText = `🚗 Ridingo Driver Trip Details
Trip ID: ${trip.id}
━━━━━━━━━━━━━━━━━━━━
📍 From (Pickup): ${pickupLoc}
🏁 To (Destination): ${dropLoc}
👤 Assigned Driver: ${driverName}
📞 Driver Mobile: ${driverPhone}
💰 Total Fare: ₹${fare}
🔑 Trip Pickup OTP: ${otp}
━━━━━━━━━━━━━━━━━━━━
Live GPS Tracking: ${trackUrl}`;

  // 1. Share native image file directly to WhatsApp / OS Share sheet
  const handleShareImage = async () => {
    if (!ticketData?.file && !ticketData?.dataUrl) {
      if (addToast) addToast('Preparing ticket image...', 'info');
      return;
    }

    try {
      // A1. Direct Native WhatsApp Image + Caption Sharer (guarantees text is the caption, NOT separate message)
      if (Capacitor.isNativePlatform() && ticketData?.dataUrl) {
        try {
          const sent = await shareTicketImageWithCaption({
            base64Data: ticketData.dataUrl,
            caption: shareText,
            targetApp: 'whatsapp'
          });
          if (sent) {
            if (addToast) addToast('Ticket shared successfully!', 'check');
            return;
          }
        } catch (nativeShareErr) {
          console.warn('[TicketModal] shareTicketImageWithCaption note:', nativeShareErr);
        }
      }

      // A2. Mobile Native via Capacitor Filesystem + Share Fallback
      if (Capacitor.isNativePlatform()) {
        try {
          const base64Data = ticketData.dataUrl.split(',')[1];
          const fileName = `ridingo_ticket_${trip.id}.png`;
          const savedFile = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Cache
          });

          // When sharing an image, do NOT supply 'title' so WhatsApp and Android treat 'text' strictly as the image caption
          await Share.share({
            text: shareText,
            files: [savedFile.uri],
            dialogTitle: 'Share Trip Ticket'
          });
          if (addToast) addToast('Ticket shared successfully!', 'check');
          return;
        } catch (capErr) {
          if (capErr?.message?.toLowerCase().includes('cancel')) {
            return; // User dismissed share sheet
          }
          console.warn('[TicketModal] Capacitor native share fallback note:', capErr);
          // Fallback to text share natively if files fail
          try {
            await Share.share({
              title: `Ridingo Ticket · ${trip.id}`,
              text: shareText,
              url: trackUrl,
              dialogTitle: 'Share Trip Details'
            });
            if (addToast) addToast('Trip details shared!', 'check');
            return;
          } catch (capTextErr) {
            console.warn('[TicketModal] Native text share failed:', capTextErr);
          }
        }
      }

      // B. Web Share API with File (Supported in Mobile Chrome, Safari, etc.)
      if (
        ticketData.file &&
        typeof navigator !== 'undefined' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [ticketData.file] })
      ) {
        try {
          // Omit title so browser attaches text strictly as image caption
          await navigator.share({
            files: [ticketData.file],
            text: shareText
          });
          if (addToast) addToast('Ticket shared successfully!', 'check');
          return;
        } catch (webFileErr) {
          if (webFileErr?.name === 'AbortError') return;
          console.warn('[TicketModal] Web file share note:', webFileErr);
        }
      }

      // B2. Web Share API with Text (Supported when files are not shareable)
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          await navigator.share({
            title: `Ridingo Ticket · ${trip.id}`,
            text: shareText,
            url: trackUrl
          });
          if (addToast) addToast('Trip details shared successfully!', 'check');
          return;
        } catch (webShareErr) {
          if (webShareErr?.name === 'AbortError') return;
          console.warn('[TicketModal] Web text share note:', webShareErr);
        }
      }

      // C. Fallback: Copy image to clipboard so user can paste it directly into WhatsApp
      if (navigator.clipboard && window.ClipboardItem && ticketData.blob) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': ticketData.blob })
          ]);
          setCopied(true);
          setTimeout(() => setCopied(false), 3000);
          if (addToast) addToast('Ticket image copied to clipboard! Paste it into WhatsApp.', 'check');
          return;
        } catch (clipErr) {
          console.warn('Clipboard write image note:', clipErr);
        }
      }

      // D. Direct image download trigger if share not available on desktop
      handleDownload();
    } catch (err) {
      if (err?.name !== 'AbortError') {
        console.warn('Share image error:', err);
        handleDownload();
      }
    }
  };

  // 2. Direct Download of the filled ticket PNG image
  const handleDownload = () => {
    if (!ticketData?.dataUrl) return;
    try {
      const link = document.createElement('a');
      link.href = ticketData.dataUrl;
      link.download = `ridingo-ticket-${trip.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (addToast) addToast('Ticket image downloaded to your device!', 'check');
    } catch (e) {
      console.warn('Download error:', e);
    }
  };

  // 3. Copy Details & OTP to clipboard
  const handleCopyDetails = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
        if (addToast) addToast('Trip details and OTP copied to clipboard!', 'check');
      }
    } catch (e) {}
  };

  // 4. Share to WhatsApp text fallback
  const handleWhatsAppText = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  return (
    <div
      className="layer on"
      style={{
        zIndex: 10006,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
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
          maxHeight: '94vh',
          overflowY: 'auto',
          background: 'var(--card, #FFFFFF)',
          borderRadius: '24px',
          padding: '20px 20px max(24px, calc(env(safe-area-inset-bottom, 0px) + 20px))',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          position: 'relative',
          boxSizing: 'border-box',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab bar */}
        <div
          style={{
            width: '40px',
            height: '4px',
            borderRadius: '999px',
            background: 'var(--line, #CBD5E1)',
            margin: '0 auto 16px'
          }}
        />

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--ink, #0F172A)' }}>
              Trip Ticket & Pass
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--muted, #64748B)', fontWeight: 600 }}>
              Booking ID: {trip.id} · OTP: {otp}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'var(--field, #F1F5F9)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--ink, #0F172A)'
            }}
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Ticket Image Preview Container */}
        <div
          style={{
            background: '#FAF8F5',
            borderRadius: '18px',
            border: '1.5px solid var(--line, #E2E8F0)',
            padding: '12px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '260px',
            position: 'relative'
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--muted, #64748B)' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  border: '3px solid var(--line, #CBD5E1)',
                  borderTopColor: '#FFC70A',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  margin: '0 auto 12px'
                }}
              />
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Generating ticket pass...</span>
            </div>
          ) : ticketData?.dataUrl ? (
            <img
              src={ticketData.dataUrl}
              alt={`Trip Ticket ${trip.id}`}
              style={{
                width: '100%',
                maxHeight: '340px',
                objectFit: 'contain',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
              }}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: '#EF4444' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Could not render ticket image preview.</span>
            </div>
          )}
        </div>

        {/* Action Buttons Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Primary Button: Share Image (Native / WhatsApp) */}
          <button
            type="button"
            onClick={handleShareImage}
            className="btn"
            style={{
              height: '50px',
              borderRadius: '14px',
              background: '#25D366',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '14.5px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 4px 16px rgba(37, 211, 102, 0.3)',
              cursor: 'pointer'
            }}
          >
            <Icon name="whatsapp" size={20} />
            <span>Share Ticket Image</span>
          </button>

          {/* Secondary Buttons Row: Download Image & Copy Details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              type="button"
              onClick={handleDownload}
              className="btn"
              style={{
                height: '46px',
                borderRadius: '14px',
                background: 'var(--field, #F1F5F9)',
                border: '1.5px solid var(--line, #CBD5E1)',
                color: 'var(--ink, #0F172A)',
                fontSize: '13px',
                fontWeight: 750,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <Icon name="route" size={16} />
              <span>Download PNG</span>
            </button>

            <button
              type="button"
              onClick={handleCopyDetails}
              className="btn"
              style={{
                height: '46px',
                borderRadius: '14px',
                background: copied ? 'rgba(34, 197, 94, 0.1)' : 'var(--field, #F1F5F9)',
                border: copied ? '1.5px solid #22C55E' : '1.5px solid var(--line, #CBD5E1)',
                color: copied ? '#16A34A' : 'var(--ink, #0F172A)',
                fontSize: '13px',
                fontWeight: 750,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <Icon name={copied ? 'check' : 'share'} size={16} />
              <span>{copied ? 'Copied!' : 'Copy Details'}</span>
            </button>
          </div>

          {/* Fallback Option: Share Full Text to WhatsApp */}
          <button
            type="button"
            onClick={handleWhatsAppText}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted, #64748B)',
              fontSize: '12px',
              fontWeight: 650,
              textDecoration: 'underline',
              cursor: 'pointer',
              marginTop: '4px'
            }}
          >
            Send text summary with live GPS link to WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
