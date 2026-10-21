import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import Icon from './Icon';
import GraphicLiveMap from './GraphicLiveMap';
import { openInGoogleMaps } from '../services/googleMapsService';
import ContactProfileCard from './ContactProfileCard';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { generateTripTicketImage } from '../utils/tripTicketGenerator';
import { shareTicketImageWithCaption } from '../services/installedUpiService';
import { playNativeAlertChime } from '../services/pushNotificationService';
import TripTicketModal from './TripTicketModal';
import { cleanLocationName, getLocationUpToFirstComma } from '../utils/locationCleaner';
import { realtime } from '../utils/realtime';

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = ((Number(lat2) - Number(lat1)) * Math.PI) / 180;
  const dLon = ((Number(lon2) - Number(lon1)) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((Number(lat1) * Math.PI) / 180) *
      Math.cos((Number(lat2) * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

export default function LiveTrackingSheet() {
  const {
    liveTrackingOpen,
    setLiveTrackingOpen,
    trips,
    setTrips,
    user,
    updateUserProfile,
    addToast,
    activeTrackingTripId,
    setActiveTrackingTripId,
    isUserTrip,
    declineTrip,
    cancelTripByUser,
    setTripToCancel
  } = useApp();

  const isClientTrip = (t) => {
    if (!t) return false;
    if (!user) return true;
    if (isUserTrip && isUserTrip(t, user)) return true;
    const uPhone = String(user.phone || '').replace(/\D/g, '');
    const tPhone = String(t.rider?.phone || '').replace(/\D/g, '');
    if (uPhone && tPhone && (uPhone.endsWith(tPhone.slice(-10)) || tPhone.endsWith(uPhone.slice(-10)))) return true;
    return false;
  };

  const activeTrip = (activeTrackingTripId ? trips.find(t => t.id === activeTrackingTripId && !['completed', 'cancelled', 'invoice_pending', 'ending_otp'].includes(t.status)) : null) ||
                     trips.find(t => isClientTrip(t) && t.status === 'inprogress') ||
                     trips.find(t => isClientTrip(t) && ['accepted', 'pickup_arrived', 'ready_to_start'].includes(t.status)) ||
                     trips.find(t => isClientTrip(t) && t.status === 'requested');

  const trip = activeTrip;
  const isStarted = trip?.status === 'inprogress';
  const isDriverAssigned = ['accepted', 'pickup_arrived', 'ready_to_start'].includes(trip?.status);
  const isArrived = trip?.status === 'pickup_arrived';
  const isReady = trip?.status === 'ready_to_start';
  const isAccepted = trip?.status === 'accepted';
  const isWaiting = trip?.status === 'requested';

  // Real-Time GPS Tracking State (Driven strictly by real driver mobile GPS stream)
  const [liveDriverGps, setLiveDriverGps] = useState(() => trip?.driverCoords || null);
  const [liveDriverHeading, setLiveDriverHeading] = useState(() => trip?.driverHeading || 0);
  const [liveDriverSpeed, setLiveDriverSpeed] = useState(() => trip?.driverSpeed || 0);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showSosModal, setShowSosModal] = useState(false);
  const [showSetSecondaryModal, setShowSetSecondaryModal] = useState(false);
  const [secondaryPhoneInput, setSecondaryPhoneInput] = useState('');
  const [sosData, setSosData] = useState(null);

  // Sync state if trip props update
  useEffect(() => {
    if (trip?.driverCoords?.lat && trip?.driverCoords?.lng) {
      setLiveDriverGps(trip.driverCoords);
    }
    if (trip?.driverHeading !== undefined) {
      setLiveDriverHeading(trip.driverHeading);
    }
    if (trip?.driverSpeed !== undefined) {
      setLiveDriverSpeed(trip.driverSpeed);
    }
  }, [trip?.driverCoords?.lat, trip?.driverCoords?.lng, trip?.driverHeading, trip?.driverSpeed]);

  // Subscribe to real-time mobile GPS location updates from Driver App
  useEffect(() => {
    if (!liveTrackingOpen || !trip?.id) return;
    const unbind = realtime.on('LOCATION_UPDATE', (telemetry) => {
      if (telemetry?.tripId && String(telemetry.tripId) === String(trip.id)) {
        if (telemetry.lat && telemetry.lng) {
          setLiveDriverGps({ lat: Number(telemetry.lat), lng: Number(telemetry.lng) });
        }
        if (telemetry.heading !== undefined) setLiveDriverHeading(Number(telemetry.heading));
        if (telemetry.speed !== undefined) setLiveDriverSpeed(Number(telemetry.speed));
      }
    });

    return () => {
      if (typeof unbind === 'function') unbind();
    };
  }, [liveTrackingOpen, trip?.id]);

  // Calculate Real-Time GPS Distance & ETA
  const currentCoords = liveDriverGps || trip?.driverCoords;
  const targetCoords = isDriverAssigned ? trip?.pickupCoords : trip?.dropCoords;

  const realDistanceKm = useMemo(() => {
    if (currentCoords?.lat && currentCoords?.lng && targetCoords?.lat && targetCoords?.lng) {
      return calculateDistanceKm(currentCoords.lat, currentCoords.lng, targetCoords.lat, targetCoords.lng);
    }
    return trip?.distanceKm ? Number(trip.distanceKm) : null;
  }, [currentCoords?.lat, currentCoords?.lng, targetCoords?.lat, targetCoords?.lng, trip?.distanceKm]);

  const distLeft = realDistanceKm !== null
    ? `${realDistanceKm.toFixed(1)} km`
    : (trip?.distanceText || '2.8 km');

  const etaMins = useMemo(() => {
    if (realDistanceKm !== null) {
      if (liveDriverSpeed > 10) {
        return Math.max(1, Math.round((realDistanceKm / liveDriverSpeed) * 60));
      }
      return Math.max(1, Math.round((realDistanceKm / 28) * 60)); // ~28 km/h city average
    }
    return trip?.durationMins || 12;
  }, [realDistanceKm, liveDriverSpeed, trip?.durationMins]);

  const liveSpeed = Math.round(liveDriverSpeed);

  // Live trip object passed to Map ensuring driver marker uses real GPS
  const liveTripData = useMemo(() => ({
    ...trip,
    driverCoords: currentCoords,
    driverHeading: liveDriverHeading,
    driverSpeed: liveDriverSpeed
  }), [trip, currentCoords, liveDriverHeading, liveDriverSpeed]);

  // Auto-close and remove tracking popup immediately if the trip ended, completed, or cancelled
  useEffect(() => {
    if (!activeTrip || ['completed', 'cancelled', 'invoice_pending', 'ending_otp'].includes(activeTrip?.status)) {
      if (liveTrackingOpen) {
        setLiveTrackingOpen(false);
        if (setActiveTrackingTripId) setActiveTrackingTripId(null);
      }
    }
  }, [activeTrip, activeTrip?.status, liveTrackingOpen, setLiveTrackingOpen, setActiveTrackingTripId]);

  // Real nearing destination alert when driver GPS is within 800 meters
  useEffect(() => {
    if (!liveTrackingOpen || !trip) return;
    if (isStarted && realDistanceKm !== null && realDistanceKm <= 0.8 && !trip.approachingNotified) {
      setTrips(prev =>
        prev.map(t => (t.id === trip.id ? { ...t, approachingNotified: true } : t))
      );
      addToast('Approaching destination (~800m). Trip will complete shortly.', 'info');
    }
  }, [liveTrackingOpen, isStarted, realDistanceKm, trip?.id, trip?.approachingNotified]);

  if (!liveTrackingOpen || !activeTrip || ['completed', 'cancelled', 'invoice_pending', 'ending_otp'].includes(activeTrip.status)) {
    return null;
  }

  // 1. Share Trip Details (Generates ticket image + formatted text message and shares via Native/WhatsApp/Web)
  const handleShareTrip = async () => {
    if (!trip) return;
    setIsSharing(true);
    if (addToast) addToast('Preparing ride details & ticket for sharing...', 'info');

    try {
      const ticketRes = await generateTripTicketImage(trip);
      const driverName =
        (typeof trip.driver === 'string' ? trip.driver : trip.driver?.name) ||
        trip.driverObj?.name ||
        'Assigned Driver';
      const driverPhone =
        trip.driverObj?.phone ||
        (typeof trip.driver === 'object' ? trip.driver?.phone : null) ||
        trip.driverPhone ||
        trip.car?.driverPhone ||
        '';
      const pickupLoc = cleanLocationName(trip.pickup) || 'Pickup Location';
      const dropLoc = cleanLocationName(trip.drop_loc) || 'City Destination';
      const fare = Number(trip.fare) || 750;
      const otp = String(trip.startOtp || trip.otp || '').trim();
      const trackUrl = `https://ridingo.app/track/${trip.id}`;

      const shareText = `🚗 Ridingo Driver Trip Details
Trip ID: ${trip.id}
━━━━━━━━━━━━━━━━━━━━
📍 From (Pickup): ${pickupLoc}
🏁 To (Destination): ${dropLoc}
👤 Assigned Driver: ${driverName}
${driverPhone ? `📞 Driver Mobile: ${driverPhone}\n` : ''}💰 Total Fare: ₹${fare}
${otp ? `🔑 Trip Pickup OTP: ${otp}\n` : ''}━━━━━━━━━━━━━━━━━━━━
Live GPS Tracking: ${trackUrl}`;

      let shared = false;

      // A. First Priority: Direct Native WhatsApp image + caption sender
      if (Capacitor.isNativePlatform() && ticketRes?.dataUrl) {
        try {
          const sent = await shareTicketImageWithCaption({
            base64Data: ticketRes.dataUrl,
            caption: shareText,
            targetApp: 'whatsapp'
          });
          if (sent) {
            if (addToast) addToast('Trip details shared successfully!', 'check');
            shared = true;
          }
        } catch (nativeShareErr) {
          console.warn('[LiveTrackingSheet] shareTicketImageWithCaption note:', nativeShareErr);
        }
      }

      // B. Mobile Native via Capacitor Filesystem + Share Fallback
      if (!shared && Capacitor.isNativePlatform() && ticketRes?.dataUrl) {
        try {
          const base64Data = ticketRes.dataUrl.split(',')[1];
          const fileName = `ridingo_ticket_${trip.id}.png`;
          const savedFile = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Cache
          });

          await Share.share({
            text: shareText,
            files: [savedFile.uri],
            dialogTitle: 'Share Ride Details'
          });
          if (addToast) addToast('Trip details shared!', 'check');
          shared = true;
        } catch (capErr) {
          if (capErr?.message?.toLowerCase().includes('cancel')) {
            setIsSharing(false);
            return;
          }
          console.warn('[LiveTrackingSheet] Capacitor native share note:', capErr);
          try {
            await Share.share({
              title: `Ridingo Ticket · ${trip.id}`,
              text: shareText,
              url: trackUrl,
              dialogTitle: 'Share Trip Details'
            });
            if (addToast) addToast('Trip details shared!', 'check');
            shared = true;
          } catch (capTextErr) {
            console.warn('[LiveTrackingSheet] Native text share note:', capTextErr);
          }
        }
      }

      // C. Web Share API with File
      if (
        !shared &&
        ticketRes?.file &&
        typeof navigator !== 'undefined' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [ticketRes.file] })
      ) {
        try {
          await navigator.share({
            files: [ticketRes.file],
            text: shareText
          });
          if (addToast) addToast('Trip details shared successfully!', 'check');
          shared = true;
        } catch (webFileErr) {
          if (webFileErr?.name === 'AbortError') {
            setIsSharing(false);
            return;
          }
          console.warn('[LiveTrackingSheet] Web file share note:', webFileErr);
        }
      }

      // D. Web Share API with Text only
      if (!shared && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          await navigator.share({
            title: `Ridingo Ticket · ${trip.id}`,
            text: shareText,
            url: trackUrl
          });
          if (addToast) addToast('Trip details shared!', 'check');
          shared = true;
        } catch (webTextErr) {
          if (webTextErr?.name === 'AbortError') {
            setIsSharing(false);
            return;
          }
        }
      }

      // E. Desktop / Web Fallback: Clipboard copy & open Ticket modal preview
      if (!shared) {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(shareText);
        }
        setTicketModalOpen(true);
        if (addToast) addToast('Details copied to clipboard! Ticket preview opened.', 'check');
      }
    } catch (err) {
      console.error('[LiveTrackingSheet] Share error:', err);
      setTicketModalOpen(true);
    } finally {
      setIsSharing(false);
    }
  };

  // 2. Emergency SOS: Sends emergency text message with live GPS to registered secondary mobile number
  const getRegisteredEmergencyPhone = () => {
    return (
      user?.emergencyPhone ||
      user?.preferences?.emergencyPhone ||
      user?.sosContacts?.[0]?.phone ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem('ridingo_emergency_phone') : null) ||
      ''
    );
  };

  const executeSendSos = (targetPhone) => {
    if (!trip) return;
    const cleanDigits = String(targetPhone || '').replace(/\D/g, '').slice(-10);
    if (!cleanDigits || cleanDigits.length < 10) {
      setSecondaryPhoneInput(targetPhone || '');
      setShowSetSecondaryModal(true);
      return;
    }

    const driverName =
      (typeof trip.driver === 'string' ? trip.driver : trip.driver?.name) ||
      trip.driverObj?.name ||
      'Assigned Driver';
    const driverPhone =
      trip.driverObj?.phone ||
      (typeof trip.driver === 'object' ? trip.driver?.phone : null) ||
      trip.driverPhone ||
      '';
    const pickupLoc = cleanLocationName(trip.pickup) || 'Pickup Location';
    const dropLoc = cleanLocationName(trip.drop_loc) || 'Destination';
    const vehiclePlate = trip.car?.plate || trip.car?.model || trip.trans || 'Cab';
    const gpsUrl = currentCoords?.lat && currentCoords?.lng
      ? `https://maps.google.com/?q=${currentCoords.lat.toFixed(5)},${currentCoords.lng.toFixed(5)}`
      : 'https://maps.google.com';
    const trackUrl = `https://ridingo.app/track/${trip.id}`;

    const sosMessage = `🚨 EMERGENCY SOS ALERT from Ridingo Passenger 🚨
Passenger: ${user?.name || 'Customer'} (${user?.phone || 'Passenger'})
Trip ID: ${trip.id}
Status: IN-RIDE EMERGENCY! Urgent assistance needed!

📍 Pickup: ${pickupLoc}
🏁 Destination: ${dropLoc}
👤 Driver: ${driverName}
📞 Driver Mobile: ${driverPhone || 'Not available'}
🚘 Vehicle: ${vehiclePlate}

📍 Live Passenger GPS Location:
${gpsUrl}

🔗 Live Ride Tracking Link:
${trackUrl}

Please contact the passenger or emergency services (112) immediately!`;

    // A. Trigger tactile haptics & alert chime
    try {
      playNativeAlertChime('alert');
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([300, 150, 300, 150, 600]);
      }
    } catch (_) {}

    // B. Realtime emergency alert broadcast
    try {
      realtime.emit('EMERGENCY_SOS', {
        tripId: trip.id,
        user: { name: user?.name, phone: user?.phone, emergencyPhone: cleanDigits },
        driver: { name: driverName, phone: driverPhone },
        coords: currentCoords,
        timestamp: Date.now()
      });
    } catch (_) {}

    // C. Open SMS app directly addressed to registered secondary mobile number with prefilled message
    const formattedSmsTarget = `+91${cleanDigits}`;
    const smsUri = `sms:${formattedSmsTarget}?&body=${encodeURIComponent(sosMessage)}`;
    try {
      window.open(smsUri, '_system');
    } catch (_) {
      try {
        window.location.href = smsUri;
      } catch (_) {}
    }

    setSosData({
      phone: cleanDigits,
      formattedPhone: formattedSmsTarget,
      message: sosMessage
    });
    setShowSosModal(true);

    if (addToast) {
      addToast(`🚨 SOS message opened for secondary mobile: ${formattedSmsTarget}`, 'error');
    }
  };

  const handleSos = () => {
    const registeredPhone = getRegisteredEmergencyPhone();
    if (!registeredPhone || registeredPhone.replace(/\D/g, '').length < 10) {
      setSecondaryPhoneInput(registeredPhone || '');
      setShowSetSecondaryModal(true);
    } else {
      executeSendSos(registeredPhone);
    }
  };

  const driverPhone = trip?.driverObj?.phone || trip?.driverPhone || '+91 94471 23456';

  const handleCall = () => {
    window.open(`tel:${driverPhone.replace(/[^\d+]/g, '')}`, '_system');
  };

  const handleChat = () => {
    const cleanNum = driverPhone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanNum}?text=${encodeURIComponent(`Hi ${trip.driver || 'Driver'}, regarding Ridingo trip ${trip.id}`)}`, '_blank');
  };

  const driverName =
    (typeof trip?.driver === 'string' ? trip.driver : trip?.driver?.name) ||
    trip?.driverObj?.name ||
    'Suresh K.';

  const driverInitials = (() => {
    if (!driverName) return 'SK';
    const parts = driverName.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return driverName.slice(0, 2).toUpperCase();
  })();

  const driverRating = trip.driverRating || trip.driverObj?.rating || '4.9';
  const driverTripsCount = trip.driverTripsCount || trip.driverObj?.totalTrips || '312';
  const driverLanguages = trip.driverLanguages || 'Drives automatic · Speaks Malayalam, English';
  const otpDisplay = String(trip.startOtp || trip.otp || '4821').trim();

  return (
    <div
      className="layer on"
      id="u-tracking-layer"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: '#E5E3DF',
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
      }}
    >
      {/* 1. Fullscreen Background Graphic Map */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <GraphicLiveMap
          trip={liveTripData}
          isModal={false}
          height="100%"
          style={{ borderRadius: 0, border: 'none' }}
        />
      </div>

      {/* 2. Top-Left Floating Circular Back Button */}
      <button
        type="button"
        onClick={() => {
          setLiveTrackingOpen(false);
          if (setActiveTrackingTripId) setActiveTrackingTripId(null);
        }}
        style={{
          position: 'absolute',
          top: 'calc(16px + env(safe-area-inset-top, 0px))',
          left: '16px',
          width: '46px',
          height: '46px',
          borderRadius: '50%',
          background: '#FFFFFF',
          border: 'none',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.14)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 20,
          color: '#111827',
          transition: 'transform 0.15s ease'
        }}
        aria-label="Back"
      >
        <Icon name="chevron-left" size={24} />
      </button>

      {/* 3. Top-Right Floating Capsule "Live GPS" Badge */}
      <div
        style={{
          position: 'absolute',
          top: 'calc(16px + env(safe-area-inset-top, 0px))',
          right: '16px',
          padding: '8px 16px',
          borderRadius: '999px',
          background: '#FFFFFF',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.14)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          fontWeight: 800,
          color: '#111827',
          zIndex: 20
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#16A34A',
            display: 'inline-block',
            boxShadow: '0 0 0 2px rgba(22, 163, 74, 0.25)'
          }}
        />
        <span>Live GPS</span>
      </div>

      {/* 4. Bottom Sliding Popup Sheet */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 30,
          background: '#FFFFFF',
          borderTopLeftRadius: '28px',
          borderTopRightRadius: '28px',
          boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.14)',
          padding: '12px 20px calc(18px + env(safe-area-inset-bottom, 12px))',
          maxHeight: '70vh',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          boxSizing: 'border-box'
        }}
      >
        {/* Drag Handle Indicator */}
        <div
          style={{
            width: '42px',
            height: '4px',
            background: '#D1D5DB',
            borderRadius: '999px',
            margin: '0 auto 14px'
          }}
        />

        {isWaiting ? (
          /* ==========================================================
             A. WAITING FOR DRIVER SEARCH VIEW
             ========================================================== */
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#D97706' }}>Searching driver</div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#111827', letterSpacing: '-0.5px', marginTop: '2px' }}>
                  Finding your driver...
                </div>
              </div>
              <div
                style={{
                  background: '#FEF3C7',
                  color: '#92400E',
                  padding: '6px 14px',
                  borderRadius: '999px',
                  fontSize: '13px',
                  fontWeight: 800
                }}
              >
                ₹{trip?.fare || 600}
              </div>
            </div>

            <div style={{ fontSize: '13px', color: '#4B5563', padding: '12px 14px', background: '#F8FAFC', borderRadius: '14px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16A34A', flexShrink: 0 }} />
                <span><b>Pickup:</b> {getLocationUpToFirstComma(trip?.pickup)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', flexShrink: 0 }} />
                <span><b>Drop:</b> {getLocationUpToFirstComma(trip?.drop_loc)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (cancelTripByUser) {
                  cancelTripByUser(trip.id, { feeOverride: 0 });
                } else if (declineTrip) {
                  declineTrip(trip.id);
                } else {
                  setTrips(prev => prev.filter(t => t.id !== trip.id));
                }
                if (setActiveTrackingTripId) setActiveTrackingTripId(null);
                setLiveTrackingOpen(false);
                if (addToast) addToast('Trip request cancelled freely.', 'check');
              }}
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '14px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1.5px solid rgba(239, 68, 68, 0.28)',
                color: '#DC2626',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Cancel Request
            </button>
          </div>
        ) : isStarted ? (
          /* ==========================================================
             B. TRIP IN PROGRESS VIEW
             ========================================================== */
          <div>
            {/* Status & ETA Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#16A34A' }}>Trip in progress</div>
                <div style={{ fontSize: '26px', fontWeight: 900, color: '#111827', letterSpacing: '-0.5px', marginTop: '2px' }}>
                  {etaMins} min away
                </div>
              </div>
              <div
                style={{
                  background: '#FEF3C7',
                  color: '#92400E',
                  padding: '6px 14px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 800
                }}
              >
                {distLeft} to drop
              </div>
            </div>

            {/* Route Summary Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748B', marginBottom: '12px', padding: '8px 12px', background: '#F8FAFC', borderRadius: '12px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', flexShrink: 0 }} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Destination: <b>{getLocationUpToFirstComma(trip?.drop_loc)}</b>
              </span>
              <span style={{ marginLeft: 'auto', fontWeight: 700, color: '#111827' }}>{liveSpeed} km/h</span>
            </div>

            {/* Driver Details Card */}
            <div
              style={{
                border: '1.5px solid #F1F5F9',
                borderRadius: '20px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
                background: '#FFFFFF',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    border: '2.5px solid #F59E0B',
                    background: '#FFFBEB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '16px',
                    color: '#1E293B',
                    flexShrink: 0
                  }}
                >
                  {driverInitials}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {driverName}
                    </span>
                    <span
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        background: '#16A34A',
                        color: '#FFFFFF',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: 900,
                        flexShrink: 0
                      }}
                    >
                      ✓
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginTop: '2px' }}>
                    {driverRating} rating · {driverTripsCount} trips
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {driverLanguages}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={handleCall}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    border: '1.5px solid #E2E8F0',
                    background: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#111827'
                  }}
                  aria-label="Call Driver"
                >
                  <Icon name="phone" size={18} />
                </button>

                <button
                  type="button"
                  onClick={handleChat}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: '#128C7E',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#FFFFFF'
                  }}
                  aria-label="WhatsApp Driver"
                >
                  <Icon name="message-circle" size={20} color="#FFFFFF" />
                </button>
              </div>
            </div>

            {/* Action Buttons: Share trip & Emergency SOS */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <button
                type="button"
                onClick={handleShareTrip}
                disabled={isSharing}
                style={{
                  flex: 1,
                  height: '48px',
                  borderRadius: '14px',
                  border: '1.5px solid #111827',
                  background: '#FFFFFF',
                  color: '#111827',
                  fontSize: '14px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                <Icon name="share" size={17} />
                <span>{isSharing ? 'Sharing...' : 'Share trip'}</span>
              </button>

              <button
                type="button"
                onClick={handleSos}
                style={{
                  flex: 1.15,
                  height: '48px',
                  borderRadius: '14px',
                  background: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(220, 38, 38, 0.3)'
                }}
              >
                <Icon name="alert-triangle" size={17} color="#FFFFFF" />
                <span>Emergency SOS</span>
              </button>
            </div>
          </div>
        ) : (
          /* ==========================================================
             C. DRIVER ARRIVING / ACCEPTED VIEW (MATCHES SCREENSHOT 2)
             ========================================================== */
          <div>
            {/* Status & ETA Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#6B7280' }}>
                  {isArrived ? 'Driver arrived' : 'Driver arriving'}
                </div>
                <div style={{ fontSize: '26px', fontWeight: 900, color: '#111827', letterSpacing: '-0.5px', marginTop: '2px' }}>
                  {isArrived ? 'At pickup location' : `${etaMins || 8} min away`}
                </div>
              </div>
              <div
                style={{
                  background: '#FEF3C7',
                  color: '#92400E',
                  padding: '6px 14px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 800
                }}
              >
                {isArrived ? '0.0 km to pickup' : `${distLeft || '2.1 km'} to pickup`}
              </div>
            </div>

            {/* Pitch Black Pickup OTP Card */}
            <div
              style={{
                background: '#0F172A',
                color: '#FFFFFF',
                borderRadius: '18px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
                boxShadow: '0 4px 16px rgba(15, 23, 42, 0.2)'
              }}
            >
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF' }}>Your pickup OTP</div>
                <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>Tell the driver only when they arrive</div>
              </div>
              <div style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '6px', color: '#FFFFFF', fontFamily: 'monospace' }}>
                {otpDisplay.split('').join(' ')}
              </div>
            </div>

            {/* Driver Details Card */}
            <div
              style={{
                border: '1.5px solid #F1F5F9',
                borderRadius: '20px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
                background: '#FFFFFF',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                {/* Circle Avatar with gold border */}
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    border: '2.5px solid #F59E0B',
                    background: '#FFFBEB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '16px',
                    color: '#1E293B',
                    flexShrink: 0
                  }}
                >
                  {driverInitials}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {driverName}
                    </span>
                    <span
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        background: '#16A34A',
                        color: '#FFFFFF',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: 900,
                        flexShrink: 0
                      }}
                    >
                      ✓
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginTop: '2px' }}>
                    {driverRating} rating · {driverTripsCount} trips
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {driverLanguages}
                  </div>
                </div>
              </div>

              {/* Call & WhatsApp Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={handleCall}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    border: '1.5px solid #E2E8F0',
                    background: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#111827'
                  }}
                  aria-label="Call Driver"
                >
                  <Icon name="phone" size={18} />
                </button>

                <button
                  type="button"
                  onClick={handleChat}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: '#128C7E',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#FFFFFF'
                  }}
                  aria-label="WhatsApp Driver"
                >
                  <Icon name="message-circle" size={20} color="#FFFFFF" />
                </button>
              </div>
            </div>

            {/* Action Buttons: Share trip & Emergency SOS */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <button
                type="button"
                onClick={handleShareTrip}
                disabled={isSharing}
                style={{
                  flex: 1,
                  height: '48px',
                  borderRadius: '14px',
                  border: '1.5px solid #111827',
                  background: '#FFFFFF',
                  color: '#111827',
                  fontSize: '14px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                <Icon name="share" size={17} />
                <span>{isSharing ? 'Sharing...' : 'Share trip'}</span>
              </button>

              <button
                type="button"
                onClick={handleSos}
                style={{
                  flex: 1.15,
                  height: '48px',
                  borderRadius: '14px',
                  background: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(220, 38, 38, 0.3)'
                }}
              >
                <Icon name="alert-triangle" size={17} color="#FFFFFF" />
                <span>Emergency SOS</span>
              </button>
            </div>

            {/* Cancel trip link */}
            <div style={{ textAlign: 'center', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => {
                  if (setTripToCancel) {
                    setTripToCancel(trip);
                  } else if (cancelTripByUser) {
                    cancelTripByUser(trip.id);
                  }
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '6px 12px'
                }}
              >
                Cancel trip
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Trip Ticket Modal with filled image preview, direct image share, download, and copy */}
      <TripTicketModal
        trip={trip}
        isOpen={ticketModalOpen}
        onClose={() => setTicketModalOpen(false)}
        addToast={addToast}
      />

      {/* =========================================================
          EMERGENCY SOS ACTIVE MODAL
          Direct 1-tap SMS, WhatsApp, and Phone Call to Secondary Number & 112
          ========================================================= */}
      {showSosModal && sosData && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100010,
            background: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: 0,
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => setShowSosModal(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '480px',
              background: 'var(--card, #FFFFFF)',
              borderTopLeftRadius: '28px',
              borderTopRightRadius: '28px',
              padding: '24px 20px calc(24px + env(safe-area-inset-bottom, 12px))',
              boxShadow: '0 -16px 48px rgba(239, 68, 68, 0.25)',
              borderTop: '3px solid #EF4444',
              boxSizing: 'border-box',
              animation: 'slideUpFromBottom 0.28s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header Badge */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: '#FEE2E2',
                    color: '#DC2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 0 4px rgba(239, 68, 68, 0.2)'
                  }}
                >
                  <Icon name="alert-triangle" size={22} color="#DC2626" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#DC2626' }}>
                    Emergency SOS Active
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>
                    Live GPS and driver details dispatched
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSosModal(false)}
                style={{
                  background: 'var(--field)',
                  border: '1px solid var(--line)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--ink)'
                }}
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            {/* Target Secondary Number Banner */}
            <div
              style={{
                background: 'var(--field, #F8FAFC)',
                border: '1.5px solid var(--line)',
                borderRadius: '16px',
                padding: '12px 16px',
                marginBottom: '16px'
              }}
            >
              <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.04em' }}>
                Registered Secondary Mobile
              </div>
              <div style={{ fontSize: '18px', fontWeight: 850, color: 'var(--ink)', marginTop: '2px', fontFamily: 'monospace' }}>
                +91 {sosData.phone}
              </div>
              <div style={{ fontSize: '11.5px', color: '#16A34A', fontWeight: 600, marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Icon name="check" size={13} color="#16A34A" />
                <span>SMS app opened with live GPS &amp; trip tracking link</span>
              </div>
            </div>

            {/* 1-Tap Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Resend via SMS */}
              <button
                type="button"
                onClick={() => {
                  const smsUri = `sms:+91${sosData.phone}?&body=${encodeURIComponent(sosData.message)}`;
                  window.open(smsUri, '_system');
                }}
                style={{
                  width: '100%',
                  height: '48px',
                  borderRadius: '14px',
                  background: 'var(--ink, #000000)',
                  color: 'var(--card, #FFFFFF)',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 750,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                <Icon name="message-square" size={16} color="#FFFFFF" />
                <span>Send Emergency SMS (+91 {sosData.phone})</span>
              </button>

              {/* Send via WhatsApp */}
              <button
                type="button"
                onClick={() => {
                  const waUrl = `https://wa.me/91${sosData.phone}?text=${encodeURIComponent(sosData.message)}`;
                  window.open(waUrl, '_blank');
                }}
                style={{
                  width: '100%',
                  height: '48px',
                  borderRadius: '14px',
                  background: '#25D366',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 750,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(37, 211, 102, 0.3)'
                }}
              >
                <Icon name="message-circle" size={16} color="#FFFFFF" />
                <span>Send via WhatsApp (+91 {sosData.phone})</span>
              </button>

              {/* Call Secondary Contact & Call 112 Row */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    window.open(`tel:+91${sosData.phone}`, '_system');
                  }}
                  style={{
                    flex: 1,
                    height: '46px',
                    borderRadius: '14px',
                    background: 'var(--card, #FFFFFF)',
                    color: 'var(--ink)',
                    border: '1.5px solid var(--line-strong)',
                    fontSize: '13px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <Icon name="phone" size={15} />
                  <span>Call Contact</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    window.open('tel:112', '_system');
                  }}
                  style={{
                    flex: 1,
                    height: '46px',
                    borderRadius: '14px',
                    background: '#EF4444',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    boxShadow: '0 3px 12px rgba(239, 68, 68, 0.3)'
                  }}
                >
                  <Icon name="phone" size={15} color="#FFFFFF" />
                  <span>Call Police (112)</span>
                </button>
              </div>

              {/* Change secondary number option */}
              <button
                type="button"
                onClick={() => {
                  setShowSosModal(false);
                  setSecondaryPhoneInput(sosData.phone);
                  setShowSetSecondaryModal(true);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--muted)',
                  fontSize: '12px',
                  fontWeight: 650,
                  marginTop: '4px',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Change Secondary Mobile Number
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          REGISTER / SET SECONDARY EMERGENCY MOBILE MODAL
          ========================================================= */}
      {showSetSecondaryModal && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100010,
            background: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: 0,
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => setShowSetSecondaryModal(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '480px',
              background: 'var(--card, #FFFFFF)',
              borderTopLeftRadius: '28px',
              borderTopRightRadius: '28px',
              padding: '24px 20px calc(24px + env(safe-area-inset-bottom, 12px))',
              boxShadow: '0 -16px 48px rgba(0, 0, 0, 0.3)',
              borderTop: '3px solid #EF4444',
              boxSizing: 'border-box',
              animation: 'slideUpFromBottom 0.28s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: '#FEE2E2',
                    color: '#DC2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Icon name="shield" size={20} color="#DC2626" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--ink)' }}>
                    Secondary Emergency Mobile
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 500 }}>
                    Enter registered contact for SOS alerts
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSetSecondaryModal(false)}
                style={{
                  background: 'var(--field)',
                  border: '1px solid var(--line)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--ink)'
                }}
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 16px', lineHeight: 1.45 }}>
              Please enter your trusted secondary mobile number. Whenever you tap <b>Emergency SOS</b>, a live emergency text message with your real-time GPS location and driver details is sent directly to this number.
            </p>

            {/* Mobile Input Field */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                height: '52px',
                borderRadius: '14px',
                border: '1.5px solid var(--line-strong)',
                background: 'var(--field)',
                overflow: 'hidden',
                marginBottom: '16px'
              }}
            >
              <span
                style={{
                  padding: '0 14px',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'var(--ink)',
                  borderRight: '1px solid var(--line)',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  background: 'var(--field-hover, #F1F5F9)'
                }}
              >
                +91
              </span>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="10-digit emergency mobile"
                value={secondaryPhoneInput}
                onChange={e => setSecondaryPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
                style={{
                  flex: 1,
                  height: '100%',
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  padding: '0 14px',
                  fontSize: '16px',
                  fontWeight: 700,
                  color: 'var(--ink)',
                  letterSpacing: '0.04em'
                }}
                autoFocus
              />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowSetSecondaryModal(false)}
                style={{
                  flex: 1,
                  height: '48px',
                  borderRadius: '14px',
                  background: 'var(--field)',
                  border: '1px solid var(--line)',
                  color: 'var(--ink)',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  const clean = secondaryPhoneInput.replace(/\D/g, '').slice(-10);
                  if (clean.length < 10) {
                    if (addToast) addToast('Please enter a valid 10-digit mobile number', 'alert');
                    return;
                  }
                  if (updateUserProfile) {
                    updateUserProfile({ emergencyPhone: clean });
                  }
                  try {
                    localStorage.setItem('ridingo_emergency_phone', clean);
                  } catch (_) {}
                  setShowSetSecondaryModal(false);
                  executeSendSos(clean);
                }}
                style={{
                  flex: 1.6,
                  height: '48px',
                  borderRadius: '14px',
                  background: '#EF4444',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)'
                }}
              >
                Save &amp; Send SOS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
