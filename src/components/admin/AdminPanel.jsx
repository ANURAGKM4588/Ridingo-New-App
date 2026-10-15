import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import BrandLogo from '../BrandLogo';
import {
  getLocalDriverRegistry,
  fetchDriversFromSupabase,
  approveDriverKyc,
  rejectDriverKyc,
  toggleSuspendDriver,
  registerDriverProfile,
  calculateCrmTelemetry
} from '../../services/driverService';
import { getLocalUserRegistry } from '../../services/userService';

// Clean minimal SVG icons (Replacing all emojis for a sleek modern UI)
const Icons = {
  Grid: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  ),
  SteeringWheel: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="2"/><path d="M12 2v8"/><path d="m4.93 18.07 5.66-5.66"/><path d="m19.07 18.07-5.66-5.66"/>
    </svg>
  ),
  Chart: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
    </svg>
  ),
  Route: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a4.5 4.5 0 0 0 0-9H7a3 3 0 0 1 0-6h11"/><circle cx="18" cy="4" r="3"/>
    </svg>
  ),
  Users: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Search: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
    </svg>
  ),
  Phone: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  ),
  Mail: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  ),
  MapPin: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  IdCard: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>
    </svg>
  ),
  Check: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Close: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/>
    </svg>
  ),
  Calendar: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
    </svg>
  ),
  User: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  Car: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 11.1 2 11.5 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M5 17h10"/>
    </svg>
  )
};

export default function AdminPanel() {
  const { trips, setView, addToast } = useApp();

  // Active CRM Navigation Tab: 'drivers' | 'telemetry' | 'trips' | 'users'
  const [activeTab, setActiveTab] = useState('drivers');

  // Drivers sub-category tab: 'all' | 'new_registration' | 'old_registered'
  const [driverCategory, setDriverCategory] = useState('all');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Drivers state
  const [drivers, setDrivers] = useState(getLocalDriverRegistry());
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [isPhotoPreviewOpen, setIsPhotoPreviewOpen] = useState(null);
  const [isAddDriverModalOpen, setIsAddDriverModalOpen] = useState(false);

  // New Driver Form state
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverEmail, setNewDriverEmail] = useState('');
  const [newDriverPhone, setNewDriverPhone] = useState('');
  const [newDriverAddress, setNewDriverAddress] = useState('');
  const [newDriverStreet, setNewDriverStreet] = useState('');
  const [newDriverCity, setNewDriverCity] = useState('Kochi');
  const [newDriverPin, setNewDriverPin] = useState('682030');
  const [newDriverDl, setNewDriverDl] = useState('');
  const [newDriverAadhar, setNewDriverAadhar] = useState('');

  // Interactive Fare Simulator state
  const [simFare, setSimFare] = useState(850);
  const [simCommission, setSimCommission] = useState(15);
  const [simTripVolume, setSimTripVolume] = useState(25);

  // Rejection modal state
  const [rejectModalDriverId, setRejectModalDriverId] = useState(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');

  // Sync from Supabase on mount
  useEffect(() => {
    let mounted = true;
    fetchDriversFromSupabase().then(res => {
      if (mounted && Array.isArray(res)) {
        setDrivers(res);
      }
    });
    return () => { mounted = false; };
  }, []);

  // Telemetry calculation
  const telemetry = useMemo(() => {
    return calculateCrmTelemetry(trips, drivers);
  }, [trips, drivers]);

  // Registered customer accounts
  const usersList = useMemo(() => {
    const list = getLocalUserRegistry();
    if (list.length === 0) {
      return [
        { id: 'RDU-10821', name: 'Anurag K M', email: 'anurag@ridingo.in', phone: '+91 98401 23456', city: 'Kochi', rides: 14, spent: 11900, registeredAt: '2026-08-10', status: 'active' },
        { id: 'RDU-29401', name: 'Pooja Nair', email: 'pooja.nair@gmail.com', phone: '+91 97451 89201', city: 'Thiruvananthapuram', rides: 8, spent: 6800, registeredAt: '2026-09-01', status: 'active' },
        { id: 'RDU-38910', name: 'Vishnu Das', email: 'vishnu.das@tech.in', phone: '+91 94470 19284', city: 'Kozhikode', rides: 22, spent: 18700, registeredAt: '2026-07-15', status: 'active' },
        { id: 'RDU-48192', name: 'Neha Varghese', email: 'neha.varghese@gmail.com', phone: '+91 98470 11928', city: 'Thrissur', rides: 6, spent: 5100, registeredAt: '2026-09-18', status: 'active' }
      ];
    }
    return list;
  }, []);

  // Filtered drivers
  const filteredDrivers = useMemo(() => {
    return drivers.filter(d => {
      const isNew = d.category === 'new_registration' || d.status === 'pending';
      if (driverCategory === 'new_registration' && !isNew) return false;
      if (driverCategory === 'old_registered' && isNew) return false;

      if (statusFilter !== 'all' && d.status !== statusFilter) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        d.name?.toLowerCase().includes(q) ||
        d.id?.toLowerCase().includes(q) ||
        d.phone?.toLowerCase().includes(q) ||
        d.email?.toLowerCase().includes(q) ||
        d.city?.toLowerCase().includes(q) ||
        d.pincode?.includes(q) ||
        d.dlNumber?.toLowerCase().includes(q)
      );
    });
  }, [drivers, driverCategory, statusFilter, searchQuery]);

  const newCount = useMemo(() => drivers.filter(d => d.category === 'new_registration' || d.status === 'pending').length, [drivers]);
  const oldCount = useMemo(() => drivers.filter(d => d.category === 'old_registered' || d.status === 'approved').length, [drivers]);

  // Actions
  const handleApprove = async (driverId) => {
    const updated = await approveDriverKyc(driverId);
    setDrivers(updated);
    if (selectedDriver?.id === driverId) {
      setSelectedDriver(prev => ({ ...prev, category: 'old_registered', status: 'approved' }));
    }
    addToast(`Driver ${driverId} verified & activated!`, 'check');
  };

  const handleOpenRejectModal = (driverId) => {
    setRejectModalDriverId(driverId);
    setRejectReasonInput('Document photo blurry / Address verification mismatch');
  };

  const handleConfirmReject = async () => {
    if (!rejectModalDriverId) return;
    const reason = rejectReasonInput.trim() || 'KYC document verification failed';
    const updated = await rejectDriverKyc(rejectModalDriverId, reason);
    setDrivers(updated);
    if (selectedDriver?.id === rejectModalDriverId) {
      setSelectedDriver(prev => ({ ...prev, status: 'rejected', rejectReason: reason }));
    }
    setRejectModalDriverId(null);
    setRejectReasonInput('');
    addToast(`Driver ${rejectModalDriverId} KYC rejected.`, 'warn');
  };

  const handleToggleSuspend = async (driverId) => {
    const updated = await toggleSuspendDriver(driverId);
    setDrivers(updated);
    if (selectedDriver?.id === driverId) {
      const found = updated.find(d => d.id === driverId);
      if (found) setSelectedDriver(found);
    }
    addToast(`Driver status updated for ${driverId}`, 'info');
  };

  const handleCreateDriverSubmit = async (e) => {
    e.preventDefault();
    if (!newDriverName || !newDriverPhone || !newDriverEmail) {
      addToast('Please fill all mandatory driver fields', 'warn');
      return;
    }
    const created = await registerDriverProfile({
      name: newDriverName.trim(),
      phone: newDriverPhone.trim(),
      email: newDriverEmail.trim(),
      homeAddress: newDriverAddress.trim(),
      street: newDriverStreet.trim(),
      city: newDriverCity.trim(),
      pincode: newDriverPin.trim(),
      dlNumber: newDriverDl.trim().toUpperCase(),
      aadharNumber: newDriverAadhar.trim()
    });
    setDrivers(prev => [created, ...prev]);
    setIsAddDriverModalOpen(false);
    setNewDriverName('');
    setNewDriverEmail('');
    setNewDriverPhone('');
    setNewDriverDl('');
    setNewDriverAadhar('');
    setSelectedDriver(created);
    addToast(`New driver profile ${created.id} registered!`, 'check');
  };

  // Modern Minimal Design Tokens (Identical to the Reference Profile Card)
  const T = {
    canvas: '#FBFBFA',
    card: '#FFFFFF',
    surface: '#F5F6F8',
    surfaceHover: '#EEEEF2',
    border: 'rgba(0, 0, 0, 0.06)',
    borderStrong: '#E5E7EB',
    ink: '#121316',
    inkMuted: '#4B5563',
    inkDim: '#9CA3AF',
    taxi: '#FFC70A',
    taxiHover: '#F5BE00',
    taxiSoft: '#FFF8DB',
    green: '#10B981',
    greenSoft: '#ECFDF5',
    greenBorder: '#A7F3D0',
    amber: '#F59E0B',
    amberSoft: '#FFFBEB',
    amberBorder: '#FDE68A',
    red: '#EF4444',
    redSoft: '#FEF2F2',
    redBorder: '#FECACA',
    blue: '#3B82F6',
    blueSoft: '#EFF6FF',
    fontDisplay: '"Sora", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSans: '"Manrope", -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif',
    shadowCard: '0 20px 45px -15px rgba(0,0,0,0.07), 0 2px 6px rgba(0,0,0,0.02)',
    shadowElevated: '0 24px 50px -15px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.04)'
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        width: '100vw',
        background: T.canvas,
        color: T.ink,
        fontFamily: T.fontSans,
        WebkitFontSmoothing: 'antialiased',
        boxSizing: 'border-box',
        overflowX: 'hidden'
      }}
    >
      {/* ========================================================
          LEFT SIDEBAR: MODERN MINIMAL APPAREL
         ======================================================== */}
      <aside
        style={{
          width: '270px',
          background: T.card,
          borderRight: `1px solid ${T.border}`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '28px 20px',
          flexShrink: 0,
          boxSizing: 'border-box'
        }}
      >
        <div>
          {/* Logo & Portal Badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', padding: '0 6px' }}>
            <BrandLogo height={32} width={130} />
            <span
              style={{
                fontFamily: T.fontDisplay,
                fontSize: '10.5px',
                fontWeight: 800,
                background: T.taxi,
                color: '#000000',
                padding: '3px 8px',
                borderRadius: '6px',
                letterSpacing: '0.06em',
                textTransform: 'uppercase'
              }}
            >
              CRM
            </span>
          </div>

          {/* Quick Ecosystem Switcher (Matching Inset Pill Style) */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '18px',
              background: T.surface,
              border: `1px solid ${T.border}`,
              marginBottom: '26px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '10.5px', color: T.inkMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                App Switcher
              </span>
              <span style={{ fontSize: '11px', color: T.green, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: T.green, display: 'inline-block' }} />
                Online
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setView('user')}
                style={{
                  padding: '8px 10px',
                  borderRadius: '12px',
                  border: `1px solid ${T.borderStrong}`,
                  background: T.card,
                  color: T.ink,
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                  transition: 'background 0.15s ease'
                }}
              >
                <Icons.User />
                <span>User App</span>
              </button>
              <button
                type="button"
                onClick={() => setView('driver')}
                style={{
                  padding: '8px 10px',
                  borderRadius: '12px',
                  border: `1px solid ${T.borderStrong}`,
                  background: T.card,
                  color: T.ink,
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                  transition: 'background 0.15s ease'
                }}
              >
                <Icons.Car />
                <span>Driver App</span>
              </button>
            </div>
          </div>

          {/* Navigation Links */}
          <div style={{ marginBottom: '8px', padding: '0 8px' }}>
            <span style={{ fontSize: '10.5px', color: T.inkDim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Operations
            </span>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {[
              { id: 'drivers', label: 'Drivers & KYC', badge: newCount > 0 ? `${newCount} New` : null },
              { id: 'telemetry', label: 'Trip Revenue Engine' },
              { id: 'trips', label: 'Live Telemetry & Trips', badge: telemetry.totalTrips },
              { id: 'users', label: 'Customer Accounts', badge: usersList.length }
            ].map(item => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setSelectedDriver(null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '14px',
                    border: active ? `1px solid ${T.borderStrong}` : '1px solid transparent',
                    background: active ? T.surface : 'transparent',
                    color: active ? T.ink : T.inkMuted,
                    fontSize: '13.5px',
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: active ? T.taxi : T.surfaceHover,
                        color: active ? '#000000' : T.ink
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: T.green }} />
            <span style={{ fontSize: '12px', color: T.inkMuted, fontWeight: 500 }}>Live Telemetry Active</span>
          </div>
          <div style={{ fontSize: '11.5px', color: T.inkDim, lineHeight: 1.4 }}>
            Production: <strong style={{ color: T.ink }}>ridingo.in/admin</strong>
          </div>
        </div>
      </aside>

      {/* ========================================================
          MAIN VIEWPORT: SPACIOUS, AIRY, UNCONGESTED
         ======================================================== */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowY: 'auto' }}>
        {/* Top Header Bar */}
        <header
          style={{
            height: '76px',
            borderBottom: `1px solid ${T.border}`,
            background: T.card,
            padding: '0 36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div>
            <h1 style={{ fontFamily: T.fontDisplay, fontSize: '20px', fontWeight: 800, margin: 0, color: T.ink, letterSpacing: '-0.02em' }}>
              {activeTab === 'drivers' && 'Drivers & KYC Management'}
              {activeTab === 'telemetry' && 'Trip Revenue & Financial Calculations'}
              {activeTab === 'trips' && 'Live Trips & Dispatch Telemetry'}
              {activeTab === 'users' && 'Customer Profiles & Lifetime Value'}
            </h1>
            <span style={{ fontSize: '12.5px', color: T.inkMuted, marginTop: '2px', display: 'block' }}>
              Modern Minimal CRM • Ridingo Executive Operations (Kerala Network)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {activeTab === 'drivers' && (
              <button
                type="button"
                onClick={() => setIsAddDriverModalOpen(true)}
                style={{
                  background: T.ink,
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '10px 18px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                  transition: 'opacity 0.15s ease'
                }}
              >
                <span style={{ fontSize: '15px', fontWeight: 800 }}>+</span>
                <span>Register Driver</span>
              </button>
            )}

            <div
              style={{
                padding: '9px 14px',
                borderRadius: '14px',
                background: T.surface,
                border: `1px solid ${T.border}`,
                fontSize: '12.5px',
                fontWeight: 600,
                color: T.inkMuted,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Icons.Calendar />
              <span>{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>
        </header>

        {/* Dashboard Body Content */}
        <div style={{ padding: '32px 36px', flex: 1, display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {/* ========================================================
              EXECUTIVE METRIC CARDS (AIRY, SPACIOUS, HIGH-CONTRAST)
             ======================================================== */}
          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
              gap: '20px'
            }}
          >
            {/* Gross GMV */}
            <div
              style={{
                padding: '24px 26px',
                borderRadius: '24px',
                background: T.card,
                border: `1px solid ${T.border}`,
                boxShadow: T.shadowCard
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', color: T.inkMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Gross Trip Volume (GMV)
                </span>
                <span style={{ fontSize: '11px', color: T.green, fontWeight: 800, background: T.greenSoft, padding: '2px 8px', borderRadius: '6px' }}>
                  +18.4%
                </span>
              </div>
              <div style={{ fontFamily: T.fontDisplay, fontSize: '28px', fontWeight: 800, color: T.ink, letterSpacing: '-0.02em', margin: '4px 0' }}>
                ₹{telemetry.totalGmv.toLocaleString('en-IN')}
              </div>
              <span style={{ fontSize: '12.5px', color: T.inkMuted }}>
                Total cumulative booking value
              </span>
            </div>

            {/* Platform Revenue (15%) */}
            <div
              style={{
                padding: '24px 26px',
                borderRadius: '24px',
                background: T.card,
                border: `1px solid ${T.border}`,
                boxShadow: T.shadowCard
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', color: T.inkMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Platform Net (15%)
                </span>
                <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: T.taxiSoft, color: '#855D00' }}>
                  15% Take-Rate
                </span>
              </div>
              <div style={{ fontFamily: T.fontDisplay, fontSize: '28px', fontWeight: 800, color: T.ink, letterSpacing: '-0.02em', margin: '4px 0' }}>
                ₹{telemetry.netCommission.toLocaleString('en-IN')}
              </div>
              <span style={{ fontSize: '12.5px', color: T.inkMuted }}>
                Retained platform revenue
              </span>
            </div>

            {/* Driver Payouts (85%) */}
            <div
              style={{
                padding: '24px 26px',
                borderRadius: '24px',
                background: T.card,
                border: `1px solid ${T.border}`,
                boxShadow: T.shadowCard
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', color: T.inkMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Chauffeur Payouts (85%)
                </span>
                <span style={{ fontSize: '11px', color: T.green, fontWeight: 800, background: T.greenSoft, padding: '2px 8px', borderRadius: '6px' }}>
                  Settled
                </span>
              </div>
              <div style={{ fontFamily: T.fontDisplay, fontSize: '28px', fontWeight: 800, color: T.ink, letterSpacing: '-0.02em', margin: '4px 0' }}>
                ₹{telemetry.driverPayouts.toLocaleString('en-IN')}
              </div>
              <span style={{ fontSize: '12.5px', color: T.inkMuted }}>
                Settled to verified partner chauffeurs
              </span>
            </div>

            {/* Completed Trips */}
            <div
              style={{
                padding: '24px 26px',
                borderRadius: '24px',
                background: T.card,
                border: `1px solid ${T.border}`,
                boxShadow: T.shadowCard
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', color: T.inkMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Completed Trips
                </span>
                <span style={{ fontSize: '11px', color: T.blue, fontWeight: 800, background: T.blueSoft, padding: '2px 8px', borderRadius: '6px' }}>
                  100% Fulfilled
                </span>
              </div>
              <div style={{ fontFamily: T.fontDisplay, fontSize: '28px', fontWeight: 800, color: T.ink, letterSpacing: '-0.02em', margin: '4px 0' }}>
                {telemetry.completedCount} / {telemetry.totalTrips || 184}
              </div>
              <span style={{ fontSize: '12.5px', color: T.inkMuted }}>
                {telemetry.completionRate}% fulfillment rate
              </span>
            </div>
          </section>

          {/* ========================================================
              TAB 1: DRIVERS REGISTRY & PROFILE CARDS
             ======================================================== */}
          {activeTab === 'drivers' && (
            <div>
              {/* Segmented Controls & Search Toolbar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: '22px',
                  marginBottom: '16px',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}
              >
                {/* Segmented Category Pill */}
                <div
                  style={{
                    display: 'flex',
                    background: T.surface,
                    padding: '5px',
                    borderRadius: '16px',
                    border: `1px solid ${T.border}`
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setDriverCategory('all');
                      setSelectedDriver(null);
                    }}
                    style={{
                      padding: '9px 18px',
                      borderRadius: '12px',
                      border: 'none',
                      background: driverCategory === 'all' ? T.card : 'transparent',
                      color: driverCategory === 'all' ? T.ink : T.inkMuted,
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: driverCategory === 'all' ? '0 1px 3px rgba(0,0,0,0.04)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>All Chauffeurs</span>
                    <span
                      style={{
                        padding: '1px 8px',
                        borderRadius: '999px',
                        background: driverCategory === 'all' ? T.surfaceHover : T.card,
                        color: T.ink,
                        fontSize: '11px',
                        fontWeight: 800
                      }}
                    >
                      {drivers.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDriverCategory('new_registration');
                      setSelectedDriver(null);
                    }}
                    style={{
                      padding: '9px 18px',
                      borderRadius: '12px',
                      border: 'none',
                      background: driverCategory === 'new_registration' ? T.card : 'transparent',
                      color: driverCategory === 'new_registration' ? T.ink : T.inkMuted,
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: driverCategory === 'new_registration' ? '0 1px 3px rgba(0,0,0,0.04)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>New Registration</span>
                    <span
                      style={{
                        padding: '1px 8px',
                        borderRadius: '999px',
                        background: T.amberSoft,
                        color: T.amber,
                        fontSize: '11px',
                        fontWeight: 800
                      }}
                    >
                      {newCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDriverCategory('old_registered');
                      setSelectedDriver(null);
                    }}
                    style={{
                      padding: '9px 18px',
                      borderRadius: '12px',
                      border: 'none',
                      background: driverCategory === 'old_registered' ? T.card : 'transparent',
                      color: driverCategory === 'old_registered' ? T.ink : T.inkMuted,
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: driverCategory === 'old_registered' ? '0 1px 3px rgba(0,0,0,0.04)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>Verified Chauffeurs</span>
                    <span
                      style={{
                        padding: '1px 8px',
                        borderRadius: '999px',
                        background: T.greenSoft,
                        color: T.green,
                        fontSize: '11px',
                        fontWeight: 800
                      }}
                    >
                      {oldCount}
                    </span>
                  </button>
                </div>

                {/* Filter and Search Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <div style={{ position: 'absolute', left: '12px', color: T.inkDim, display: 'flex' }}>
                      <Icons.Search />
                    </div>
                    <input
                      type="text"
                      placeholder="Search by ID, Name, PIN, Mobile..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      style={{
                        padding: '11px 16px 11px 36px',
                        borderRadius: '14px',
                        border: `1px solid ${T.borderStrong}`,
                        background: T.card,
                        color: T.ink,
                        fontSize: '13px',
                        minWidth: '270px',
                        outline: 'none',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                      }}
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    style={{
                      padding: '11px 16px',
                      borderRadius: '14px',
                      border: `1px solid ${T.borderStrong}`,
                      background: T.card,
                      color: T.ink,
                      fontSize: '13px',
                      outline: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                    }}
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending Review</option>
                    <option value="approved">Approved</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              {/* Master-Detail Split Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: selectedDriver ? '1fr 400px' : '1fr', gap: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {filteredDrivers.length === 0 ? (
                    <div
                      style={{
                        padding: '64px 24px',
                        textAlign: 'center',
                        background: T.card,
                        borderRadius: '24px',
                        border: `1px solid ${T.border}`
                      }}
                    >
                      <b style={{ fontSize: '16px', color: T.ink, display: 'block' }}>No chauffeur records found</b>
                      <p style={{ fontSize: '13px', color: T.inkMuted, margin: '6px 0 0' }}>
                        {searchQuery ? 'Try clearing your search query.' : 'Newly registered drivers will appear here.'}
                      </p>
                    </div>
                  ) : (
                    filteredDrivers.map(drv => {
                      const isSelected = selectedDriver?.id === drv.id;
                      const isPending = drv.status === 'pending' || drv.category === 'new_registration';
                      return (
                        <div
                          key={drv.id}
                          onClick={() => setSelectedDriver(drv)}
                          style={{
                            padding: '18px 24px',
                            borderRadius: '20px',
                            background: isSelected ? '#FFFCF0' : T.card,
                            border: isSelected ? `2px solid ${T.taxi}` : `1px solid ${T.border}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            boxShadow: T.shadowCard,
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {/* Driver Left Identity */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
                            <div
                              style={{
                                width: '52px',
                                height: '52px',
                                borderRadius: '50%',
                                background: T.surface,
                                overflow: 'hidden',
                                border: `1px solid ${T.border}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '17px',
                                flexShrink: 0
                              }}
                            >
                              {drv.avatar ? (
                                <img src={drv.avatar} alt={drv.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                drv.name?.[0] || 'D'
                              )}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                                <b style={{ fontSize: '15.5px', color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {drv.name}
                                </b>
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    background: T.surface,
                                    color: T.ink,
                                    letterSpacing: '0.04em'
                                  }}
                                >
                                  {drv.id}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '13px', color: T.inkMuted }}>
                                <span>{drv.phone}</span>
                                <span>{drv.city} (PIN: <strong style={{ color: T.ink }}>{drv.pincode}</strong>)</span>
                              </div>
                            </div>
                          </div>

                          {/* Driver Right Status & Action */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 800,
                                padding: '4px 10px',
                                borderRadius: '8px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                                background:
                                  drv.status === 'approved' ? T.greenSoft :
                                  drv.status === 'pending' ? T.amberSoft :
                                  T.redSoft,
                                color:
                                  drv.status === 'approved' ? T.green :
                                  drv.status === 'pending' ? T.amber :
                                  T.red,
                                border: `1px solid ${
                                  drv.status === 'approved' ? T.greenBorder :
                                  drv.status === 'pending' ? T.amberBorder :
                                  T.redBorder
                                }`
                              }}
                            >
                              {drv.status === 'pending' ? 'Pending Review' : drv.status}
                            </span>

                            {isPending && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApprove(drv.id);
                                }}
                                style={{
                                  background: T.green,
                                  color: '#FFFFFF',
                                  border: 'none',
                                  borderRadius: '10px',
                                  padding: '7px 14px',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  boxShadow: '0 1px 2px rgba(16, 185, 129, 0.2)'
                                }}
                              >
                                Approve
                              </button>
                            )}

                            <span style={{ fontSize: '14px', color: T.inkDim }}>&rarr;</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* ========================================================
                    FULL DRIVER PROFILE CARD (MATCHING REFERENCE UI STYLE)
                   ======================================================== */}
                {selectedDriver && (
                  <div
                    style={{
                      background: '#FFFFFF',
                      borderRadius: '28px',
                      border: '1px solid rgba(0,0,0,0.06)',
                      overflow: 'hidden',
                      boxShadow: T.shadowElevated,
                      position: 'sticky',
                      top: '20px',
                      height: 'fit-content',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    {/* Top Scenic Sky & Clouds Banner */}
                    <div
                      style={{
                        height: '140px',
                        position: 'relative',
                        background: 'linear-gradient(180deg, #A8C7DF 0%, #C3DAED 45%, #DFEDF7 80%, #EFF6FC 100%)',
                        backgroundImage: 'radial-gradient(ellipse at 70% 30%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 50%), radial-gradient(ellipse at 25% 60%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 45%), linear-gradient(180deg, #99C3E3 0%, #BFE0F7 60%, #E3F1FC 100%)',
                        padding: '16px 18px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        boxSizing: 'border-box'
                      }}
                    >
                      {/* Top Left: Driver ID Pill */}
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          background: 'rgba(255, 255, 255, 0.88)',
                          backdropFilter: 'blur(8px)',
                          color: '#121316',
                          padding: '4px 10px',
                          borderRadius: '999px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                          letterSpacing: '0.04em'
                        }}
                      >
                        {selectedDriver.id}
                      </span>

                      {/* Top Right: Floating Follow / Status Pill */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {selectedDriver.status === 'pending' ? (
                          <button
                            type="button"
                            onClick={() => handleApprove(selectedDriver.id)}
                            style={{
                              fontSize: '12px',
                              fontWeight: 700,
                              background: '#FFFFFF',
                              color: '#121316',
                              padding: '6px 14px',
                              borderRadius: '999px',
                              border: 'none',
                              cursor: 'pointer',
                              boxShadow: '0 3px 12px rgba(0,0,0,0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'transform 0.15s ease'
                            }}
                          >
                            <span>Approve</span>
                            <span style={{ fontSize: '13px', fontWeight: 800 }}>+</span>
                          </button>
                        ) : (
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: 700,
                              background: '#FFFFFF',
                              color: selectedDriver.status === 'approved' ? '#047857' : '#B91C1C',
                              padding: '6px 14px',
                              borderRadius: '999px',
                              boxShadow: '0 3px 12px rgba(0,0,0,0.08)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px'
                            }}
                          >
                            <Icons.Check />
                            <span>Partner</span>
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedDriver(null)}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.88)',
                            backdropFilter: 'blur(8px)',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#121316',
                            fontSize: '13px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                          }}
                        >
                          <Icons.Close />
                        </button>
                      </div>
                    </div>

                    {/* Card Body: Overlapping Circular Avatar + Spectrum Exp Bar */}
                    <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                      {/* Avatar with Rainbow Iridescent Ring */}
                      <div
                        style={{
                          marginTop: '-44px',
                          position: 'relative',
                          marginBottom: '10px'
                        }}
                      >
                        <div
                          style={{
                            width: '88px',
                            height: '88px',
                            borderRadius: '50%',
                            background: 'conic-gradient(from 180deg at 50% 50%, #FFC70A 0deg, #10B981 72deg, #06B6D4 144deg, #3B82F6 216deg, #8B5CF6 288deg, #EC4899 330deg, #FFC70A 360deg)',
                            padding: '3.5px',
                            boxShadow: '0 8px 24px -4px rgba(0,0,0,0.12)'
                          }}
                        >
                          <div
                            style={{
                              width: '100%',
                              height: '100%',
                              borderRadius: '50%',
                              border: '3px solid #FFFFFF',
                              overflow: 'hidden',
                              background: '#FFFFFF',
                              boxSizing: 'border-box'
                            }}
                          >
                            {selectedDriver.avatar ? (
                              <img
                                src={selectedDriver.avatar}
                                alt={selectedDriver.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 800, background: '#F4F5F7' }}>
                                {selectedDriver.name?.[0] || 'D'}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Exp. Multi-colored Spectrum Segmented Bar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 600 }}>exp.</span>
                        <div style={{ display: 'flex', gap: '2.5px', alignItems: 'center' }}>
                          {['#8B5CF6', '#6366F1', '#3B82F6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#E5E7EB', '#E5E7EB'].map((color, idx) => (
                            <div
                              key={idx}
                              style={{
                                width: '4px',
                                height: '10px',
                                borderRadius: '2px',
                                background: idx < (selectedDriver.status === 'approved' ? 7 : 3) ? color : '#E5E7EB'
                              }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Driver Name & Subtitle / Bio */}
                      <b style={{ fontFamily: T.fontDisplay, fontSize: '20px', fontWeight: 800, color: '#121316', letterSpacing: '-0.02em', margin: '0 0 4px' }}>
                        {selectedDriver.name}
                      </b>
                      <p style={{ fontSize: '12.5px', color: '#4B5563', margin: '0 0 16px', lineHeight: 1.45, maxWidth: '280px' }}>
                        {selectedDriver.category === 'new_registration'
                          ? 'New partner applicant • Verification in progress for Kerala chauffeur network.'
                          : 'Ridingo Executive Chauffeur focusing on safety, punctuality & premium rider comfort.'}
                      </p>

                      {/* 3-Column Stats Container (Exact Inset Pill from Reference) */}
                      <div
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          background: '#F5F6F8',
                          borderRadius: '20px',
                          padding: '14px 10px',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          textAlign: 'center',
                          marginBottom: '16px'
                        }}
                      >
                        <div>
                          <div style={{ fontFamily: T.fontDisplay, fontSize: '17px', fontWeight: 800, color: '#121316', letterSpacing: '-0.02em' }}>
                            {selectedDriver.tripsCompleted || (selectedDriver.status === 'approved' ? 184 : 0)}
                          </div>
                          <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600, marginTop: '2px' }}>
                            Trips
                          </div>
                        </div>

                        <div style={{ borderLeft: '1px solid #E5E7EB', borderRight: '1px solid #E5E7EB' }}>
                          <div style={{ fontFamily: T.fontDisplay, fontSize: '17px', fontWeight: 800, color: '#121316', letterSpacing: '-0.02em' }}>
                            {selectedDriver.rating ? `${selectedDriver.rating}★` : '5.0★'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600, marginTop: '2px' }}>
                            Rating
                          </div>
                        </div>

                        <div>
                          <div style={{ fontFamily: T.fontDisplay, fontSize: '17px', fontWeight: 800, color: '#121316', letterSpacing: '-0.02em' }}>
                            {selectedDriver.totalEarnings
                              ? `₹${(selectedDriver.totalEarnings / 1000).toFixed(0)}K`
                              : (selectedDriver.status === 'approved' ? '₹68K' : '₹0')}
                          </div>
                          <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600, marginTop: '2px' }}>
                            Earnings
                          </div>
                        </div>
                      </div>

                      {/* Bottom Quick Contact Icons (No Emojis) */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '20px',
                          marginBottom: '18px',
                          padding: '4px 0'
                        }}
                      >
                        {/* Phone */}
                        <a
                          href={`tel:${selectedDriver.phone}`}
                          title={`Call ${selectedDriver.phone}`}
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: '#FFFFFF',
                            border: '1px solid #EAEAEA',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#121316',
                            textDecoration: 'none',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                            transition: 'transform 0.15s ease'
                          }}
                        >
                          <Icons.Phone />
                        </a>

                        {/* Email */}
                        <a
                          href={`mailto:${selectedDriver.email}`}
                          title={`Email ${selectedDriver.email}`}
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: '#FFFFFF',
                            border: '1px solid #EAEAEA',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#121316',
                            textDecoration: 'none',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                            transition: 'transform 0.15s ease'
                          }}
                        >
                          <Icons.Mail />
                        </a>

                        {/* Location / PIN Tooltip */}
                        <button
                          type="button"
                          onClick={() => alert(`Address: ${selectedDriver.homeAddress}, ${selectedDriver.street}, ${selectedDriver.city} - PIN: ${selectedDriver.pincode}`)}
                          title={`PIN: ${selectedDriver.pincode}`}
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: '#FFFFFF',
                            border: '1px solid #EAEAEA',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#121316',
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                          }}
                        >
                          <Icons.MapPin />
                        </button>

                        {/* Docs */}
                        <button
                          type="button"
                          onClick={() => selectedDriver.dlPhoto && setIsPhotoPreviewOpen(selectedDriver.dlPhoto)}
                          title="View Documents"
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: '#FFFFFF',
                            border: '1px solid #EAEAEA',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#121316',
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                          }}
                        >
                          <Icons.IdCard />
                        </button>
                      </div>

                      {/* Expandable KYC Dossier & Document Inspection */}
                      <div
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          background: '#F9FAFB',
                          borderRadius: '18px',
                          border: '1px solid #EAEAEA',
                          padding: '16px',
                          textAlign: 'left',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '11px',
                          fontSize: '12.5px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '10.5px', color: '#6B7280', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                            Full Address & PIN
                          </span>
                          <span style={{ fontSize: '11px', fontWeight: 800, background: '#FFF8DB', color: '#855D00', padding: '2px 8px', borderRadius: '6px' }}>
                            PIN: {selectedDriver.pincode || '682030'}
                          </span>
                        </div>
                        <div style={{ color: '#121316', lineHeight: 1.45, fontWeight: 500 }}>
                          {selectedDriver.homeAddress ? `${selectedDriver.homeAddress}, ${selectedDriver.street}` : 'TC 14/820, Silver Cascade, Vazhuthacaud'}, {selectedDriver.city}, {selectedDriver.state}
                        </div>

                        {/* Document Photo Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                          <div
                            onClick={() => selectedDriver.dlPhoto && setIsPhotoPreviewOpen(selectedDriver.dlPhoto)}
                            style={{
                              padding: '10px',
                              borderRadius: '12px',
                              background: '#FFFFFF',
                              border: '1px solid #E5E7EB',
                              cursor: 'pointer'
                            }}
                          >
                            <span style={{ fontSize: '10px', color: '#6B7280', display: 'block', fontWeight: 700 }}>Licence</span>
                            <b style={{ fontSize: '11.5px', color: '#121316', display: 'block', margin: '2px 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {selectedDriver.dlNumber}
                            </b>
                            {selectedDriver.dlPhoto ? (
                              <img src={selectedDriver.dlPhoto} alt="DL" style={{ width: '100%', height: '52px', borderRadius: '8px', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ height: '52px', borderRadius: '8px', background: '#F4F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#6B7280' }}>Document</div>
                            )}
                          </div>

                          <div
                            onClick={() => selectedDriver.aadharPhoto && setIsPhotoPreviewOpen(selectedDriver.aadharPhoto)}
                            style={{
                              padding: '10px',
                              borderRadius: '12px',
                              background: '#FFFFFF',
                              border: '1px solid #E5E7EB',
                              cursor: 'pointer'
                            }}
                          >
                            <span style={{ fontSize: '10px', color: '#6B7280', display: 'block', fontWeight: 700 }}>Aadhaar</span>
                            <b style={{ fontSize: '11.5px', color: '#121316', display: 'block', margin: '2px 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {selectedDriver.aadharNumber}
                            </b>
                            {selectedDriver.aadharPhoto ? (
                              <img src={selectedDriver.aadharPhoto} alt="Aadhaar" style={{ width: '100%', height: '52px', borderRadius: '8px', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ height: '52px', borderRadius: '8px', background: '#F4F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#6B7280' }}>Card</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Primary Actions */}
                      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
                        {selectedDriver.status !== 'approved' && (
                          <button
                            type="button"
                            onClick={() => handleApprove(selectedDriver.id)}
                            style={{
                              width: '100%',
                              background: '#10B981',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '14px',
                              padding: '12px',
                              fontWeight: 700,
                              fontSize: '13px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)'
                            }}
                          >
                            <Icons.Check />
                            <span>Approve KYC & Activate Chauffeur</span>
                          </button>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenRejectModal(selectedDriver.id)}
                            style={{
                              background: '#FEF2F2',
                              color: '#EF4444',
                              border: '1px solid #FECACA',
                              borderRadius: '12px',
                              padding: '10px',
                              fontWeight: 700,
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            Reject KYC
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleSuspend(selectedDriver.id)}
                            style={{
                              background: '#F4F5F7',
                              color: '#121316',
                              border: '1px solid #E5E7EB',
                              borderRadius: '12px',
                              padding: '10px',
                              fontWeight: 600,
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            {selectedDriver.status === 'suspended' ? 'Re-activate' : 'Suspend'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 2: TRIP FINANCIAL CALCULATIONS & SIMULATOR
             ======================================================== */}
          {activeTab === 'telemetry' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div
                style={{
                  background: T.card,
                  borderRadius: '24px',
                  border: `1px solid ${T.border}`,
                  padding: '32px',
                  boxShadow: T.shadowCard
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                  <div>
                    <h2 style={{ fontFamily: T.fontDisplay, fontSize: '19px', fontWeight: 800, margin: '0 0 4px', color: T.ink }}>
                      Interactive Tariff & Revenue Simulator
                    </h2>
                    <span style={{ fontSize: '13px', color: T.inkMuted }}>
                      Calculate Gross Booking Volume, 15% Platform Commission, and Chauffeur Take-Home
                    </span>
                  </div>
                  <span style={{ padding: '6px 14px', borderRadius: '10px', background: T.taxiSoft, color: '#855D00', fontSize: '12px', fontWeight: 800 }}>
                    15% Standard Fee
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '36px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '13.5px', fontWeight: 600, color: T.ink }}>Average Trip Fare</span>
                        <b style={{ fontSize: '14.5px', color: T.ink }}>₹{simFare}</b>
                      </div>
                      <input
                        type="range"
                        min="200"
                        max="5000"
                        step="50"
                        value={simFare}
                        onChange={e => setSimFare(Number(e.target.value))}
                        style={{ width: '100%', accentColor: T.taxi }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: T.inkDim, marginTop: '4px' }}>
                        <span>₹200 (Short City Ride)</span>
                        <span>₹5,000 (Intercity / Airport Transfer)</span>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '13.5px', fontWeight: 600, color: T.ink }}>Platform Commission Rate (%)</span>
                        <b style={{ fontSize: '14.5px', color: T.ink }}>{simCommission}%</b>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="30"
                        step="1"
                        value={simCommission}
                        onChange={e => setSimCommission(Number(e.target.value))}
                        style={{ width: '100%', accentColor: T.taxi }}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '13.5px', fontWeight: 600, color: T.ink }}>Daily Trips per Chauffeur</span>
                        <b style={{ fontSize: '14.5px', color: T.ink }}>{simTripVolume} trips/day</b>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="100"
                        step="5"
                        value={simTripVolume}
                        onChange={e => setSimTripVolume(Number(e.target.value))}
                        style={{ width: '100%', accentColor: T.taxi }}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      background: T.surface,
                      borderRadius: '20px',
                      padding: '28px',
                      border: `1px solid ${T.border}`,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '11px', color: T.inkMuted, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>
                        Per-Ride Revenue Breakdown
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                          <span style={{ color: T.inkMuted }}>Gross Booking Fare:</span>
                          <b style={{ color: T.ink }}>₹{simFare}</b>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                          <span style={{ color: '#855D00', fontWeight: 600 }}>Ridingo Commission ({simCommission}%):</span>
                          <b style={{ color: '#855D00' }}>+ ₹{Math.round(simFare * (simCommission / 100))}</b>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                          <span style={{ color: T.green, fontWeight: 600 }}>Driver Partner Share ({100 - simCommission}%):</span>
                          <b style={{ color: T.green }}>₹{Math.round(simFare * ((100 - simCommission) / 100))}</b>
                        </div>
                      </div>
                    </div>

                    <div style={{ borderTop: `1px solid ${T.borderStrong}`, paddingTop: '18px', marginTop: '18px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: '11px', color: T.inkMuted, textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                            Monthly Net Platform Revenue
                          </span>
                          <div style={{ fontFamily: T.fontDisplay, fontSize: '26px', fontWeight: 800, color: T.ink, letterSpacing: '-0.02em', marginTop: '2px' }}>
                            ₹{Math.round(simFare * (simCommission / 100) * simTripVolume * 30).toLocaleString('en-IN')}
                          </div>
                        </div>
                        <span style={{ fontSize: '11.5px', color: T.green, fontWeight: 700, background: T.greenSoft, padding: '5px 12px', borderRadius: '8px' }}>
                          Projected
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 3: LIVE TRIPS & DISPATCH
             ======================================================== */}
          {activeTab === 'trips' && (
            <div
              style={{
                background: T.card,
                borderRadius: '24px',
                border: `1px solid ${T.border}`,
                padding: '28px',
                boxShadow: T.shadowCard
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
                <div>
                  <h2 style={{ fontFamily: T.fontDisplay, fontSize: '19px', fontWeight: 800, margin: '0 0 4px', color: T.ink }}>
                    Live Trips & Dispatch Feed
                  </h2>
                  <span style={{ fontSize: '13px', color: T.inkMuted }}>
                    Real-time ride telemetry recorded across Kochi and Thiruvananthapuram
                  </span>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: T.green, background: T.greenSoft, padding: '5px 12px', borderRadius: '8px' }}>
                  Real-time Sync
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {trips.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: T.inkMuted }}>
                    No trips logged currently. Book rides from User App to test telemetry.
                  </div>
                ) : (
                  trips.map(trip => (
                    <div
                      key={trip.id}
                      style={{
                        padding: '16px 22px',
                        borderRadius: '16px',
                        background: T.surface,
                        border: `1px solid ${T.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: T.card, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.ink }}>
                          <Icons.Car />
                        </div>
                        <div>
                          <b style={{ fontSize: '14.5px', color: T.ink }}>Trip #{trip.id}</b>
                          <div style={{ fontSize: '12.5px', color: T.inkMuted, marginTop: '2px' }}>
                            <span>{trip.pickup || 'Kakkanad Infopark'}</span> &rarr; <span>{trip.drop || 'Cochin Airport (COK)'}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <b style={{ fontSize: '15px', color: T.ink }}>₹{trip.fare || 650}</b>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', background: T.greenSoft, color: T.green }}>
                          Completed
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 4: CUSTOMER ACCOUNTS DIRECTORY
             ======================================================== */}
          {activeTab === 'users' && (
            <div
              style={{
                background: T.card,
                borderRadius: '24px',
                border: `1px solid ${T.border}`,
                padding: '28px',
                boxShadow: T.shadowCard
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
                <div>
                  <h2 style={{ fontFamily: T.fontDisplay, fontSize: '19px', fontWeight: 800, margin: '0 0 4px', color: T.ink }}>
                    Customer Profiles & Lifetime Value (LTV)
                  </h2>
                  <span style={{ fontSize: '13px', color: T.inkMuted }}>
                    Registered riders synced across User App, Google Auth & Supabase
                  </span>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: T.blue, background: T.blueSoft, padding: '5px 12px', borderRadius: '8px' }}>
                  {usersList.length} Active Riders
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {usersList.map(usr => (
                  <div
                    key={usr.id}
                    style={{
                      padding: '16px 22px',
                      borderRadius: '16px',
                      background: T.surface,
                      border: `1px solid ${T.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: T.card, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '15px', color: T.ink }}>
                        {usr.name?.[0] || 'U'}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <b style={{ fontSize: '14.5px', color: T.ink }}>{usr.name}</b>
                          <span style={{ fontSize: '11px', color: T.inkMuted, background: T.card, padding: '2px 7px', borderRadius: '6px' }}>{usr.id}</span>
                        </div>
                        <div style={{ fontSize: '12.5px', color: T.inkMuted, marginTop: '2px' }}>
                          <span>{usr.phone}</span> • <span>{usr.email}</span> • <span>{usr.city || 'Kochi'}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '11px', color: T.inkDim, textTransform: 'uppercase', display: 'block' }}>Rides</span>
                        <b style={{ fontSize: '14px', color: T.ink }}>{usr.rides || 1} completed</b>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '11px', color: T.inkDim, textTransform: 'uppercase', display: 'block' }}>LTV Spend</span>
                        <b style={{ fontSize: '15px', color: T.green }}>₹{(usr.spent || 650).toLocaleString('en-IN')}</b>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ========================================================
          DOCUMENT PHOTO ZOOM MODAL
         ======================================================== */}
      {isPhotoPreviewOpen && (
        <div
          onClick={() => setIsPhotoPreviewOpen(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '24px'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: T.card,
              borderRadius: '24px',
              padding: '20px',
              maxWidth: '650px',
              width: '100%',
              boxShadow: T.shadowElevated,
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <b style={{ fontSize: '14px', color: T.ink }}>Document Inspection Preview</b>
              <button
                type="button"
                onClick={() => setIsPhotoPreviewOpen(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.inkMuted, display: 'flex' }}
              >
                <Icons.Close />
              </button>
            </div>
            <img
              src={isPhotoPreviewOpen}
              alt="KYC Document Preview"
              style={{ width: '100%', height: 'auto', maxHeight: '70vh', objectFit: 'contain', borderRadius: '16px' }}
            />
          </div>
        </div>
      )}

      {/* ========================================================
          REJECT KYC REASON MODAL
         ======================================================== */}
      {rejectModalDriverId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '24px'
          }}
        >
          <div
            style={{
              background: T.card,
              borderRadius: '24px',
              padding: '28px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: T.shadowElevated,
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <b style={{ fontSize: '16px', color: T.red }}>Reject Driver KYC</b>
              <button
                type="button"
                onClick={() => setRejectModalDriverId(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.inkMuted, display: 'flex' }}
              >
                <Icons.Close />
              </button>
            </div>
            <p style={{ fontSize: '13px', color: T.inkMuted, margin: 0, lineHeight: 1.45 }}>
              Specify the compliance reason for rejecting partner <strong>{rejectModalDriverId}</strong>. The driver will receive an automated notification to re-upload documents.
            </p>
            <textarea
              rows={3}
              value={rejectReasonInput}
              onChange={e => setRejectReasonInput(e.target.value)}
              placeholder="Enter rejection reason..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '12px 14px',
                borderRadius: '14px',
                border: `1px solid ${T.borderStrong}`,
                fontFamily: T.fontSans,
                fontSize: '13px',
                outline: 'none'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setRejectModalDriverId(null)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '12px',
                  border: `1px solid ${T.borderStrong}`,
                  background: T.surface,
                  color: T.ink,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                style={{
                  padding: '10px 18px',
                  borderRadius: '12px',
                  border: 'none',
                  background: T.red,
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          ADD NEW DRIVER MODAL (CRM MINIMAL APPAREL)
         ======================================================== */}
      {isAddDriverModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '24px'
          }}
        >
          <form
            onSubmit={handleCreateDriverSubmit}
            style={{
              background: T.card,
              borderRadius: '26px',
              padding: '30px',
              maxWidth: '540px',
              width: '100%',
              boxShadow: T.shadowElevated,
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontFamily: T.fontDisplay, fontSize: '18px', fontWeight: 800, margin: 0, color: T.ink }}>
                  Register New Chauffeur Profile
                </h3>
                <span style={{ fontSize: '12.5px', color: T.inkMuted }}>
                  Creates an executive driver partner record in the local and Supabase registry
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAddDriverModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.inkMuted, display: 'flex' }}
              >
                <Icons.Close />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', color: T.inkMuted, textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '5px', letterSpacing: '0.04em' }}>
                  Full Legal Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Arun Madhavan"
                  value={newDriverName}
                  onChange={e => setNewDriverName(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: '12px', border: `1px solid ${T.borderStrong}`, outline: 'none', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: T.inkMuted, textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '5px', letterSpacing: '0.04em' }}>
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 94471 28392"
                    value={newDriverPhone}
                    onChange={e => setNewDriverPhone(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: '12px', border: `1px solid ${T.borderStrong}`, outline: 'none', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: T.inkMuted, textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '5px', letterSpacing: '0.04em' }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="driver@gmail.com"
                    value={newDriverEmail}
                    onChange={e => setNewDriverEmail(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: '12px', border: `1px solid ${T.borderStrong}`, outline: 'none', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: T.inkMuted, textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '5px', letterSpacing: '0.04em' }}>
                  Door / Flat / Residential Address
                </label>
                <input
                  type="text"
                  placeholder="TC 14/820, Silver Cascade"
                  value={newDriverAddress}
                  onChange={e => setNewDriverAddress(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: '12px', border: `1px solid ${T.borderStrong}`, outline: 'none', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: T.inkMuted, textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '5px', letterSpacing: '0.04em' }}>
                    City
                  </label>
                  <input
                    type="text"
                    value={newDriverCity}
                    onChange={e => setNewDriverCity(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: '12px', border: `1px solid ${T.borderStrong}`, outline: 'none', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: T.inkMuted, textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '5px', letterSpacing: '0.04em' }}>
                    PIN Code (6-digit)
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={newDriverPin}
                    onChange={e => setNewDriverPin(e.target.value.replace(/\D/g, ''))}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: '12px', border: `1px solid ${T.borderStrong}`, outline: 'none', fontSize: '13px', fontWeight: 700 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: T.inkMuted, textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '5px', letterSpacing: '0.04em' }}>
                    Driving License No.
                  </label>
                  <input
                    type="text"
                    placeholder="KL-07-20190038291"
                    value={newDriverDl}
                    onChange={e => setNewDriverDl(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: '12px', border: `1px solid ${T.borderStrong}`, outline: 'none', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: T.inkMuted, textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '5px', letterSpacing: '0.04em' }}>
                    Aadhaar Number
                  </label>
                  <input
                    type="text"
                    placeholder="4829 1928 4719"
                    value={newDriverAadhar}
                    onChange={e => setNewDriverAadhar(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: '12px', border: `1px solid ${T.borderStrong}`, outline: 'none', fontSize: '13px' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
              <button
                type="button"
                onClick={() => setIsAddDriverModalOpen(false)}
                style={{
                  padding: '11px 20px',
                  borderRadius: '12px',
                  border: `1px solid ${T.borderStrong}`,
                  background: T.surface,
                  color: T.ink,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: '11px 22px',
                  borderRadius: '12px',
                  border: 'none',
                  background: T.taxi,
                  color: '#000000',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(255, 199, 10, 0.3)'
                }}
              >
                Register & Verify Chauffeur
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
