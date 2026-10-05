import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Icon from './Icon';

export default function ProfileTab() {
  const { user, theme, setTheme, logout, addToast } = useApp();

  // Interactive toggle states (prefilled exactly as shown in screenshots)
  const [ridePinOn, setRidePinOn] = useState(true);
  const [shareLiveStatus, setShareLiveStatus] = useState(true);
  const [quietRideMode, setQuietRideMode] = useState(false);
  const [tripStatusAlerts, setTripStatusAlerts] = useState(true);
  const [whatsappSlip, setWhatsappSlip] = useState(true);
  const [rewardsAlerts, setRewardsAlerts] = useState(true);
  const [biometricLock, setBiometricLock] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);

  const handleEditProfile = () => {
    addToast('Profile edit: Name & contact details verified.', 'check');
  };

  const handleChangePin = () => {
    addToast('Ride Start PIN: 4821 (Change PIN modal triggered)', 'check');
  };

  const handleAction = (label, msg, icon = 'check') => {
    addToast(msg, icon);
  };

  return (
    <div style={{ paddingBottom: '32px' }}>
      {/* 1. Header */}
      <div className="hello" style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: 'var(--ink)' }}>
          Profile
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '4px', margin: 0 }}>
          Account & preferences
        </p>
      </div>

      {/* 2. User Profile Card */}
      <div className="card prof-card" style={{ padding: '16px', borderRadius: '20px', marginBottom: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
            {/* Avatar with Camera badge */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'var(--yellow)',
                  color: '#111827',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: 800,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}
              >
                {user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'AM'}
              </div>
              <div
                style={{
                  position: 'absolute',
                  bottom: -1,
                  right: -1,
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#111827',
                  border: '2px solid var(--card)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                onClick={handleEditProfile}
                title="Change Photo"
              >
                <Icon name="camera" size={11} />
              </div>
            </div>

            {/* User Meta */}
            <div style={{ minWidth: 0, flex: 1 }}>
              <b style={{ fontSize: '17px', fontWeight: 700, color: 'var(--ink)', display: 'block', lineHeight: 1.25 }}>
                {user?.name || 'Arjun Menon'}
              </b>
              <span style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: '3px', display: 'block', wordBreak: 'break-all' }}>
                {user?.phone || '+91 90000 12345'} · {user?.email || 'arjun.menon@example.com'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleEditProfile}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '6px 8px',
              fontSize: '14px',
              fontWeight: 700,
              color: 'var(--ink)',
              cursor: 'pointer'
            }}
          >
            Edit
          </button>
        </div>

        {/* Verified Owner & Member Since Badge Row */}
        <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              background: 'rgba(34, 197, 94, 0.14)',
              color: '#16A34A',
              fontSize: '11.5px',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '999px',
              display: 'inline-flex',
              alignItems: 'center',
              letterSpacing: '0.01em'
            }}
          >
            Verified Owner
          </span>
          <span style={{ fontSize: '12.5px', color: 'var(--muted)', fontWeight: 500 }}>
            Member since 2024
          </span>
        </div>
      </div>

      {/* 3. SAFETY & SECURITY */}
      <div className="prof-section-title">Safety & Security</div>
      <div className="card" style={{ padding: '0 16px', borderRadius: '18px', marginBottom: '20px' }}>
        {/* Row 1: Ride Start PIN */}
        <div className="prof-set-row">
          <div className="prof-set-info">
            <b className="prof-set-title">Ride Start PIN</b>
            <span className="prof-set-sub">PIN: {user?.pinCode || '4821'} · Driver verifies before departure</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={handleChangePin}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                fontSize: '13.5px',
                fontWeight: 700,
                color: 'var(--ink)',
                cursor: 'pointer'
              }}
            >
              Change
            </button>
            <button
              type="button"
              className={`ios-toggle ${ridePinOn ? 'on' : ''}`}
              onClick={() => {
                setRidePinOn(!ridePinOn);
                addToast(!ridePinOn ? 'Ride Start PIN enabled' : 'Ride Start PIN disabled', 'check');
              }}
              aria-label="Toggle Ride Start PIN"
            >
              <span className="ios-toggle-thumb" />
            </button>
          </div>
        </div>

        {/* Row 2: Share Live Trip Status */}
        <div className="prof-set-row">
          <div className="prof-set-info">
            <b className="prof-set-title">Share Live Trip Status</b>
            <span className="prof-set-sub">Auto-send live GPS link to your emergency contacts</span>
          </div>
          <button
            type="button"
            className={`ios-toggle ${shareLiveStatus ? 'on' : ''}`}
            onClick={() => {
              setShareLiveStatus(!shareLiveStatus);
              addToast(!shareLiveStatus ? 'Live trip sharing enabled' : 'Live trip sharing disabled', 'check');
            }}
            aria-label="Toggle Share Live Trip Status"
          >
            <span className="ios-toggle-thumb" />
          </button>
        </div>

        {/* Row 3: Emergency SOS Contacts */}
        <div
          className="prof-set-row"
          style={{ cursor: 'pointer' }}
          onClick={() => handleAction('SOS', '2 emergency contacts configured (Priya Menon, Vijay Menon)', 'shield')}
        >
          <div className="prof-set-info">
            <b className="prof-set-title">Emergency SOS Contacts</b>
            <span className="prof-set-sub">2 contacts configured for real-time alerts</span>
          </div>
          <div className="prof-set-action-btn">
            <span>Configured</span>
            <Icon name="chevronRight" size={15} />
          </div>
        </div>

        {/* Row 4: Trip Insurance Policy */}
        <div
          className="prof-set-row"
          style={{ cursor: 'pointer' }}
          onClick={() => handleAction('Insurance', 'Trip Insurance Policy: Standard ₹5 Lakhs on-trip active', 'shield')}
        >
          <div className="prof-set-info">
            <b className="prof-set-title">Trip Insurance Policy</b>
            <span className="prof-set-sub">Standard (₹5L) on-trip protection</span>
          </div>
          <div className="prof-set-action-btn">
            <span>Active</span>
            <Icon name="chevronRight" size={15} />
          </div>
        </div>
      </div>

      {/* 4. RIDE PREFERENCES */}
      <div className="prof-section-title">Ride Preferences</div>
      <div className="card" style={{ padding: '0 16px', borderRadius: '18px', marginBottom: '20px' }}>
        {/* Row 1: Quiet Ride Mode */}
        <div className="prof-set-row">
          <div className="prof-set-info">
            <b className="prof-set-title">Quiet Ride Mode</b>
            <span className="prof-set-sub">Driver keeps cabin quiet for calls and focus</span>
          </div>
          <button
            type="button"
            className={`ios-toggle ${quietRideMode ? 'on' : ''}`}
            onClick={() => {
              setQuietRideMode(!quietRideMode);
              addToast(!quietRideMode ? 'Quiet Ride Mode enabled' : 'Quiet Ride Mode disabled', 'check');
            }}
            aria-label="Toggle Quiet Ride Mode"
          >
            <span className="ios-toggle-thumb" />
          </button>
        </div>

        {/* Row 2: Cabin Temperature & AC */}
        <div
          className="prof-set-row"
          style={{ cursor: 'pointer' }}
          onClick={() => handleAction('AC', 'Cabin Temperature preference: 22°C (Chill) active', 'check')}
        >
          <div className="prof-set-info">
            <b className="prof-set-title">Cabin Temperature & AC</b>
            <span className="prof-set-sub">22°C (Chill) · Auto pre-cool upon arrival</span>
          </div>
          <div className="prof-set-action-btn">
            <span>Active</span>
            <Icon name="chevronRight" size={15} />
          </div>
        </div>

        {/* Row 3: Driver Language */}
        <div
          className="prof-set-row"
          style={{ cursor: 'pointer' }}
          onClick={() => handleAction('Language', 'Preferred Languages: English, Hindi, Malayalam', 'check')}
        >
          <div className="prof-set-info">
            <b className="prof-set-title">Driver Language</b>
            <span className="prof-set-sub">English, Hindi, Malayalam</span>
          </div>
          <div className="prof-set-action-btn">
            <span>3 Langs</span>
            <Icon name="chevronRight" size={15} />
          </div>
        </div>
      </div>

      {/* 5. NOTIFICATIONS */}
      <div className="prof-section-title">Notifications</div>
      <div className="card" style={{ padding: '0 16px', borderRadius: '18px', marginBottom: '20px' }}>
        {/* Row 1: Trip Status Alerts */}
        <div className="prof-set-row">
          <div className="prof-set-info">
            <b className="prof-set-title">Trip Status Alerts</b>
            <span className="prof-set-sub">Push alerts when driver is assigned & arrives</span>
          </div>
          <button
            type="button"
            className={`ios-toggle ${tripStatusAlerts ? 'on' : ''}`}
            onClick={() => {
              setTripStatusAlerts(!tripStatusAlerts);
              addToast(!tripStatusAlerts ? 'Trip status push alerts enabled' : 'Trip status push alerts disabled', 'check');
            }}
            aria-label="Toggle Trip Status Alerts"
          >
            <span className="ios-toggle-thumb" />
          </button>
        </div>

        {/* Row 2: WhatsApp Booking Slip */}
        <div className="prof-set-row">
          <div className="prof-set-info">
            <b className="prof-set-title">WhatsApp Booking Slip</b>
            <span className="prof-set-sub">Receive driver license & tracking on WhatsApp</span>
          </div>
          <button
            type="button"
            className={`ios-toggle ${whatsappSlip ? 'on' : ''}`}
            onClick={() => {
              setWhatsappSlip(!whatsappSlip);
              addToast(!whatsappSlip ? 'WhatsApp booking slips enabled' : 'WhatsApp booking slips disabled', 'check');
            }}
            aria-label="Toggle WhatsApp Booking Slip"
          >
            <span className="ios-toggle-thumb" />
          </button>
        </div>

        {/* Row 3: Rewards & Cashbacks */}
        <div className="prof-set-row">
          <div className="prof-set-info">
            <b className="prof-set-title">Rewards & Cashbacks</b>
            <span className="prof-set-sub">Alerts when trip cashback is added to wallet</span>
          </div>
          <button
            type="button"
            className={`ios-toggle ${rewardsAlerts ? 'on' : ''}`}
            onClick={() => {
              setRewardsAlerts(!rewardsAlerts);
              addToast(!rewardsAlerts ? 'Rewards alerts enabled' : 'Rewards alerts disabled', 'check');
            }}
            aria-label="Toggle Rewards & Cashbacks"
          >
            <span className="ios-toggle-thumb" />
          </button>
        </div>

        {/* Row 4: System Notification Test */}
        <div
          className="prof-set-row"
          style={{ cursor: 'pointer' }}
          onClick={() => handleAction('Test Alert', 'System notification test passed! Device is configured for alerts.', 'bell')}
        >
          <div className="prof-set-info">
            <b className="prof-set-title">System Notification Test</b>
            <span className="prof-set-sub">Verify device & browser native notification alerts</span>
          </div>
          <div className="prof-set-action-btn">
            <span>Test Alert</span>
            <Icon name="chevronRight" size={15} />
          </div>
        </div>
      </div>

      {/* 6. APP & PRIVACY */}
      <div className="prof-section-title">App & Privacy</div>
      <div className="card" style={{ padding: '0 16px', borderRadius: '18px', marginBottom: '20px' }}>
        {/* Row 1: Biometric / App Lock */}
        <div className="prof-set-row">
          <div className="prof-set-info">
            <b className="prof-set-title">Biometric / App Lock</b>
            <span className="prof-set-sub">Require Face ID or Fingerprint before booking</span>
          </div>
          <button
            type="button"
            className={`ios-toggle ${biometricLock ? 'on' : ''}`}
            onClick={() => {
              setBiometricLock(!biometricLock);
              addToast(!biometricLock ? 'Biometric security enabled' : 'Biometric security disabled', 'check');
            }}
            aria-label="Toggle Biometric / App Lock"
          >
            <span className="ios-toggle-thumb" />
          </button>
        </div>

        {/* Row 2: Haptic Feedback */}
        <div className="prof-set-row">
          <div className="prof-set-info">
            <b className="prof-set-title">Haptic Feedback</b>
            <span className="prof-set-sub">Subtle vibrations on taps and alerts</span>
          </div>
          <button
            type="button"
            className={`ios-toggle ${hapticFeedback ? 'on' : ''}`}
            onClick={() => {
              setHapticFeedback(!hapticFeedback);
              addToast(!hapticFeedback ? 'Haptic feedback enabled' : 'Haptic feedback disabled', 'check');
            }}
            aria-label="Toggle Haptic Feedback"
          >
            <span className="ios-toggle-thumb" />
          </button>
        </div>

        {/* Row 3: Privacy & Data Controls */}
        <div
          className="prof-set-row"
          style={{ cursor: 'pointer' }}
          onClick={() => handleAction('Privacy', 'Privacy & data controls: Number masking is active', 'check')}
        >
          <div className="prof-set-info">
            <b className="prof-set-title">Privacy & Data Controls</b>
            <span className="prof-set-sub">Number masking, live location privacy, data export</span>
          </div>
          <div className="prof-set-action-btn">
            <span>Manage</span>
            <Icon name="chevronRight" size={15} />
          </div>
        </div>

        {/* Row 4: Appearance Segmented Control */}
        <div className="prof-set-row" style={{ display: 'block', padding: '14px 0' }}>
          <b className="prof-set-title" style={{ marginBottom: '10px' }}>
            Appearance
          </b>
          <div className="ios-seg-control" role="group" aria-label="Appearance">
            {[['system', 'System'], ['light', 'Light'], ['dark', 'Dark']].map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                className={`ios-seg-btn ${theme === mode ? 'on' : ''}`}
                onClick={() => setTheme(mode)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 7. HELP & SUPPORT */}
      <div className="prof-section-title">Help & Support</div>
      <div className="card" style={{ padding: '0 16px', borderRadius: '18px', marginBottom: '22px' }}>
        {/* Row 1: 24x7 Concierge Helpline */}
        <div
          className="prof-set-row"
          style={{ cursor: 'pointer' }}
          onClick={() => handleAction('Call Free', 'Connecting to 24x7 Ridingo Concierge (+91 80001 23456)...', 'phone')}
        >
          <div className="prof-set-info">
            <b className="prof-set-title">24x7 Concierge Helpline</b>
            <span className="prof-set-sub">Dedicated roadside & trip customer care</span>
          </div>
          <div className="prof-set-action-btn">
            <span>Call Free</span>
            <Icon name="chevronRight" size={15} />
          </div>
        </div>

        {/* Row 2: Driver Standards & Safety */}
        <div
          className="prof-set-row"
          style={{ cursor: 'pointer' }}
          onClick={() => handleAction('Guidelines', 'Opening Driver Standards & Safety Verification guidelines...', 'check')}
        >
          <div className="prof-set-info">
            <b className="prof-set-title">Driver Standards & Safety</b>
            <span className="prof-set-sub">Driver background checks & license verification</span>
          </div>
          <div className="prof-set-action-btn">
            <span>Guidelines</span>
            <Icon name="chevronRight" size={15} />
          </div>
        </div>
      </div>

      {/* 8. Footer: App Version & Sign Out Button */}
      <div style={{ textAlign: 'center', padding: '16px 0 12px', width: '100%' }}>
        <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}>
          Ridingo for Car Owners · v2.4.2
        </p>
        <button
          type="button"
          onClick={logout}
          style={{
            width: '100%',
            height: '50px',
            borderRadius: '16px',
            background: '#DC2626',
            color: '#FFFFFF',
            border: 'none',
            fontSize: '15px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(220, 38, 38, 0.28)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'transform 0.15s ease'
          }}
        >
          <Icon name="logout" size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
