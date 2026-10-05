import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import Icon from './Icon';

export default function ProfileTab() {
  const { user, updateUserProfile, addNotification, theme, setTheme, logout, addToast } = useApp();

  // Active Bottom Sheet Modal:
  // null | 'editProfile' | 'changePin' | 'sos' | 'insurance' | 'temp' | 'lang' | 'privacy' | 'concierge' | 'safety'
  const [activeModal, setActiveModal] = useState(null);

  // Form states for modals
  const [editName, setEditName] = useState(user?.name || 'Arjun Menon');
  const [editPhone, setEditPhone] = useState(user?.phone || '+91 98401 23456');
  const [editEmail, setEditEmail] = useState(user?.email || 'arjun.menon@example.com');
  const [editCarModel, setEditCarModel] = useState(user?.car?.model || 'Hyundai Creta (Automatic)');
  const [editCarPlate, setEditCarPlate] = useState(user?.car?.plate || 'KL 07 AB 4821');
  const [editAvatar, setEditAvatar] = useState(user?.avatar || '');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (activeModal === 'editProfile') {
      setEditName(user?.name || 'Arjun Menon');
      setEditPhone(user?.phone || '+91 98401 23456');
      setEditEmail(user?.email || 'arjun.menon@example.com');
      setEditCarModel(user?.car?.model || 'Hyundai Creta (Automatic)');
      setEditCarPlate(user?.car?.plate || 'KL 07 AB 4821');
      setEditAvatar(user?.avatar || '');
    }
  }, [activeModal, user]);

  const handleAvatarFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      addToast('Image size should be under 5MB', 'warn');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setEditAvatar(event.target.result);
      addToast('Profile picture selected! Tap Save to apply.', 'check');
    };
    reader.readAsDataURL(file);
  };

  // Change PIN modal state
  const [pinInput, setPinInput] = useState(user?.pinCode || '4821');

  // SOS Contacts modal state
  const [sosList, setSosList] = useState(
    user?.sosContacts || [
      { name: 'Priya Menon', relation: 'Spouse', phone: '+91 98401 98765' },
      { name: 'Vijay Menon', relation: 'Brother', phone: '+91 98401 87654' }
    ]
  );
  const [newSosName, setNewSosName] = useState('');
  const [newSosRelation, setNewSosRelation] = useState('');
  const [newSosPhone, setNewSosPhone] = useState('');

  // Insurance modal state
  const [insTier, setInsTier] = useState(user?.insuranceTier || 'standard');
  const [insNominee, setInsNominee] = useState(user?.nominee?.name || 'Priya Menon');

  // AC Preferences modal state
  const [acTemp, setAcTemp] = useState(user?.acTemp || '22°C');
  const [acMode, setAcMode] = useState(user?.acMode || 'Chill');
  const [acPrecool, setAcPrecool] = useState(user?.acPrecool ?? true);

  // Language modal state
  const [selectedLangs, setSelectedLangs] = useState(user?.languages || ['English', 'Hindi', 'Malayalam']);

  // Privacy toggles
  const [maskNumber, setMaskNumber] = useState(user?.maskNumber ?? true);
  const [locPrivacy, setLocPrivacy] = useState(user?.locPrivacy ?? true);

  // Direct toggle handlers with instant state and storage persistence
  const handleToggle = (key, val, label) => {
    updateUserProfile({ [key]: val });
    addToast(`${label}: ${val ? 'Enabled' : 'Disabled'}`, 'check');
    if (key === 'haptic' && val && navigator.vibrate) {
      try { navigator.vibrate(50); } catch (e) {}
    }
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      addToast('Please enter your full name', 'warn');
      return;
    }
    updateUserProfile({
      name: editName.trim(),
      phone: editPhone.trim(),
      email: editEmail.trim(),
      avatar: editAvatar,
      car: {
        model: editCarModel.trim(),
        plate: editCarPlate.trim(),
        trans: editCarModel.toLowerCase().includes('auto') ? 'Automatic' : 'Manual'
      }
    });
    setActiveModal(null);
    addToast('Profile, photo & car details updated', 'check');
  };

  const handleSavePin = (e) => {
    e.preventDefault();
    const clean = pinInput.replace(/\D/g, '').slice(0, 4);
    if (clean.length < 4) {
      addToast('PIN must be 4 digits', 'warn');
      return;
    }
    updateUserProfile({ pinCode: clean });
    setActiveModal(null);
    addToast(`Ride Start PIN updated to ${clean}`, 'check');
  };

  const handleAddSos = (e) => {
    e.preventDefault();
    if (!newSosName.trim() || !newSosPhone.trim()) {
      addToast('Please enter contact name and phone number', 'warn');
      return;
    }
    const updated = [
      ...sosList,
      { name: newSosName.trim(), relation: newSosRelation.trim() || 'Family', phone: newSosPhone.trim() }
    ];
    setSosList(updated);
    updateUserProfile({ sosContacts: updated });
    setNewSosName('');
    setNewSosRelation('');
    setNewSosPhone('');
    addToast(`Added emergency contact ${newSosName.trim()}`, 'check');
  };

  const handleDeleteSos = (idx) => {
    const updated = sosList.filter((_, i) => i !== idx);
    setSosList(updated);
    updateUserProfile({ sosContacts: updated });
    addToast('Emergency contact removed', 'info');
  };

  const handleSaveInsurance = () => {
    updateUserProfile({
      insuranceTier: insTier,
      nominee: { name: insNominee, relation: 'Spouse' }
    });
    setActiveModal(null);
    addToast(`Insurance tier updated to ${insTier.toUpperCase()}`, 'check');
  };

  const handleSaveAc = () => {
    updateUserProfile({
      acTemp,
      acMode,
      acPrecool
    });
    setActiveModal(null);
    addToast(`Cabin preferences saved: ${acTemp} (${acMode})`, 'check');
  };

  const handleToggleLang = (lang) => {
    let next;
    if (selectedLangs.includes(lang)) {
      if (selectedLangs.length === 1) {
        addToast('Please keep at least one preferred language', 'warn');
        return;
      }
      next = selectedLangs.filter(l => l !== lang);
    } else {
      next = [...selectedLangs, lang];
    }
    setSelectedLangs(next);
    updateUserProfile({ languages: next });
  };

  const handleNotificationTest = () => {
    addNotification('System Test Alert', 'Your Ridingo push notification alerts are active and running properly.', 'bell');
    addToast('🔔 Test alert sent! Added to Notifications', 'check');
    if (navigator.vibrate) {
      try { navigator.vibrate([40, 60, 40]); } catch (e) {}
    }
  };

  const handleExportData = () => {
    const csvContent = 'data:text/csv;charset=utf-8,Trip ID,Date,Fare,Driver,Status\nTRP-1092,2026-10-05,796,Ravi Kumar,Completed\nTRP-1085,2026-10-03,699,Vikram Joshi,Completed';
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ridingo_trips_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Trip history exported successfully (.csv)', 'check');
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
                  width: '58px',
                  height: '58px',
                  borderRadius: '50%',
                  background: 'var(--yellow)',
                  color: '#111827',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: 800,
                  overflow: 'hidden',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                  border: '2px solid var(--surface)'
                }}
              >
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user?.name || 'User'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  (user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'AM')
                )}
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
                onClick={() => setActiveModal('editProfile')}
                title="Change Photo & Details"
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
                {user?.phone || '+91 98401 23456'} · {user?.email || 'arjun.menon@example.com'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveModal('editProfile')}
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

        {/* Verified Owner & Vehicle Info */}
        <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                background: 'rgba(34, 197, 94, 0.14)',
                color: '#16A34A',
                fontSize: '11.5px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '999px',
                display: 'inline-flex',
                alignItems: 'center'
              }}
            >
              Verified Owner
            </span>
            <span style={{ fontSize: '12.5px', color: 'var(--muted)', fontWeight: 500 }}>
              Member since 2024
            </span>
          </div>

          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>
            🚗 {user?.car?.model || 'Hyundai Creta'} ({user?.car?.plate || 'KL 07 AB 4821'})
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
              onClick={() => setActiveModal('changePin')}
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
              className={`ios-toggle ${user?.pin !== false ? 'on' : ''}`}
              onClick={() => handleToggle('pin', user?.pin === false, 'Ride Start PIN')}
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
            className={`ios-toggle ${user?.liveShare !== false ? 'on' : ''}`}
            onClick={() => handleToggle('liveShare', user?.liveShare === false, 'Live Trip Sharing')}
            aria-label="Toggle Share Live Trip Status"
          >
            <span className="ios-toggle-thumb" />
          </button>
        </div>

        {/* Row 3: Emergency SOS Contacts */}
        <div
          className="prof-set-row"
          style={{ cursor: 'pointer' }}
          onClick={() => setActiveModal('sos')}
        >
          <div className="prof-set-info">
            <b className="prof-set-title">Emergency SOS Contacts</b>
            <span className="prof-set-sub">
              {sosList.length} contacts configured ({sosList[0]?.name || 'Priya Menon'})
            </span>
          </div>
          <div className="prof-set-action-btn">
            <span>Manage ({sosList.length})</span>
            <Icon name="chevronRight" size={15} />
          </div>
        </div>

        {/* Row 4: Trip Insurance Policy */}
        <div
          className="prof-set-row"
          style={{ cursor: 'pointer' }}
          onClick={() => setActiveModal('insurance')}
        >
          <div className="prof-set-info">
            <b className="prof-set-title">Trip Insurance Policy</b>
            <span className="prof-set-sub">
              {insTier === 'executive' ? 'Executive (₹25L)' : insTier === 'comprehensive' ? 'Comprehensive (₹10L)' : 'Standard (₹5L)'} on-trip protection
            </span>
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
            className={`ios-toggle ${user?.quietCabin ? 'on' : ''}`}
            onClick={() => handleToggle('quietCabin', !user?.quietCabin, 'Quiet Ride Mode')}
            aria-label="Toggle Quiet Ride Mode"
          >
            <span className="ios-toggle-thumb" />
          </button>
        </div>

        {/* Row 2: Cabin Temperature & AC */}
        <div
          className="prof-set-row"
          style={{ cursor: 'pointer' }}
          onClick={() => setActiveModal('temp')}
        >
          <div className="prof-set-info">
            <b className="prof-set-title">Cabin Temperature & AC</b>
            <span className="prof-set-sub">{acTemp} ({acMode}) · {acPrecool ? 'Pre-cool on' : 'Standard'}</span>
          </div>
          <div className="prof-set-action-btn">
            <span>{acTemp}</span>
            <Icon name="chevronRight" size={15} />
          </div>
        </div>

        {/* Row 3: Driver Language */}
        <div
          className="prof-set-row"
          style={{ cursor: 'pointer' }}
          onClick={() => setActiveModal('lang')}
        >
          <div className="prof-set-info">
            <b className="prof-set-title">Driver Language</b>
            <span className="prof-set-sub">{selectedLangs.join(', ')}</span>
          </div>
          <div className="prof-set-action-btn">
            <span>{selectedLangs.length} Langs</span>
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
            className={`ios-toggle ${user?.notif !== false ? 'on' : ''}`}
            onClick={() => handleToggle('notif', user?.notif === false, 'Trip Status Alerts')}
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
            className={`ios-toggle ${user?.whatsapp !== false ? 'on' : ''}`}
            onClick={() => handleToggle('whatsapp', user?.whatsapp === false, 'WhatsApp Booking Slip')}
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
            className={`ios-toggle ${user?.promo !== false ? 'on' : ''}`}
            onClick={() => handleToggle('promo', user?.promo === false, 'Rewards & Cashback Alerts')}
            aria-label="Toggle Rewards & Cashbacks"
          >
            <span className="ios-toggle-thumb" />
          </button>
        </div>

        {/* Row 4: System Notification Test */}
        <div
          className="prof-set-row"
          style={{ cursor: 'pointer' }}
          onClick={handleNotificationTest}
        >
          <div className="prof-set-info">
            <b className="prof-set-title">System Notification Test</b>
            <span className="prof-set-sub">Tap to verify device alerts and notification chime</span>
          </div>
          <div className="prof-set-action-btn">
            <span>Test Alert</span>
            <Icon name="bell" size={15} />
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
            className={`ios-toggle ${user?.biometric !== false ? 'on' : ''}`}
            onClick={() => handleToggle('biometric', user?.biometric === false, 'Biometric Lock')}
            aria-label="Toggle Biometric Lock"
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
            className={`ios-toggle ${user?.haptic !== false ? 'on' : ''}`}
            onClick={() => handleToggle('haptic', user?.haptic === false, 'Haptic Feedback')}
            aria-label="Toggle Haptic Feedback"
          >
            <span className="ios-toggle-thumb" />
          </button>
        </div>

        {/* Row 3: Privacy & Data Controls */}
        <div
          className="prof-set-row"
          style={{ cursor: 'pointer' }}
          onClick={() => setActiveModal('privacy')}
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

        {/* Row 4: Appearance */}
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
          onClick={() => setActiveModal('concierge')}
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
          onClick={() => setActiveModal('safety')}
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

      {/* ==========================================================
          INTERACTIVE SETTING MODAL SHEETS
         ========================================================== */}
      {activeModal && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 200,
            background: 'rgba(0, 0, 0, 0.45)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            animation: 'fade 0.2s ease'
          }}
        >
          {/* Backdrop dismiss click */}
          <div
            style={{ position: 'absolute', inset: 0 }}
            onClick={() => setActiveModal(null)}
          />

          <div
            style={{
              position: 'relative',
              background: 'var(--surface)',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              maxHeight: '85%',
              overflowY: 'auto',
              padding: '16px 20px 32px',
              boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
              zIndex: 2,
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {/* Grab bar */}
            <div style={{ width: '38px', height: '4px', borderRadius: '999px', background: 'var(--line)', margin: '0 auto 16px' }} />

            {/* MODAL 1: EDIT PROFILE */}
            {activeModal === 'editProfile' && (
              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                  Edit Profile & Vehicle
                </h3>

                {/* Profile Photo Upload / Edit */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '6px 0 10px' }}>
                  <div style={{ position: 'relative' }}>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        width: '84px',
                        height: '84px',
                        borderRadius: '50%',
                        background: 'var(--yellow)',
                        color: '#111827',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '28px',
                        fontWeight: 800,
                        overflow: 'hidden',
                        border: '3px solid var(--surface)',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                        cursor: 'pointer'
                      }}
                      title="Tap to change profile photo"
                    >
                      {editAvatar ? (
                        <img src={editAvatar} alt="Profile Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        (editName ? editName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'AM')
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: '#111827',
                        border: '2px solid var(--card)',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                      }}
                      title="Upload Photo"
                    >
                      <Icon name="camera" size={13} />
                    </button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleAvatarFileSelect}
                  />

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        background: 'rgba(250, 204, 21, 0.18)',
                        border: '1px solid var(--yellow)',
                        color: 'var(--ink)',
                        padding: '6px 14px',
                        borderRadius: '999px',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Icon name="camera" size={12} />
                      <span>{editAvatar ? 'Change Photo' : 'Upload Photo'}</span>
                    </button>
                    {editAvatar && (
                      <button
                        type="button"
                        onClick={() => { setEditAvatar(''); addToast('Photo removed (initials will be used)', 'info'); }}
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--line)',
                          color: '#EF4444',
                          padding: '6px 12px',
                          borderRadius: '999px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    style={{ width: '100%', height: '46px', borderRadius: '13px', border: '1.5px solid var(--line)', background: 'var(--card)', padding: '0 14px', fontSize: '14.5px', color: 'var(--ink)', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                    Mobile Number
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    style={{ width: '100%', height: '46px', borderRadius: '13px', border: '1.5px solid var(--line)', background: 'var(--card)', padding: '0 14px', fontSize: '14.5px', color: 'var(--ink)', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    style={{ width: '100%', height: '46px', borderRadius: '13px', border: '1.5px solid var(--line)', background: 'var(--card)', padding: '0 14px', fontSize: '14.5px', color: 'var(--ink)', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                      Car Model
                    </label>
                    <input
                      type="text"
                      value={editCarModel}
                      onChange={e => setEditCarModel(e.target.value)}
                      style={{ width: '100%', height: '46px', borderRadius: '13px', border: '1.5px solid var(--line)', background: 'var(--card)', padding: '0 12px', fontSize: '13.5px', color: 'var(--ink)', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                      Plate Number
                    </label>
                    <input
                      type="text"
                      value={editCarPlate}
                      onChange={e => setEditCarPlate(e.target.value)}
                      style={{ width: '100%', height: '46px', borderRadius: '13px', border: '1.5px solid var(--line)', background: 'var(--card)', padding: '0 12px', fontSize: '13.5px', color: 'var(--ink)', outline: 'none' }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn"
                  style={{ height: '48px', borderRadius: '14px', background: 'var(--yellow)', color: '#111827', border: 'none', fontSize: '15px', fontWeight: 700, cursor: 'pointer', marginTop: '6px' }}
                >
                  Save Profile Details
                </button>
              </form>
            )}

            {/* MODAL 2: CHANGE PIN */}
            {activeModal === 'changePin' && (
              <form onSubmit={handleSavePin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                  Change Ride Start PIN
                </h3>
                <p style={{ fontSize: '13.5px', color: 'var(--muted)', margin: 0 }}>
                  Enter a new 4-digit security PIN. You will share this PIN with your driver to commence every booking.
                </p>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                    New 4-Digit PIN
                  </label>
                  <input
                    type="tel"
                    maxLength={4}
                    value={pinInput}
                    onChange={e => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="4821"
                    style={{ width: '100%', height: '52px', borderRadius: '14px', border: '2px solid var(--yellow)', background: 'var(--card)', padding: '0 16px', fontSize: '24px', fontWeight: 800, letterSpacing: '0.4em', textAlign: 'center', color: 'var(--ink)', outline: 'none' }}
                  />
                </div>

                <button
                  type="submit"
                  className="btn"
                  style={{ height: '48px', borderRadius: '14px', background: 'var(--yellow)', color: '#111827', border: 'none', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Update PIN
                </button>
              </form>
            )}

            {/* MODAL 3: SOS CONTACTS */}
            {activeModal === 'sos' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                  Emergency SOS Contacts
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
                  These trusted contacts receive your live trip link and automatic SOS SMS alerts if an emergency is triggered.
                </p>

                {/* List of contacts */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {sosList.map((c, idx) => (
                    <div
                      key={idx}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '14px', background: 'var(--card)', border: '1px solid var(--line)' }}
                    >
                      <div>
                        <b style={{ fontSize: '14px', color: 'var(--ink)' }}>{c.name}</b>
                        <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block' }}>{c.relation} · {c.phone}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteSos(idx)}
                        style={{ color: '#EF4444', fontSize: '12.5px', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add new contact form */}
                <form onSubmit={handleAddSos} style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '6px', borderTop: '1px solid var(--line)' }}>
                  <b style={{ fontSize: '13px', color: 'var(--ink)' }}>Add New Contact</b>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="Contact Name"
                      value={newSosName}
                      onChange={e => setNewSosName(e.target.value)}
                      style={{ height: '42px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--card)', padding: '0 12px', fontSize: '13.5px', outline: 'none', color: 'var(--ink)' }}
                    />
                    <input
                      type="text"
                      placeholder="Relation (e.g. Spouse)"
                      value={newSosRelation}
                      onChange={e => setNewSosRelation(e.target.value)}
                      style={{ height: '42px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--card)', padding: '0 12px', fontSize: '13.5px', outline: 'none', color: 'var(--ink)' }}
                    />
                  </div>
                  <input
                    type="tel"
                    placeholder="Mobile (+91 98765 43210)"
                    value={newSosPhone}
                    onChange={e => setNewSosPhone(e.target.value)}
                    style={{ height: '42px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--card)', padding: '0 12px', fontSize: '13.5px', outline: 'none', color: 'var(--ink)' }}
                  />
                  <button
                    type="submit"
                    className="btn"
                    style={{ height: '44px', borderRadius: '12px', background: 'var(--solid)', color: 'var(--on-solid)', border: 'none', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    + Add Emergency Contact
                  </button>
                </form>
              </div>
            )}

            {/* MODAL 4: TRIP INSURANCE */}
            {activeModal === 'insurance' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                  Trip Insurance Policy
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
                  Every trip on Ridingo is backed by comprehensive passenger & chauffeur transit cover underwritten by ICICI Lombard.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { id: 'standard', name: 'Standard Shield', cover: '₹5 Lakhs Coverage', price: 'Included Free' },
                    { id: 'comprehensive', name: 'Comprehensive Shield', cover: '₹10 Lakhs Coverage + OPD', price: '₹29 / trip' },
                    { id: 'executive', name: 'Executive Shield', cover: '₹25 Lakhs Coverage + Baggage Loss', price: '₹79 / trip' }
                  ].map(t => (
                    <div
                      key={t.id}
                      onClick={() => setInsTier(t.id)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '14px',
                        border: insTier === t.id ? '2px solid var(--yellow)' : '1px solid var(--line)',
                        background: insTier === t.id ? 'rgba(255, 199, 10, 0.12)' : 'var(--card)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <b style={{ fontSize: '14px', color: 'var(--ink)' }}>{t.name}</b>
                        <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block' }}>{t.cover}</span>
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>{t.price}</span>
                    </div>
                  ))}
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                    Nominee Name
                  </label>
                  <input
                    type="text"
                    value={insNominee}
                    onChange={e => setInsNominee(e.target.value)}
                    style={{ width: '100%', height: '44px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--card)', padding: '0 12px', fontSize: '14px', outline: 'none', color: 'var(--ink)' }}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSaveInsurance}
                  className="btn"
                  style={{ height: '46px', borderRadius: '14px', background: 'var(--yellow)', color: '#111827', border: 'none', fontSize: '14.5px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Save Policy Preferences
                </button>
              </div>
            )}

            {/* MODAL 5: CABIN TEMPERATURE & AC */}
            {activeModal === 'temp' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                  Cabin Temperature & Climate
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
                  Drivers configure your vehicle's climate control system to these settings upon arrival.
                </p>

                {/* Temp selector */}
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>
                    Target Temperature
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                    {['18°C', '20°C', '22°C', '24°C', '26°C'].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setAcTemp(t)}
                        style={{
                          height: '42px',
                          borderRadius: '12px',
                          border: acTemp === t ? '2px solid var(--yellow)' : '1px solid var(--line)',
                          background: acTemp === t ? 'var(--yellow)' : 'var(--card)',
                          color: acTemp === t ? '#111827' : 'var(--ink)',
                          fontSize: '13.5px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mode selector */}
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>
                    AC Mode
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                    {['Chill', 'Normal', 'Eco', 'Fan Only'].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setAcMode(m)}
                        style={{
                          height: '38px',
                          borderRadius: '10px',
                          border: acMode === m ? '1.5px solid var(--solid)' : '1px solid var(--line)',
                          background: acMode === m ? 'var(--solid)' : 'var(--card)',
                          color: acMode === m ? 'var(--on-solid)' : 'var(--muted)',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pre-cool toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid var(--line)' }}>
                  <div>
                    <b style={{ fontSize: '14px', color: 'var(--ink)' }}>Auto Pre-cool Cabin</b>
                    <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block' }}>Turn on AC 5 mins before arrival</span>
                  </div>
                  <button
                    type="button"
                    className={`ios-toggle ${acPrecool ? 'on' : ''}`}
                    onClick={() => setAcPrecool(!acPrecool)}
                  >
                    <span className="ios-toggle-thumb" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSaveAc}
                  className="btn"
                  style={{ height: '46px', borderRadius: '14px', background: 'var(--yellow)', color: '#111827', border: 'none', fontSize: '14.5px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Save Climate Preferences
                </button>
              </div>
            )}

            {/* MODAL 6: DRIVER LANGUAGES */}
            {activeModal === 'lang' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                  Driver Language Preferences
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
                  Select the languages you prefer your chauffeur to be fluent in.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {['English', 'Hindi', 'Malayalam', 'Tamil', 'Kannada', 'Telugu', 'Bengali', 'Marathi'].map(lang => {
                    const active = selectedLangs.includes(lang);
                    return (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => handleToggleLang(lang)}
                        style={{
                          height: '42px',
                          borderRadius: '12px',
                          border: active ? '2px solid var(--yellow)' : '1px solid var(--line)',
                          background: active ? 'rgba(255, 199, 10, 0.15)' : 'var(--card)',
                          color: active ? 'var(--ink)' : 'var(--muted)',
                          fontSize: '13.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0 12px'
                        }}
                      >
                        <span>{lang}</span>
                        {active && <span style={{ color: 'var(--on-yellow)', fontWeight: 800 }}>✓</span>}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveModal(null);
                    addToast(`Updated languages: ${selectedLangs.join(', ')}`, 'check');
                  }}
                  className="btn"
                  style={{ height: '46px', borderRadius: '14px', background: 'var(--yellow)', color: '#111827', border: 'none', fontSize: '14.5px', fontWeight: 700, cursor: 'pointer', marginTop: '4px' }}
                >
                  Confirm Languages
                </button>
              </div>
            )}

            {/* MODAL 7: PRIVACY & DATA */}
            {activeModal === 'privacy' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                  Privacy & Data Controls
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
                  Manage how your personal information and trip data are shared.
                </p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                  <div>
                    <b style={{ fontSize: '14px', color: 'var(--ink)' }}>Phone Number Masking</b>
                    <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block' }}>Hide real phone number from chauffeurs</span>
                  </div>
                  <button
                    type="button"
                    className={`ios-toggle ${maskNumber ? 'on' : ''}`}
                    onClick={() => {
                      const next = !maskNumber;
                      setMaskNumber(next);
                      updateUserProfile({ maskNumber: next });
                      addToast(`Number masking ${next ? 'enabled' : 'disabled'}`, 'check');
                    }}
                  >
                    <span className="ios-toggle-thumb" />
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                  <div>
                    <b style={{ fontSize: '14px', color: 'var(--ink)' }}>Strict Location Privacy</b>
                    <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block' }}>Only transmit GPS during an active trip</span>
                  </div>
                  <button
                    type="button"
                    className={`ios-toggle ${locPrivacy ? 'on' : ''}`}
                    onClick={() => {
                      const next = !locPrivacy;
                      setLocPrivacy(next);
                      updateUserProfile({ locPrivacy: next });
                      addToast(`Location privacy ${next ? 'enabled' : 'disabled'}`, 'check');
                    }}
                  >
                    <span className="ios-toggle-thumb" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleExportData}
                  style={{
                    height: '44px',
                    borderRadius: '12px',
                    background: 'var(--card)',
                    border: '1px solid var(--line)',
                    color: 'var(--ink)',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  📥 Export Trip Records (.CSV)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveModal(null);
                    addToast('Local app cache cleared successfully', 'check');
                  }}
                  style={{
                    height: '44px',
                    borderRadius: '12px',
                    background: 'var(--card)',
                    border: '1px solid var(--line)',
                    color: '#EF4444',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Clear App Cache (4.2 MB)
                </button>
              </div>
            )}

            {/* MODAL 8: CONCIERGE HELPLINE */}
            {activeModal === 'concierge' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                  24x7 Ridingo Concierge
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
                  Immediate roadside assistance, chauffeur dispatch, and VIP support desk.
                </p>

                <div style={{ padding: '16px', borderRadius: '16px', background: 'var(--card)', border: '1.5px solid var(--line)', textAlign: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em' }}>
                    Toll-Free Helpline
                  </span>
                  <b style={{ fontSize: '22px', fontWeight: 800, color: 'var(--ink)', display: 'block', marginTop: '4px' }}>
                    1800 425 4821
                  </b>
                  <span style={{ fontSize: '12.5px', color: '#16A34A', fontWeight: 600, display: 'block', marginTop: '4px' }}>
                    ● 24/7 Available (Avg wait &lt; 15s)
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      addToast('Connecting to 1800 425 4821...', 'info');
                      window.location.href = 'tel:18004254821';
                    }}
                    style={{ height: '48px', borderRadius: '14px', background: '#16A34A', color: '#FFFFFF', border: 'none', fontSize: '14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <span>📞 Call Free</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      addToast('Opening WhatsApp Concierge...', 'check');
                      window.open('https://wa.me/919840123456?text=Hi%20Ridingo%20Concierge,%20I%20need%20assistance', '_blank');
                    }}
                    style={{ height: '48px', borderRadius: '14px', background: '#25D366', color: '#FFFFFF', border: 'none', fontSize: '14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <span>💬 WhatsApp</span>
                  </button>
                </div>
              </div>
            )}

            {/* MODAL 9: SAFETY STANDARDS GUIDELINES */}
            {activeModal === 'safety' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                  Driver Safety & Standards
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
                  Every Ridingo chauffeur completes our stringent 7-point certification before handling member vehicles.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { title: 'Police Clearance Certificate', desc: 'Verified criminal & civil records clearance by State Police' },
                    { title: 'Commercial Driver Badge', desc: 'Valid RTO-issued commercial badge with minimum 5+ years experience' },
                    { title: 'Transmission Mastery Exam', desc: 'Practical test on Manual, Dual-Clutch, CVT, and Luxury EV dynamics' },
                    { title: 'Identity & Biometric KYC', desc: 'Aadhaar biometric & address verification on file' },
                    { title: 'Zero Tolerance Policy', desc: 'Zero alcohol & narcotics tolerance with breathalyzer on-duty checks' }
                  ].map((s, idx) => (
                    <div
                      key={idx}
                      style={{ padding: '10px 12px', borderRadius: '12px', background: 'var(--card)', border: '1px solid var(--line)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}
                    >
                      <span style={{ color: '#16A34A', fontWeight: 800, fontSize: '15px' }}>✓</span>
                      <div>
                        <b style={{ fontSize: '13.5px', color: 'var(--ink)', display: 'block' }}>{s.title}</b>
                        <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block' }}>{s.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="btn"
                  style={{ height: '46px', borderRadius: '14px', background: 'var(--solid)', color: 'var(--on-solid)', border: 'none', fontSize: '14.5px', fontWeight: 700, cursor: 'pointer', marginTop: '4px' }}
                >
                  Understood
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
