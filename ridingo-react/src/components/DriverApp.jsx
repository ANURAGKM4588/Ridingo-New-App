import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import Icon from './Icon';
import BrandLogo from './BrandLogo';

const CATS = {
  hourly: { name: 'Hourly', icon: 'clock', unit: 'hr', units: 'hours' },
  daily: { name: 'Full day', icon: 'sun', unit: 'day', units: 'days' },
  airport: { name: 'Airport', icon: 'plane' },
  outstation: { name: 'Outstation', icon: 'route', unit: 'day', units: 'days' },
  event: { name: 'Night & events', icon: 'moon', unit: 'hr', units: 'hours' }
};

export default function DriverApp() {
  const {
    trips,
    setTrips,
    driverOnline,
    setDriverOnline,
    driverPartner,
    updateDriverPartner,
    dTab,
    setDTab,
    theme,
    setTheme,
    addToast
  } = useApp();

  const [dFilter, setDFilter] = useState('all');

  // Driver Profile Modal state:
  // null | 'editDriver' | 'cars' | 'payout' | 'settlement' | 'documents' | 'help' | 'incentives'
  const [activeDriverModal, setActiveDriverModal] = useState(null);

  // Edit Driver form states
  const [editDriverName, setEditDriverName] = useState(driverPartner?.name || 'Ravi Kumar');
  const [editDriverPhone, setEditDriverPhone] = useState(driverPartner?.phone || '+91 94471 23456');
  const [editDriverExp, setEditDriverExp] = useState(driverPartner?.experienceYears || 8);
  const [editDriverAvatar, setEditDriverAvatar] = useState(driverPartner?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150');
  const driverFileInputRef = useRef(null);

  useEffect(() => {
    if (activeDriverModal === 'editDriver') {
      setEditDriverName(driverPartner?.name || 'Ravi Kumar');
      setEditDriverPhone(driverPartner?.phone || '+91 94471 23456');
      setEditDriverExp(driverPartner?.experienceYears || 8);
      setEditDriverAvatar(driverPartner?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150');
    }
  }, [activeDriverModal, driverPartner]);

  const handleDriverAvatarFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      addToast('Image size should be under 5MB', 'warn');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setEditDriverAvatar(event.target.result);
      addToast('Chauffeur photo selected! Tap Save to apply.', 'check');
    };
    reader.readAsDataURL(file);
  };

  // Payout Bank / UPI form states
  const [editBankName, setEditBankName] = useState(driverPartner?.bankName || 'HDFC Bank');
  const [editBankAccount, setEditBankAccount] = useState(driverPartner?.bankAccount || '•••• 4521');
  const [editUpiId, setEditUpiId] = useState(driverPartner?.upiId || 'ravi.kumar@okhdfcbank');

  // Driver toggle handlers with instant state and storage persistence
  const handleDriverToggle = (key, val, label) => {
    updateDriverPartner({ [key]: val });
    addToast(`${label}: ${val ? 'Enabled' : 'Disabled'}`, 'check');
    if (key === 'haptic' && val && navigator.vibrate) {
      try { navigator.vibrate(50); } catch (e) {}
    }
  };

  const handleToggleService = (key) => {
    const currentServices = driverPartner?.services || {
      hourly: true,
      daily: true,
      airport: true,
      outstation: true,
      event: true
    };
    const nextVal = !currentServices[key];
    const updated = { ...currentServices, [key]: nextVal };
    updateDriverPartner({ services: updated });
    addToast(`${CATS[key]?.name || key} service ${nextVal ? 'enabled' : 'disabled'}`, 'check');
  };

  const handleSaveDriverProfile = (e) => {
    e.preventDefault();
    if (!editDriverName.trim()) {
      addToast('Please enter driver name', 'warn');
      return;
    }
    updateDriverPartner({
      name: editDriverName.trim(),
      phone: editDriverPhone.trim(),
      experienceYears: Number(editDriverExp) || 8,
      avatar: editDriverAvatar
    });
    setActiveDriverModal(null);
    addToast('Chauffeur profile & photo updated successfully', 'check');
  };

  const handleSavePayout = (e) => {
    e.preventDefault();
    if (!editBankAccount.trim() || !editUpiId.trim()) {
      addToast('Please enter bank account and UPI ID', 'warn');
      return;
    }
    updateDriverPartner({
      bankName: editBankName.trim(),
      bankAccount: editBankAccount.trim(),
      upiId: editUpiId.trim()
    });
    setActiveDriverModal(null);
    addToast('Payout bank & UPI details saved', 'check');
  };

  const requestedTrips = trips.filter(t => t.status === 'requested');
  const upcomingTrips = trips.filter(t => ['accepted', 'scheduled', 'inprogress'].includes(t.status));

  // Accept trip handler
  const handleAccept = (tripId) => {
    setTrips(prev =>
      prev.map(t => (t.id === tripId ? { ...t, status: 'inprogress', driver: 'Ravi Kumar' } : t))
    );
    addToast('Trip accepted! Navigating to customer pickup', 'check');
  };

  // Decline trip handler
  const handleDecline = (tripId) => {
    setTrips(prev => prev.filter(t => t.id !== tripId));
    addToast('Trip request dismissed', 'info');
  };

  // Complete trip handler
  const handleComplete = (tripId) => {
    setTrips(prev =>
      prev.map(t => (t.id === tripId ? { ...t, status: 'completed' } : t))
    );
    addToast('Trip completed! ₹ Fare added to your earnings', 'check');
  };

  // Mock earnings data for the 7-day chart with rich metadata for interactive graphic view
  const days = [
    { day: 'Mon', l: 'M', v: 1250, trips: 2, hrs: 3.5, date: 'Sep 29' },
    { day: 'Tue', l: 'T', v: 1800, trips: 4, hrs: 5.2, date: 'Sep 30' },
    { day: 'Wed', l: 'W', v: 950, trips: 2, hrs: 2.8, date: 'Oct 01' },
    { day: 'Thu', l: 'T', v: 2100, trips: 4, hrs: 6.0, date: 'Oct 02' },
    { day: 'Fri', l: 'F', v: 2450, trips: 5, hrs: 6.5, date: 'Oct 03' },
    { day: 'Sat', l: 'S', v: 3100, trips: 6, hrs: 7.8, date: 'Oct 04' },
    { day: 'Today', l: 'S', v: 1495, trips: 3, hrs: 4.2, date: 'Oct 05', today: true }
  ];
  const [selectedDayIdx, setSelectedDayIdx] = useState(6);
  const selectedDay = days[selectedDayIdx] || days[6];
  const maxEarnings = Math.max(...days.map(d => d.v), 1);

  // Dynamic SVG sparkline coordinates
  const sparkPoints = days.map((d, i) => ({
    x: 16 + i * (288 / 6),
    y: 50 - (d.v / maxEarnings) * 36
  }));

  const lineSvgPath = sparkPoints.reduce((acc, p, i, a) => {
    if (i === 0) return `M ${p.x},${p.y}`;
    const prev = a[i - 1];
    const cp1x = prev.x + (p.x - prev.x) / 2;
    const cp1y = prev.y;
    const cp2x = prev.x + (p.x - prev.x) / 2;
    const cp2y = p.y;
    return `${acc} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p.x},${p.y}`;
  }, '');

  const areaSvgPath = `${lineSvgPath} L ${sparkPoints[sparkPoints.length - 1].x},64 L ${sparkPoints[0].x},64 Z`;
  const activePoint = sparkPoints[selectedDayIdx] || sparkPoints[6];

  return (
    <div className="inner">
      <div className="island" aria-hidden="true" />
      <div className="statusbar">
        <span className="clock">9:41</span>
        <span className="sb-r" aria-hidden="true">
          <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor">
            <rect x="0" y="8" width="3" height="4" rx="1" />
            <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
            <rect x="10" y="3" width="3" height="9" rx="1" />
            <rect x="15" y="0" width="3" height="12" rx="1" />
          </svg>
          <svg width="17" height="12" viewBox="0 0 17 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M1.5 4.3a10 10 0 0 1 14 0" />
            <path d="M4 7a6.4 6.4 0 0 1 9 0" />
            <circle cx="8.5" cy="10" r="1" fill="currentColor" stroke="none" />
          </svg>
          <svg width="27" height="13" viewBox="0 0 27 13" fill="none">
            <rect x=".5" y=".5" width="22" height="12" rx="3.5" stroke="currentColor" opacity=".45" />
            <rect x="2" y="2" width="17" height="9" rx="2" fill="currentColor" />
            <path d="M24.5 4.5v4c.9-.3 1.5-1.1 1.5-2s-.6-1.7-1.5-2z" fill="currentColor" opacity=".5" />
          </svg>
        </span>
      </div>

      <div className="content" id="d-content">
        {/* ===================== DASHBOARD TAB ===================== */}
        {dTab === 'dash' && (
          <div>
            {/* 1. MODERN CHAUFFEUR COMMAND HEADER */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
                padding: '2px 0'
              }}
            >
              {/* Left: Avatar with Live Pulsing Radar + Name & Rating */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      background: 'var(--yellow)',
                      color: '#111827',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '17px',
                      fontWeight: 800,
                      overflow: 'hidden',
                      border: '2px solid var(--surface)',
                      boxShadow: '0 3px 10px rgba(0,0,0,0.12)'
                    }}
                  >
                    {driverPartner?.avatar ? (
                      <img src={driverPartner.avatar} alt="Ravi" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : 'RK'}
                  </div>
                  {/* Status dot / radar pulse */}
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      width: '13px',
                      height: '13px',
                      borderRadius: '50%',
                      background: driverOnline ? '#10B981' : '#6B7280',
                      border: '2.5px solid var(--surface)',
                      boxShadow: driverOnline ? '0 0 0 3px rgba(16, 185, 129, 0.25)' : 'none'
                    }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <b style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink)' }}>
                      {driverPartner?.name?.split(' ')[0] || 'Ravi'}
                    </b>
                    <span
                      style={{
                        background: 'rgba(250, 204, 21, 0.18)',
                        color: 'var(--ink)',
                        fontSize: '11px',
                        fontWeight: 750,
                        padding: '2px 7px',
                        borderRadius: '6px'
                      }}
                    >
                      ★ {driverPartner?.rating || '4.8'}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '12px',
                      color: driverOnline ? '#10B981' : 'var(--muted)',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      marginTop: '2px'
                    }}
                  >
                    {driverOnline ? '● Ready for bookings' : '○ Offline'}
                  </span>
                </div>
              </div>

              {/* Right: Modern Minimalist Sliding Toggle Capsule */}
              <button
                type="button"
                onClick={() => {
                  const next = !driverOnline;
                  setDriverOnline(next);
                  addToast(next ? 'You are now Online! Receiving bookings.' : 'You went Offline.', next ? 'check' : 'info');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 14px 7px 10px',
                  borderRadius: '999px',
                  border: 'none',
                  background: driverOnline
                    ? 'linear-gradient(135deg, #059669 0%, #10B981 100%)'
                    : 'var(--card)',
                  color: driverOnline ? '#FFFFFF' : 'var(--muted)',
                  boxShadow: driverOnline
                    ? '0 4px 14px rgba(16, 185, 129, 0.35)'
                    : 'inset 0 0 0 1px var(--line)',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  outline: 'none'
                }}
              >
                <span
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: driverOnline ? '#FFFFFF' : 'var(--line)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.25s ease'
                  }}
                >
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: driverOnline ? '#059669' : 'var(--muted)'
                    }}
                  />
                </span>
                <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.02em' }}>
                  {driverOnline ? 'ONLINE' : 'GO ONLINE'}
                </span>
              </button>
            </div>

            {/* 2. HERO MINIMAL MODERN GRAPHIC OVERVIEW CARD */}
            <div
              style={{
                position: 'relative',
                borderRadius: '26px',
                background: 'linear-gradient(150deg, #16181F 0%, #0C0D11 100%)',
                color: '#FFFFFF',
                padding: '20px 20px 18px',
                marginBottom: '18px',
                overflow: 'hidden',
                boxShadow: '0 12px 36px -8px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              {/* Background Architectural Vector Grid Watermark */}
              <svg
                width="220"
                height="180"
                viewBox="0 0 220 180"
                fill="none"
                style={{
                  position: 'absolute',
                  top: -20,
                  right: -30,
                  pointerEvents: 'none',
                  opacity: 0.1
                }}
              >
                <circle cx="140" cy="40" r="120" stroke="#FACC15" strokeWidth="1" strokeDasharray="3 3" />
                <circle cx="140" cy="40" r="90" stroke="#FFFFFF" strokeWidth="1" />
                <circle cx="140" cy="40" r="60" stroke="#FACC15" strokeWidth="1.5" />
                <path d="M40 160 Q 110 90, 200 120" stroke="#FACC15" strokeWidth="2" strokeDasharray="4 4" />
                <path d="M10 130 Q 90 60, 210 80" stroke="#FFFFFF" strokeWidth="1.5" />
              </svg>

              {/* Top Row: Period Badge & Monthly Tally */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                  position: 'relative',
                  zIndex: 1
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: 'rgba(255, 255, 255, 0.65)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FACC15', boxShadow: '0 0 8px #FACC15' }} />
                    {selectedDay.today ? "Today's Earnings" : `${selectedDay.day} (${selectedDay.date})`}
                  </span>
                </div>

                <span
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 650,
                    color: 'rgba(255, 255, 255, 0.75)',
                    background: 'rgba(255, 255, 255, 0.08)',
                    padding: '3px 9px',
                    borderRadius: '999px',
                    backdropFilter: 'blur(8px)'
                  }}
                >
                  Month: ₹28,450
                </span>
              </div>

              {/* Hero Earnings Graphic Number */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '10px',
                  marginBottom: '14px',
                  position: 'relative',
                  zIndex: 1
                }}
              >
                <span
                  style={{
                    fontSize: '38px',
                    fontWeight: 800,
                    letterSpacing: '-0.03em',
                    color: '#FFFFFF',
                    fontFamily: 'var(--font-mono, monospace)',
                    lineHeight: 1
                  }}
                >
                  ₹{selectedDay.v.toLocaleString('en-IN')}
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 750,
                    color: '#10B981',
                    background: 'rgba(16, 185, 129, 0.16)',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                >
                  ↑ +18.4%
                </span>
              </div>

              {/* Graphic Minimal Sparkline Wave SVG */}
              <div style={{ position: 'relative', height: '64px', margin: '4px -8px 12px -8px' }}>
                <svg width="100%" height="100%" viewBox="0 0 320 64" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                  <defs>
                    <linearGradient id="driverGoldLine" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#EAB308" stopOpacity="0.4" />
                      <stop offset="60%" stopColor="#FACC15" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#FACC15" stopOpacity="1" />
                    </linearGradient>
                    <linearGradient id="driverAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#FACC15" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#FACC15" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Area fill */}
                  <path d={areaSvgPath} fill="url(#driverAreaGrad)" />

                  {/* Smooth curved trend line */}
                  <path
                    d={lineSvgPath}
                    fill="none"
                    stroke="url(#driverGoldLine)"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                  />

                  {/* Active day indicator node */}
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.y}
                    r="5.5"
                    fill="#FACC15"
                    stroke="#111827"
                    strokeWidth="2.5"
                  />
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.y}
                    r="10"
                    fill="none"
                    stroke="#FACC15"
                    strokeWidth="1.2"
                    opacity="0.6"
                  />
                </svg>
              </div>

              {/* Minimal Graphic 7-Day Performance Columns */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: '6px',
                  marginBottom: '16px',
                  position: 'relative',
                  zIndex: 1
                }}
              >
                {days.map((d, i) => {
                  const isSel = selectedDayIdx === i;
                  const heightPercent = Math.max(18, Math.round((d.v / maxEarnings) * 100));
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedDayIdx(i)}
                      style={{
                        background: isSel ? 'rgba(250, 204, 21, 0.14)' : 'rgba(255, 255, 255, 0.04)',
                        border: isSel ? '1px solid #FACC15' : '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '12px',
                        padding: '8px 4px 6px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        outline: 'none'
                      }}
                    >
                      <span
                        style={{
                          fontSize: '9.5px',
                          fontWeight: 700,
                          color: isSel ? '#FACC15' : 'rgba(255, 255, 255, 0.55)'
                        }}
                      >
                        {d.v >= 1000 ? (d.v / 1000).toFixed(1) + 'k' : d.v}
                      </span>
                      {/* Bar pillar */}
                      <div style={{ width: '100%', height: '36px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                        <div
                          style={{
                            width: '6px',
                            height: `${heightPercent}%`,
                            borderRadius: '999px',
                            background: isSel
                              ? 'linear-gradient(180deg, #FDE047 0%, #EAB308 100%)'
                              : 'rgba(255, 255, 255, 0.22)',
                            boxShadow: isSel ? '0 0 8px rgba(250, 204, 21, 0.5)' : 'none',
                            transition: 'height 0.3s ease, background 0.2s ease'
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: isSel ? 800 : 600,
                          color: isSel ? '#FFFFFF' : 'rgba(255, 255, 255, 0.65)'
                        }}
                      >
                        {d.l}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Minimal 3-Metric KPI Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                  paddingTop: '12px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  position: 'relative',
                  zIndex: 1
                }}
              >
                <div style={{ background: 'rgba(255, 255, 255, 0.04)', borderRadius: '14px', padding: '10px 8px', textAlign: 'center' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'rgba(255, 255, 255, 0.5)', display: 'block' }}>
                    Trips Done
                  </span>
                  <b style={{ fontSize: '15.5px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px', display: 'block' }}>
                    {selectedDay.trips} <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.45)' }}>/ 5</span>
                  </b>
                  <div style={{ width: '100%', height: '3px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '999px', marginTop: '6px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, (selectedDay.trips / 5) * 100)}%`, height: '100%', background: '#FACC15', borderRadius: '999px' }} />
                  </div>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.04)', borderRadius: '14px', padding: '10px 8px', textAlign: 'center' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'rgba(255, 255, 255, 0.5)', display: 'block' }}>
                    Duty Hours
                  </span>
                  <b style={{ fontSize: '15.5px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px', display: 'block' }}>
                    {selectedDay.hrs}h
                  </b>
                  <span style={{ fontSize: '10px', color: '#10B981', fontWeight: 650, marginTop: '2px', display: 'block' }}>
                    Active
                  </span>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.04)', borderRadius: '14px', padding: '10px 8px', textAlign: 'center' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'rgba(255, 255, 255, 0.5)', display: 'block' }}>
                    Bonus Target
                  </span>
                  <b style={{ fontSize: '15.5px', fontWeight: 800, color: '#FACC15', marginTop: '2px', display: 'block' }}>
                    +₹300
                  </b>
                  <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 600, marginTop: '2px', display: 'block' }}>
                    2 trips left
                  </span>
                </div>
              </div>

              {/* Settlement Footer Row */}
              <div
                style={{
                  marginTop: '12px',
                  paddingTop: '10px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '11.5px',
                  position: 'relative',
                  zIndex: 1
                }}
              >
                <span style={{ color: 'rgba(255, 255, 255, 0.6)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  🏦 HDFC Bank (•••• 4521) · 6:00 AM
                </span>
                <span
                  onClick={() => addToast('Auto-settlement scheduled for 6:00 AM. Free instant transfer available.', 'info')}
                  style={{
                    color: '#FACC15',
                    fontWeight: 750,
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Details →
                </span>
              </div>
            </div>

            {/* Trip Requests Section */}
            <div className="sec">
              <h3>Trip requests</h3>
              <span>{driverOnline ? requestedTrips.length : 0} waiting</span>
            </div>

            {driverOnline && requestedTrips.length > 0 ? (
              <div className="stack">
                {requestedTrips.map(t => {
                  const c = CATS[t.cat] || CATS.hourly;
                  return (
                    <article key={t.id} className="card trip">
                      <div className="trip-head" style={{ paddingBottom: '10px' }}>
                        <span className="trip-ic">
                          <Icon name={c.icon} size={22} />
                        </span>
                        <span className="grow">
                          <b>{c.name}</b> <span className="mut">· {t.qty || 1} {c.unit || 'hr'}</span>
                          <span className="sub">{t.id}</span>
                        </span>
                        <span className="amt" style={{ fontSize: '16px', color: 'var(--ink)' }}>
                          ₹{t.fare}
                        </span>
                      </div>
                      <div className="trip-body">
                        <div className="route">
                          <div className="ell">{t.pickup}</div>
                          <div className="ell">{t.drop_loc || 'Stays with rider for trip'}</div>
                        </div>
                        <div className="row small" style={{ marginTop: '8px' }}>
                          <span className="mut grow ell">
                            {t.rider?.name || 'Customer'} · ★ 4.9 · {t.car?.model || 'Hyundai Creta'} ({t.car?.trans || 'Auto'})
                          </span>
                          <span className="pill done">1.2 km away</span>
                        </div>
                        <div className="actions" style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                          <button className="btn primary sm" style={{ flex: 1 }} onClick={() => handleAccept(t.id)}>
                            Accept
                          </button>
                          <button className="btn danger sm" style={{ flex: 1 }} onClick={() => handleDecline(t.id)}>
                            Decline
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty">
                {driverOnline ? 'No new requests. Stay online to receive trips.' : 'You are currently offline. Turn on toggle to receive trip requests.'}
              </div>
            )}

            {/* Upcoming / Active Trips */}
            <div className="sec">
              <h3>Upcoming trips</h3>
              <span>{upcomingTrips.length} booked</span>
            </div>

            {upcomingTrips.length > 0 ? (
              <div className="stack">
                {upcomingTrips.map(t => {
                  const c = CATS[t.cat] || CATS.hourly;
                  const isInProgress = t.status === 'inprogress';
                  return (
                    <article key={t.id} className="card trip">
                      <div className="trip-head" style={{ paddingBottom: '10px' }}>
                        <span className="trip-ic">
                          <Icon name={c.icon} size={22} />
                        </span>
                        <span className="grow">
                          <b>{c.name}</b> <span className="mut">· {t.qty || 1} {c.unit || 'hr'}</span>
                          <span className="sub">{t.id}</span>
                        </span>
                        <span className="amt" style={{ fontSize: '16px', color: 'var(--ink)' }}>
                          ₹{t.fare}
                        </span>
                      </div>
                      <div className="trip-body">
                        <div className="route">
                          <div className="ell">{t.pickup}</div>
                          <div className="ell">{t.drop_loc || 'Stays with rider for trip'}</div>
                        </div>
                        <div className="row small" style={{ marginTop: '8px' }}>
                          <span className="mut grow ell">
                            {t.rider?.name} · {t.car?.model}
                          </span>
                          <span className="pill good">{isInProgress ? 'On Trip' : 'Scheduled'}</span>
                        </div>
                        {isInProgress ? (
                          <button
                            className="btn primary sm block"
                            style={{ marginTop: '10px', width: '100%' }}
                            onClick={() => handleComplete(t.id)}
                          >
                            Complete trip & Collect Fare
                          </button>
                        ) : (
                          <button
                            className="btn solid sm block"
                            style={{ marginTop: '10px', width: '100%' }}
                            onClick={() => handleAccept(t.id)}
                          >
                            Start trip
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty">Accepted and scheduled trips show up here.</div>
            )}
          </div>
        )}

        {/* ===================== HISTORY TAB ===================== */}
        {dTab === 'history' && (
          <div>
            <div className="hello" style={{ marginBottom: '14px' }}>
              <h1>History</h1>
              <p>Every trip you accepted</p>
            </div>
            <div className="chips" style={{ marginBottom: '14px', display: 'flex', gap: '6px' }}>
              {['all', 'done', 'up'].map(k => (
                <button
                  key={k}
                  className={`chip ${dFilter === k ? 'on' : ''}`}
                  onClick={() => setDFilter(k)}
                >
                  {k === 'all' ? 'All' : k === 'done' ? 'Completed' : 'Upcoming'}
                </button>
              ))}
            </div>

            <div className="trip-list">
              {trips
                .filter(t => {
                  if (dFilter === 'done') return t.status === 'completed';
                  if (dFilter === 'up') return t.status !== 'completed';
                  return true;
                })
                .map(t => {
                  const c = CATS[t.cat] || CATS.hourly;
                  return (
                    <div key={t.id} className="trip-row">
                      <div className="trip-row-head">
                        <span className="trip-row-ic">
                          <Icon name={c.icon} size={22} />
                        </span>
                        <div className="trip-row-main">
                          <b className="trip-row-title ell">{t.drop_loc || t.pickup}</b>
                          <span className="trip-row-sub ell">
                            {c.name} · {t.rider?.name || 'Customer'}
                          </span>
                        </div>
                        <div className="trip-row-right">
                          <span className="trip-row-amt">₹{t.fare}</span>
                          <span className={`pill ${t.status === 'completed' ? 'done' : 'good'}`}>
                            {t.status === 'completed' ? 'Completed' : 'Active'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ===================== WALLET TAB ===================== */}
        {dTab === 'wallet' && (
          <div>
            <div className="hello" style={{ marginBottom: '14px' }}>
              <h1>Wallet</h1>
              <p>Your Ridingo earnings</p>
            </div>

            <div className="walletcard">
              <div className="walletcard-head">
                <span className="walletcard-brand">Ridingo Partner</span>
                <span className="walletcard-pill">Digital Wallet</span>
              </div>
              <div className="walletcard-lab">Available Balance</div>
              <div className="walletcard-bal">₹4,850</div>
              <div className="walletcard-foot">
                <button
                  className="walletcard-add-btn"
                  onClick={() => addToast('Withdrawal of ₹4,850 initiated to HDFC Bank', 'check')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M7 17L17 7M17 7H7M17 7V17" />
                  </svg>
                  <span>Withdraw</span>
                </button>
                <span className="walletcard-cb">Total ₹34,500</span>
              </div>
            </div>

            <div className="sec" style={{ margin: '22px 0 10px' }}>
              <h3>Transaction</h3>
              <span className="sub" style={{ fontWeight: 600, color: 'var(--muted)' }}>View All</span>
            </div>

            <div className="tx-list">
              <div className="tx">
                <span className="tx-badge">T</span>
                <div className="tx-main">
                  <b className="tx-title ell">Trip TRP-1085 Earning</b>
                  <span className="tx-sub ell">Driver Pay · Today</span>
                </div>
                <span className="tx-amt pos">+₹699</span>
              </div>
              <div className="tx">
                <span className="tx-badge">W</span>
                <div className="tx-main">
                  <b className="tx-title ell">Bank Transfer to HDFC</b>
                  <span className="tx-sub ell">Withdrawal · Yesterday</span>
                </div>
                <span className="tx-amt">-₹5,000</span>
              </div>
            </div>
          </div>
        )}

        {/* ===================== PROFILE TAB ===================== */}
        {dTab === 'profile' && (
          <div style={{ paddingBottom: '32px' }}>
            {/* 1. Header */}
            <div className="hello" style={{ marginBottom: '16px' }}>
              <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: 'var(--ink)' }}>
                Profile
              </h1>
              <p style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '4px', margin: 0 }}>
                Driver partner & preferences
              </p>
            </div>

            {/* 2. Driver Profile Card (Same style as User App Profile Card) */}
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
                      {driverPartner?.avatar ? (
                        <img
                          src={driverPartner.avatar}
                          alt={driverPartner?.name || 'Driver'}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        (driverPartner?.name ? driverPartner.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'RK')
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
                      onClick={() => setActiveDriverModal('editDriver')}
                      title="Change Driver Photo & Details"
                    >
                      <Icon name="camera" size={11} />
                    </div>
                  </div>

                  {/* Driver Meta */}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <b style={{ fontSize: '17px', fontWeight: 700, color: 'var(--ink)', display: 'block', lineHeight: 1.25 }}>
                      {driverPartner?.name || 'Ravi Kumar'}
                    </b>
                    <span style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: '3px', display: 'block' }}>
                      ★ {driverPartner?.rating || '4.8'} · {driverPartner?.tripsCount || 142} trips on Ridingo
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveDriverModal('editDriver')}
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

              {/* Verified Chauffeur & Partner Badges */}
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
                    Verified Chauffeur
                  </span>
                  <span style={{ fontSize: '12.5px', color: 'var(--muted)', fontWeight: 500 }}>
                    Partner since 2024
                  </span>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>
                  🎖️ {driverPartner?.experienceYears || 8} Yrs Experience
                </span>
              </div>
            </div>

            {/* 3. TRIP REQUESTS */}
            <div className="prof-section-title">Trip Requests</div>
            <div className="card" style={{ padding: '0 16px', borderRadius: '18px', marginBottom: '20px' }}>
              {/* Row 1: Trip request popups */}
              <div className="prof-set-row">
                <div className="prof-set-info">
                  <b className="prof-set-title">Trip Request Popups</b>
                  <span className="prof-set-sub">Show instant popup notification for nearby bookings</span>
                </div>
                <button
                  type="button"
                  className={`ios-toggle ${driverPartner?.popups !== false ? 'on' : ''}`}
                  onClick={() => handleDriverToggle('popups', driverPartner?.popups === false, 'Trip Popups')}
                  aria-label="Toggle Trip Popups"
                >
                  <span className="ios-toggle-thumb" />
                </button>
              </div>

              {/* Row 2: Request sound */}
              <div className="prof-set-row">
                <div className="prof-set-info">
                  <b className="prof-set-title">Request Sound Alert</b>
                  <span className="prof-set-sub">Play chime sound when booking request is received</span>
                </div>
                <button
                  type="button"
                  className={`ios-toggle ${driverPartner?.sound !== false ? 'on' : ''}`}
                  onClick={() => handleDriverToggle('sound', driverPartner?.sound === false, 'Request Sound Alert')}
                  aria-label="Toggle Request Sound"
                >
                  <span className="ios-toggle-thumb" />
                </button>
              </div>

              {/* Row 3: Auto-queue next booking */}
              <div className="prof-set-row">
                <div className="prof-set-info">
                  <b className="prof-set-title">Auto-Queue Next Booking</b>
                  <span className="prof-set-sub">Automatically queue next trip when current completes</span>
                </div>
                <button
                  type="button"
                  className={`ios-toggle ${driverPartner?.autoQueue ? 'on' : ''}`}
                  onClick={() => handleDriverToggle('autoQueue', !driverPartner?.autoQueue, 'Auto-Queue Next Booking')}
                  aria-label="Toggle Auto-Queue"
                >
                  <span className="ios-toggle-thumb" />
                </button>
              </div>
            </div>

            {/* 4. SERVICES I ACCEPT */}
            <div className="prof-section-title">Services I Accept</div>
            <div className="card" style={{ padding: '0 16px', borderRadius: '18px', marginBottom: '20px' }}>
              {/* Hourly */}
              <div className="prof-set-row">
                <div className="prof-set-info">
                  <b className="prof-set-title">Hourly Chauffeur</b>
                  <span className="prof-set-sub">₹250/hr · 2 to 12 hours minimum booking</span>
                </div>
                <button
                  type="button"
                  className={`ios-toggle ${driverPartner?.services?.hourly !== false ? 'on' : ''}`}
                  onClick={() => handleToggleService('hourly')}
                  aria-label="Toggle Hourly Chauffeur"
                >
                  <span className="ios-toggle-thumb" />
                </button>
              </div>

              {/* Full Day */}
              <div className="prof-set-row">
                <div className="prof-set-info">
                  <b className="prof-set-title">Full Day Chauffeur</b>
                  <span className="prof-set-sub">₹1,800/day · 8 hours dedicated chauffeur service</span>
                </div>
                <button
                  type="button"
                  className={`ios-toggle ${driverPartner?.services?.daily !== false ? 'on' : ''}`}
                  onClick={() => handleToggleService('daily')}
                  aria-label="Toggle Full Day Chauffeur"
                >
                  <span className="ios-toggle-thumb" />
                </button>
              </div>

              {/* Airport */}
              <div className="prof-set-row">
                <div className="prof-set-info">
                  <b className="prof-set-title">Airport Transfer</b>
                  <span className="prof-set-sub">₹900 flat · Terminal pickup & drop chauffeur</span>
                </div>
                <button
                  type="button"
                  className={`ios-toggle ${driverPartner?.services?.airport !== false ? 'on' : ''}`}
                  onClick={() => handleToggleService('airport')}
                  aria-label="Toggle Airport Transfer"
                >
                  <span className="ios-toggle-thumb" />
                </button>
              </div>

              {/* Outstation */}
              <div className="prof-set-row">
                <div className="prof-set-info">
                  <b className="prof-set-title">Outstation Chauffeur</b>
                  <span className="prof-set-sub">₹2,200/day · Round trips & intercity travel</span>
                </div>
                <button
                  type="button"
                  className={`ios-toggle ${driverPartner?.services?.outstation !== false ? 'on' : ''}`}
                  onClick={() => handleToggleService('outstation')}
                  aria-label="Toggle Outstation Chauffeur"
                >
                  <span className="ios-toggle-thumb" />
                </button>
              </div>

              {/* Night & Events */}
              <div className="prof-set-row">
                <div className="prof-set-info">
                  <b className="prof-set-title">Night & Events</b>
                  <span className="prof-set-sub">₹350/hr · Parties, dining & late night returns</span>
                </div>
                <button
                  type="button"
                  className={`ios-toggle ${driverPartner?.services?.event !== false ? 'on' : ''}`}
                  onClick={() => handleToggleService('event')}
                  aria-label="Toggle Night & Events"
                >
                  <span className="ios-toggle-thumb" />
                </button>
              </div>
            </div>

            {/* 5. CARS I CAN DRIVE */}
            <div className="prof-section-title">Cars I Can Drive</div>
            <div className="card" style={{ padding: '0 16px', borderRadius: '18px', marginBottom: '20px' }}>
              <div
                className="prof-set-row"
                style={{ cursor: 'pointer' }}
                onClick={() => setActiveDriverModal('cars')}
              >
                <div className="prof-set-info">
                  <b className="prof-set-title">Manual Transmission</b>
                  <span className="prof-set-sub">H-pattern clutch & gearshift certified</span>
                </div>
                <div className="prof-set-action-btn">
                  <span>Certified</span>
                  <Icon name="chevronRight" size={15} />
                </div>
              </div>

              <div
                className="prof-set-row"
                style={{ cursor: 'pointer' }}
                onClick={() => setActiveDriverModal('cars')}
              >
                <div className="prof-set-info">
                  <b className="prof-set-title">Automatic Gearbox</b>
                  <span className="prof-set-sub">Torque Converter, DCT, CVT, AMT certified</span>
                </div>
                <div className="prof-set-action-btn">
                  <span>Certified</span>
                  <Icon name="chevronRight" size={15} />
                </div>
              </div>

              <div
                className="prof-set-row"
                style={{ cursor: 'pointer' }}
                onClick={() => setActiveDriverModal('cars')}
              >
                <div className="prof-set-info">
                  <b className="prof-set-title">IMT & Hybrid</b>
                  <span className="prof-set-sub">Clutchless manual & strong hybrids</span>
                </div>
                <div className="prof-set-action-btn">
                  <span>Certified</span>
                  <Icon name="chevronRight" size={15} />
                </div>
              </div>

              <div
                className="prof-set-row"
                style={{ cursor: 'pointer' }}
                onClick={() => setActiveDriverModal('cars')}
              >
                <div className="prof-set-info">
                  <b className="prof-set-title">Luxury & High-end EVs</b>
                  <span className="prof-set-sub">Mercedes, BMW, Audi, and electric luxury</span>
                </div>
                <div className="prof-set-action-btn">
                  <span>Certified</span>
                  <Icon name="chevronRight" size={15} />
                </div>
              </div>
            </div>

            {/* 6. PAYOUT & BANK ACCOUNT */}
            <div className="prof-section-title">Payout & Bank Account</div>
            <div className="card" style={{ padding: '0 16px', borderRadius: '18px', marginBottom: '20px' }}>
              <div
                className="prof-set-row"
                style={{ cursor: 'pointer' }}
                onClick={() => setActiveDriverModal('payout')}
              >
                <div className="prof-set-info">
                  <b className="prof-set-title">{driverPartner?.bankName || 'HDFC Bank'} {driverPartner?.bankAccount || '•••• 4521'}</b>
                  <span className="prof-set-sub">Automated daily withdrawal destination</span>
                </div>
                <div className="prof-set-action-btn">
                  <span>Primary</span>
                  <Icon name="chevronRight" size={15} />
                </div>
              </div>

              <div
                className="prof-set-row"
                style={{ cursor: 'pointer' }}
                onClick={() => setActiveDriverModal('payout')}
              >
                <div className="prof-set-info">
                  <b className="prof-set-title">Instant UPI Payout</b>
                  <span className="prof-set-sub">{driverPartner?.upiId || 'ravi.kumar@okhdfcbank'}</span>
                </div>
                <div className="prof-set-action-btn">
                  <span>Verified</span>
                  <Icon name="chevronRight" size={15} />
                </div>
              </div>

              <div
                className="prof-set-row"
                style={{ cursor: 'pointer' }}
                onClick={() => setActiveDriverModal('settlement')}
              >
                <div className="prof-set-info">
                  <b className="prof-set-title">Settlement Cycle</b>
                  <span className="prof-set-sub">Auto-credited every morning at 6:00 AM</span>
                </div>
                <div className="prof-set-action-btn">
                  <span>Daily 6 AM</span>
                  <Icon name="chevronRight" size={15} />
                </div>
              </div>
            </div>

            {/* 7. DRIVER DOCUMENTS & KYC */}
            <div className="prof-section-title">Documents & Verification</div>
            <div className="card" style={{ padding: '0 16px', borderRadius: '18px', marginBottom: '20px' }}>
              <div
                className="prof-set-row"
                style={{ cursor: 'pointer' }}
                onClick={() => setActiveDriverModal('documents')}
              >
                <div className="prof-set-info">
                  <b className="prof-set-title">Commercial Driving License</b>
                  <span className="prof-set-sub">#{driverPartner?.dlNumber || 'KL-07-20160049281'} · Valid till Dec 2029</span>
                </div>
                <div className="prof-set-action-btn">
                  <span>Verified</span>
                  <Icon name="chevronRight" size={15} />
                </div>
              </div>

              <div
                className="prof-set-row"
                style={{ cursor: 'pointer' }}
                onClick={() => setActiveDriverModal('documents')}
              >
                <div className="prof-set-info">
                  <b className="prof-set-title">Police Clearance Certificate</b>
                  <span className="prof-set-sub">Issued by Ernakulam City Police Department</span>
                </div>
                <div className="prof-set-action-btn">
                  <span>Approved</span>
                  <Icon name="chevronRight" size={15} />
                </div>
              </div>

              <div
                className="prof-set-row"
                style={{ cursor: 'pointer' }}
                onClick={() => setActiveDriverModal('documents')}
              >
                <div className="prof-set-info">
                  <b className="prof-set-title">Chauffeur Badge</b>
                  <span className="prof-set-sub">Badge #{driverPartner?.badgeNumber || 'KL-07-2024-CH08'} · Ernakulam RTO</span>
                </div>
                <div className="prof-set-action-btn">
                  <span>Active</span>
                  <Icon name="chevronRight" size={15} />
                </div>
              </div>
            </div>

            {/* 8. APP & PRIVACY */}
            <div className="prof-section-title">App & Privacy</div>
            <div className="card" style={{ padding: '0 16px', borderRadius: '18px', marginBottom: '20px' }}>
              {/* Biometric */}
              <div className="prof-set-row">
                <div className="prof-set-info">
                  <b className="prof-set-title">Biometric / App Lock</b>
                  <span className="prof-set-sub">Require Face ID or Fingerprint on app open</span>
                </div>
                <button
                  type="button"
                  className={`ios-toggle ${driverPartner?.biometric !== false ? 'on' : ''}`}
                  onClick={() => handleDriverToggle('biometric', driverPartner?.biometric === false, 'Biometric Lock')}
                  aria-label="Toggle Biometric Lock"
                >
                  <span className="ios-toggle-thumb" />
                </button>
              </div>

              {/* Haptic */}
              <div className="prof-set-row">
                <div className="prof-set-info">
                  <b className="prof-set-title">Haptic Feedback</b>
                  <span className="prof-set-sub">Subtle vibration when accepting rides and alerts</span>
                </div>
                <button
                  type="button"
                  className={`ios-toggle ${driverPartner?.haptic !== false ? 'on' : ''}`}
                  onClick={() => handleDriverToggle('haptic', driverPartner?.haptic === false, 'Haptic Feedback')}
                  aria-label="Toggle Haptic Feedback"
                >
                  <span className="ios-toggle-thumb" />
                </button>
              </div>

              {/* Appearance */}
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

            {/* 9. DRIVER PARTNER CARE */}
            <div className="prof-section-title">Driver Partner Care</div>
            <div className="card" style={{ padding: '0 16px', borderRadius: '18px', marginBottom: '22px' }}>
              <div
                className="prof-set-row"
                style={{ cursor: 'pointer' }}
                onClick={() => setActiveDriverModal('help')}
              >
                <div className="prof-set-info">
                  <b className="prof-set-title">24x7 Partner Helpline</b>
                  <span className="prof-set-sub">Dedicated chauffeur roadside & emergency care</span>
                </div>
                <div className="prof-set-action-btn">
                  <span>Call Free</span>
                  <Icon name="chevronRight" size={15} />
                </div>
              </div>

              <div
                className="prof-set-row"
                style={{ cursor: 'pointer' }}
                onClick={() => setActiveDriverModal('incentives')}
              >
                <div className="prof-set-info">
                  <b className="prof-set-title">Partner Guidelines & Incentives</b>
                  <span className="prof-set-sub">Weekly trip milestones, bonus rates & safety rules</span>
                </div>
                <div className="prof-set-action-btn">
                  <span>Guidelines</span>
                  <Icon name="chevronRight" size={15} />
                </div>
              </div>
            </div>

            {/* 10. Footer: App Version & Sign Out Button */}
            <div style={{ textAlign: 'center', padding: '16px 0 12px', width: '100%' }}>
              <BrandLogo
                height={20}
                width={80}
                center
                style={{ opacity: 0.8, marginBottom: '8px' }}
              />
              <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}>
                Ridingo Driver Partner · v2.4.2
              </p>
              <button
                type="button"
                onClick={() => {
                  setDriverOnline(false);
                  addToast('Signed out of Driver Partner account. Set to offline.', 'info');
                }}
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
                DRIVER INTERACTIVE SETTING MODAL SHEETS
               ========================================================== */}
            {activeDriverModal && (
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
                <div
                  style={{ position: 'absolute', inset: 0 }}
                  onClick={() => setActiveDriverModal(null)}
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
                  <div style={{ width: '38px', height: '4px', borderRadius: '999px', background: 'var(--line)', margin: '0 auto 16px' }} />

                  {/* MODAL 1: EDIT DRIVER PROFILE */}
                  {activeDriverModal === 'editDriver' && (
                    <form onSubmit={handleSaveDriverProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                        Edit Chauffeur Profile
                      </h3>

                      {/* Chauffeur Photo Upload / Edit */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '6px 0 10px' }}>
                        <div style={{ position: 'relative' }}>
                          <div
                            onClick={() => driverFileInputRef.current?.click()}
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
                            title="Tap to change chauffeur photo"
                          >
                            {editDriverAvatar ? (
                              <img src={editDriverAvatar} alt="Chauffeur Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              (editDriverName ? editDriverName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'RK')
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => driverFileInputRef.current?.click()}
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
                            title="Upload Chauffeur Photo"
                          >
                            <Icon name="camera" size={13} />
                          </button>
                        </div>

                        <input
                          ref={driverFileInputRef}
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={handleDriverAvatarFileSelect}
                        />

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <button
                            type="button"
                            onClick={() => driverFileInputRef.current?.click()}
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
                            <span>{editDriverAvatar ? 'Change Photo' : 'Upload Photo'}</span>
                          </button>
                          {editDriverAvatar && (
                            <button
                              type="button"
                              onClick={() => { setEditDriverAvatar(''); addToast('Photo removed (initials will be used)', 'info'); }}
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
                          Partner Full Name
                        </label>
                        <input
                          type="text"
                          value={editDriverName}
                          onChange={e => setEditDriverName(e.target.value)}
                          style={{ width: '100%', height: '46px', borderRadius: '13px', border: '1.5px solid var(--line)', background: 'var(--card)', padding: '0 14px', fontSize: '14.5px', color: 'var(--ink)', outline: 'none' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                          Mobile Number
                        </label>
                        <input
                          type="text"
                          value={editDriverPhone}
                          onChange={e => setEditDriverPhone(e.target.value)}
                          style={{ width: '100%', height: '46px', borderRadius: '13px', border: '1.5px solid var(--line)', background: 'var(--card)', padding: '0 14px', fontSize: '14.5px', color: 'var(--ink)', outline: 'none' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                          Experience (Years)
                        </label>
                        <input
                          type="number"
                          value={editDriverExp}
                          onChange={e => setEditDriverExp(e.target.value)}
                          style={{ width: '100%', height: '46px', borderRadius: '13px', border: '1.5px solid var(--line)', background: 'var(--card)', padding: '0 14px', fontSize: '14.5px', color: 'var(--ink)', outline: 'none' }}
                        />
                      </div>

                      <button
                        type="submit"
                        className="btn"
                        style={{ height: '48px', borderRadius: '14px', background: 'var(--yellow)', color: '#111827', border: 'none', fontSize: '15px', fontWeight: 700, cursor: 'pointer', marginTop: '6px' }}
                      >
                        Save Chauffeur Details
                      </button>
                    </form>
                  )}

                  {/* MODAL 2: CAR TRANSMISSION CERTIFICATIONS */}
                  {activeDriverModal === 'cars' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                        Vehicle Certifications
                      </h3>
                      <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
                        All certified transmission competencies verified by Ridingo Master Instructors.
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {[
                          { title: 'Manual Transmission', badge: 'Level 3 Master', valid: 'Permanent' },
                          { title: 'Automatic (TC / DCT / CVT / AMT)', badge: 'Level 3 Master', valid: 'Permanent' },
                          { title: 'Intelligent Manual (iMT) & Strong Hybrids', badge: 'Certified Specialist', valid: 'Valid till 2028' },
                          { title: 'Luxury Sedans & High-Voltage EVs', badge: 'VIP Chauffeur Certified', valid: 'Valid till 2027' }
                        ].map((c, i) => (
                          <div
                            key={i}
                            style={{ padding: '12px 14px', borderRadius: '14px', background: 'var(--card)', border: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                          >
                            <div>
                              <b style={{ fontSize: '14px', color: 'var(--ink)', display: 'block' }}>{c.title}</b>
                              <span style={{ fontSize: '12px', color: '#16A34A', fontWeight: 600 }}>● {c.badge}</span>
                            </div>
                            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{c.valid}</span>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          addToast('Endorsement request submitted to Operations Desk', 'check');
                          setActiveDriverModal(null);
                        }}
                        className="btn"
                        style={{ height: '46px', borderRadius: '14px', background: 'var(--yellow)', color: '#111827', border: 'none', fontSize: '14px', fontWeight: 700, cursor: 'pointer', marginTop: '6px' }}
                      >
                        + Request New Vehicle Endorsement
                      </button>
                    </div>
                  )}

                  {/* MODAL 3: PAYOUT & BANK ACCOUNT */}
                  {activeDriverModal === 'payout' && (
                    <form onSubmit={handleSavePayout} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                        Payout Account & UPI
                      </h3>
                      <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
                        Daily trip earnings and incentive bonuses are auto-credited to these verified coordinates.
                      </p>

                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                          Bank Name
                        </label>
                        <input
                          type="text"
                          value={editBankName}
                          onChange={e => setEditBankName(e.target.value)}
                          style={{ width: '100%', height: '46px', borderRadius: '13px', border: '1.5px solid var(--line)', background: 'var(--card)', padding: '0 14px', fontSize: '14.5px', color: 'var(--ink)', outline: 'none' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                          Account Number
                        </label>
                        <input
                          type="text"
                          value={editBankAccount}
                          onChange={e => setEditBankAccount(e.target.value)}
                          style={{ width: '100%', height: '46px', borderRadius: '13px', border: '1.5px solid var(--line)', background: 'var(--card)', padding: '0 14px', fontSize: '14.5px', color: 'var(--ink)', outline: 'none' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                          UPI ID (VPA)
                        </label>
                        <input
                          type="text"
                          value={editUpiId}
                          onChange={e => setEditUpiId(e.target.value)}
                          style={{ width: '100%', height: '46px', borderRadius: '13px', border: '1.5px solid var(--line)', background: 'var(--card)', padding: '0 14px', fontSize: '14.5px', color: 'var(--ink)', outline: 'none' }}
                        />
                      </div>

                      <button
                        type="submit"
                        className="btn"
                        style={{ height: '48px', borderRadius: '14px', background: 'var(--yellow)', color: '#111827', border: 'none', fontSize: '15px', fontWeight: 700, cursor: 'pointer', marginTop: '6px' }}
                      >
                        Save Payout Coordinates
                      </button>
                    </form>
                  )}

                  {/* MODAL 4: SETTLEMENT HISTORY */}
                  {activeDriverModal === 'settlement' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                        Settlement Cycle & History
                      </h3>
                      <div style={{ padding: '14px', borderRadius: '14px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <b style={{ fontSize: '14px', color: '#16A34A' }}>Daily Auto-Transfer</b>
                          <span style={{ fontSize: '12.5px', color: 'var(--muted)', display: 'block' }}>Next settlement at 6:00 AM tomorrow</span>
                        </div>
                        <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ink)' }}>Active</span>
                      </div>

                      <b style={{ fontSize: '13px', color: 'var(--ink)', marginTop: '4px' }}>Recent Daily Settlements</b>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {[
                          { date: 'Today, 6:00 AM', amt: '₹2,450.00', ref: 'IMPS/HDFC/629104', status: 'Settled' },
                          { date: 'Yesterday, 6:00 AM', amt: '₹3,100.00', ref: 'IMPS/HDFC/628991', status: 'Settled' },
                          { date: '03 Oct, 6:00 AM', amt: '₹1,800.00', ref: 'IMPS/HDFC/627884', status: 'Settled' }
                        ].map((s, idx) => (
                          <div key={idx} style={{ padding: '10px 14px', borderRadius: '12px', background: 'var(--card)', border: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <b style={{ fontSize: '13.5px', color: 'var(--ink)' }}>{s.date}</b>
                              <span style={{ fontSize: '11.5px', color: 'var(--muted)', display: 'block' }}>Ref: {s.ref}</span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <b style={{ fontSize: '14.5px', color: '#16A34A', display: 'block' }}>{s.amt}</b>
                              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>✓ {s.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveDriverModal(null)}
                        className="btn"
                        style={{ height: '46px', borderRadius: '14px', background: 'var(--solid)', color: 'var(--on-solid)', border: 'none', fontSize: '14.5px', fontWeight: 700, cursor: 'pointer', marginTop: '4px' }}
                      >
                        Done
                      </button>
                    </div>
                  )}

                  {/* MODAL 5: DOCUMENTS & VERIFICATION */}
                  {activeDriverModal === 'documents' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                        Chauffeur KYC & Documents
                      </h3>
                      <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
                        Official state documents verified and authenticated on DigiLocker.
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {[
                          { title: 'Commercial Driver License', id: driverPartner?.dlNumber || 'KL-07-20160049281', valid: 'Valid till 14 Dec 2029', status: 'Verified' },
                          { title: 'Police Clearance Certificate', id: 'PCC-ER-2024-8819', valid: 'Clear criminal record', status: 'Approved' },
                          { title: 'Professional Chauffeur Badge', id: driverPartner?.badgeNumber || 'KL-07-2024-CH08', valid: 'Ernakulam RTO Endorsement', status: 'Active' },
                          { title: 'Aadhaar Biometric KYC', id: '•••• •••• 9128', valid: 'Verified via UIDAI', status: 'Completed' }
                        ].map((d, i) => (
                          <div key={i} style={{ padding: '12px 14px', borderRadius: '14px', background: 'var(--card)', border: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <b style={{ fontSize: '13.5px', color: 'var(--ink)', display: 'block' }}>{d.title}</b>
                              <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block' }}>{d.id} · {d.valid}</span>
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#16A34A', background: 'rgba(34, 197, 94, 0.12)', padding: '4px 8px', borderRadius: '6px' }}>
                              ✓ {d.status}
                            </span>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          addToast('Document renewal upload desk opened', 'info');
                          setActiveDriverModal(null);
                        }}
                        className="btn"
                        style={{ height: '46px', borderRadius: '14px', background: 'var(--yellow)', color: '#111827', border: 'none', fontSize: '14.5px', fontWeight: 700, cursor: 'pointer', marginTop: '4px' }}
                      >
                        + Upload Renewed Document
                      </button>
                    </div>
                  )}

                  {/* MODAL 6: DRIVER PARTNER CARE */}
                  {activeDriverModal === 'help' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                        24x7 Driver Partner Care
                      </h3>
                      <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
                        Dedicated roadside assistance, passenger dispute resolution, and on-trip security.
                      </p>

                      <div style={{ padding: '16px', borderRadius: '16px', background: 'var(--card)', border: '1.5px solid var(--line)', textAlign: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.05em' }}>
                          Partner Emergency Desk
                        </span>
                        <b style={{ fontSize: '22px', fontWeight: 800, color: 'var(--ink)', display: 'block', marginTop: '4px' }}>
                          +91 80001 88888
                        </b>
                        <span style={{ fontSize: '12.5px', color: '#16A34A', fontWeight: 600, display: 'block', marginTop: '4px' }}>
                          ● Instant Dispatch Response
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            addToast('Dialing Driver Partner Care...', 'info');
                            window.location.href = 'tel:918000188888';
                          }}
                          style={{ height: '48px', borderRadius: '14px', background: '#16A34A', color: '#FFFFFF', border: 'none', fontSize: '14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        >
                          <span>📞 Call Care Free</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            addToast('Roadside SOS triggered! Operations dispatched.', 'check');
                            setActiveDriverModal(null);
                          }}
                          style={{ height: '48px', borderRadius: '14px', background: '#DC2626', color: '#FFFFFF', border: 'none', fontSize: '14px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        >
                          <span>🚨 Roadside SOS</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* MODAL 7: PARTNER INCENTIVES */}
                  {activeDriverModal === 'incentives' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
                        Weekly Partner Incentives
                      </h3>
                      <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
                        Complete target trips each week to unlock guaranteed bonus payouts.
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {[
                          { target: 'Tier 1: 20 Completed Trips', reward: '+₹1,500 Bonus', status: 'In Progress (14/20)' },
                          { target: 'Tier 2: 35 Completed Trips', reward: '+₹3,000 Bonus', status: 'Locked' },
                          { target: 'Tier 3: 50 Completed Trips', reward: '+₹5,500 Bonus', status: 'Locked' },
                          { target: '5-Star Rating Maintenance', reward: '+₹500 Safety Bonus', status: 'Active (4.8 ★)' }
                        ].map((m, idx) => (
                          <div key={idx} style={{ padding: '12px 14px', borderRadius: '12px', background: 'var(--card)', border: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <b style={{ fontSize: '13.5px', color: 'var(--ink)', display: 'block' }}>{m.target}</b>
                              <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block' }}>{m.status}</span>
                            </div>
                            <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--on-yellow)', background: 'rgba(255, 199, 10, 0.15)', padding: '4px 8px', borderRadius: '8px' }}>
                              {m.reward}
                            </span>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveDriverModal(null)}
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
        )}
      </div>

      {/* Driver Bottom Navigation */}
      <nav className="nav" id="d-nav" aria-label="Driver app">
        <button
          className={`nv ${dTab === 'dash' ? 'on' : ''}`}
          onClick={() => setDTab('dash')}
        >
          <span className="nv-i">
            <Icon name="grid" size={23} />
          </span>
          <span className="nv-l">Dashboard</span>
        </button>

        <button
          className={`nv ${dTab === 'history' ? 'on' : ''}`}
          onClick={() => setDTab('history')}
        >
          <span className="nv-i">
            <Icon name="history" size={23} />
          </span>
          <span className="nv-l">History</span>
        </button>

        <button
          className={`nv ${dTab === 'wallet' ? 'on' : ''}`}
          onClick={() => setDTab('wallet')}
        >
          <span className="nv-i">
            <Icon name="wallet" size={23} />
          </span>
          <span className="nv-l">Wallet</span>
        </button>

        <button
          className={`nv ${dTab === 'profile' ? 'on' : ''}`}
          onClick={() => setDTab('profile')}
        >
          <span className="nv-i">
            <Icon name="user" size={23} />
          </span>
          <span className="nv-l">Profile</span>
        </button>
      </nav>

      <div className="homebar" aria-hidden="true" />
    </div>
  );
}
