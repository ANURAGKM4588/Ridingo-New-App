import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import BrandLogo from '../BrandLogo';
import Icon from '../Icon';
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

export default function AdminPanel() {
  const { trips, user, setView, addToast } = useApp();

  // Active navigation tab: 'telemetry' | 'drivers' | 'users' | 'trips'
  const [activeTab, setActiveTab] = useState('drivers');

  // Drivers sub-category tab: 'new_registration' | 'old_registered'
  const [driverCategory, setDriverCategory] = useState('new_registration');

  // Search & Filter queries
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Drivers list state
  const [drivers, setDrivers] = useState(getLocalDriverRegistry());
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [isPhotoPreviewOpen, setIsPhotoPreviewOpen] = useState(null); // URL of image to zoom
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

  // Interactive Calculator State
  const [simFare, setSimFare] = useState(650);
  const [simCommission, setSimCommission] = useState(15);

  // Theme state
  const [isDark, setIsDark] = useState(true);

  // Load from Supabase on mount
  useEffect(() => {
    let mounted = true;
    fetchDriversFromSupabase().then(res => {
      if (mounted && Array.isArray(res)) {
        setDrivers(res);
      }
    });
    return () => { mounted = false; };
  }, []);

  // Sync telemetry calculations
  const telemetry = useMemo(() => {
    return calculateCrmTelemetry(trips, drivers);
  }, [trips, drivers]);

  // Registered user accounts from local registry + Supabase
  const usersList = useMemo(() => {
    const list = getLocalUserRegistry();
    if (list.length === 0) {
      return [
        { id: 'RDU-10821', name: 'Anurag K M', email: 'anurag@ridingo.in', phone: '+91 98401 23456', rides: 14, spent: 8450, registeredAt: '2026-08-10' },
        { id: 'RDU-29401', name: 'Pooja Nair', email: 'pooja.nair@gmail.com', phone: '+91 97451 89201', rides: 8, spent: 4890, registeredAt: '2026-09-01' },
        { id: 'RDU-38910', name: 'Vishnu Das', email: 'vishnu.das@tech.in', phone: '+91 94470 19284', rides: 22, spent: 17200, registeredAt: '2026-07-15' }
      ];
    }
    return list;
  }, []);

  // Filtered drivers based on category, search, and status
  const filteredDrivers = useMemo(() => {
    return drivers.filter(d => {
      // Category match
      const isNew = d.category === 'new_registration' || d.status === 'pending';
      if (driverCategory === 'new_registration' && !isNew) return false;
      if (driverCategory === 'old_registered' && isNew) return false;

      // Status filter
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;

      // Search match
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

  // Counts
  const newCount = useMemo(() => drivers.filter(d => d.category === 'new_registration' || d.status === 'pending').length, [drivers]);
  const oldCount = useMemo(() => drivers.filter(d => d.category === 'old_registered' || d.status === 'approved').length, [drivers]);

  // Actions
  const handleApprove = async (driverId) => {
    const updated = await approveDriverKyc(driverId);
    setDrivers(updated);
    if (selectedDriver?.id === driverId) {
      setSelectedDriver(prev => ({ ...prev, category: 'old_registered', status: 'approved' }));
    }
    addToast(`Driver ${driverId} verified & approved!`, 'check');
  };

  const handleReject = async (driverId) => {
    const reason = window.prompt('Enter reason for KYC rejection:', 'Document blur or mismatch');
    if (!reason) return;
    const updated = await rejectDriverKyc(driverId, reason);
    setDrivers(updated);
    if (selectedDriver?.id === driverId) {
      setSelectedDriver(prev => ({ ...prev, status: 'rejected', rejectReason: reason }));
    }
    addToast(`Driver ${driverId} KYC rejected.`, 'warn');
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
    // Reset fields
    setNewDriverName('');
    setNewDriverEmail('');
    setNewDriverPhone('');
    setNewDriverDl('');
    setNewDriverAadhar('');
    addToast(`New driver profile ${created.id} registered!`, 'check');
  };

  // Color theme tokens
  const theme = {
    bg: isDark ? '#0A0B0E' : '#F4F5F8',
    card: isDark ? '#14161C' : '#FFFFFF',
    sidebar: isDark ? '#0E1015' : '#FFFFFF',
    line: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    ink: isDark ? '#FFFFFF' : '#0F172A',
    muted: isDark ? '#8F9CAE' : '#64748B',
    accent: '#FFC70A',
    accentBg: isDark ? 'rgba(255,199,10,0.12)' : 'rgba(255,199,10,0.18)',
    green: '#10B981',
    red: '#EF4444',
    blue: '#3B82F6'
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        width: '100vw',
        background: theme.bg,
        color: theme.ink,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', Roboto, sans-serif",
        overflowX: 'hidden'
      }}
    >
      {/* ========================================================
          LEFT CRM SIDEBAR NAVIGATION
         ======================================================== */}
      <aside
        style={{
          width: '270px',
          background: theme.sidebar,
          borderRight: `1px solid ${theme.line}`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '24px 18px',
          flexShrink: 0,
          boxSizing: 'border-box'
        }}
      >
        <div>
          {/* Logo & Portal Badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
            <BrandLogo height={34} width={138} />
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 800,
                textTransform: 'uppercase',
                background: theme.accent,
                color: '#000000',
                padding: '3px 8px',
                borderRadius: '6px',
                letterSpacing: '0.06em'
              }}
            >
              CRM Admin
            </span>
          </div>

          {/* Quick App Switcher */}
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '12px',
              background: theme.card,
              border: `1px solid ${theme.line}`,
              marginBottom: '24px'
            }}
          >
            <span style={{ fontSize: '11px', color: theme.muted, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
              Switch Application
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setView('user')}
                style={{
                  padding: '7px 10px',
                  borderRadius: '8px',
                  border: `1px solid ${theme.line}`,
                  background: 'transparent',
                  color: theme.ink,
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>👤</span>
                <span>User App</span>
              </button>
              <button
                type="button"
                onClick={() => setView('driver')}
                style={{
                  padding: '7px 10px',
                  borderRadius: '8px',
                  border: `1px solid ${theme.line}`,
                  background: 'transparent',
                  color: theme.ink,
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>🚗</span>
                <span>Driver App</span>
              </button>
            </div>
          </div>

          {/* Navigation Items */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              { id: 'drivers', label: 'Drivers Management', icon: '🚗', badge: newCount > 0 ? `${newCount} New` : null },
              { id: 'telemetry', label: 'Trip Calculations & CRM', icon: '📊' },
              { id: 'trips', label: 'All Trips Telemetry', icon: '🗺️', badge: telemetry.totalTrips },
              { id: 'users', label: 'User Accounts', icon: '👥', badge: usersList.length }
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
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: 'none',
                    background: active ? (isDark ? '#222530' : '#EAECEF') : 'transparent',
                    color: active ? (isDark ? '#FFFFFF' : '#000000') : theme.muted,
                    fontSize: '13.5px',
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '16px' }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: active ? theme.accent : theme.card,
                        color: active ? '#000000' : theme.ink
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

        {/* Footer controls: theme & status */}
        <div style={{ borderTop: `1px solid ${theme.line}`, paddingTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: theme.green, boxShadow: `0 0 8px ${theme.green}` }} />
              <span style={{ fontSize: '12px', color: theme.muted }}>Supabase Realtime Live</span>
            </div>
            <button
              type="button"
              onClick={() => setIsDark(d => !d)}
              style={{
                background: theme.card,
                border: `1px solid ${theme.line}`,
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '12px',
                color: theme.ink,
                cursor: 'pointer'
              }}
            >
              {isDark ? '☀️ Light' : '🌙 Dark'}
            </button>
          </div>
          <span style={{ fontSize: '11px', color: theme.muted, display: 'block' }}>
            Domain: <strong>ridingo.in/admin</strong>
          </span>
        </div>
      </aside>

      {/* ========================================================
          MAIN CRM CONTENT CONTAINER
         ======================================================== */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowY: 'auto' }}>
        {/* Top Header */}
        <header
          style={{
            height: '70px',
            borderBottom: `1px solid ${theme.line}`,
            background: theme.card,
            padding: '0 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: theme.ink }}>
              {activeTab === 'drivers' && 'Chauffeur Drivers Management'}
              {activeTab === 'telemetry' && 'Trip Calculations & Revenue CRM'}
              {activeTab === 'trips' && 'Live Trips & Dispatch Telemetry'}
              {activeTab === 'users' && 'Ridingo Customer Accounts'}
            </h1>
            <span style={{ fontSize: '12px', color: theme.muted }}>
              Live 2-App Unified Control Portal • Ridingo Kerala Chauffeur Services
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {activeTab === 'drivers' && (
              <button
                type="button"
                onClick={() => setIsAddDriverModalOpen(true)}
                style={{
                  background: theme.accent,
                  color: '#000000',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '9px 16px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(255,199,10,0.3)'
                }}
              >
                <span>+</span>
                <span>Register Driver</span>
              </button>
            )}
            <div
              style={{
                padding: '8px 14px',
                borderRadius: '10px',
                background: theme.bg,
                border: `1px solid ${theme.line}`,
                fontSize: '12.5px',
                fontWeight: 600,
                color: theme.ink
              }}
            >
              📅 Today: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div style={{ padding: '28px', flex: 1 }}>
          {/* ========================================================
              TOP TELEMETRY METRICS CARDS (Always visible summary)
             ======================================================== */}
          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '16px',
              marginBottom: '28px'
            }}
          >
            {/* Total Gross Volume */}
            <div style={{ padding: '18px', borderRadius: '16px', background: theme.card, border: `1px solid ${theme.line}` }}>
              <span style={{ fontSize: '12px', color: theme.muted, fontWeight: 600, textTransform: 'uppercase' }}>Gross Trip Volume</span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: theme.ink, margin: '6px 0 4px' }}>
                ₹{telemetry.totalGmv.toLocaleString('en-IN')}
              </div>
              <span style={{ fontSize: '11.5px', color: theme.green, fontWeight: 600 }}>↑ 18.4% this month</span>
            </div>

            {/* Platform Revenue (Commission 15%) */}
            <div style={{ padding: '18px', borderRadius: '16px', background: theme.card, border: `1px solid ${theme.line}` }}>
              <span style={{ fontSize: '12px', color: theme.muted, fontWeight: 600, textTransform: 'uppercase' }}>Platform Net Commission (15%)</span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: theme.accent, margin: '6px 0 4px' }}>
                ₹{telemetry.netCommission.toLocaleString('en-IN')}
              </div>
              <span style={{ fontSize: '11.5px', color: theme.muted }}>Direct platform earnings</span>
            </div>

            {/* Driver Net Payouts */}
            <div style={{ padding: '18px', borderRadius: '16px', background: theme.card, border: `1px solid ${theme.line}` }}>
              <span style={{ fontSize: '12px', color: theme.muted, fontWeight: 600, textTransform: 'uppercase' }}>Driver Payouts (85%)</span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: theme.ink, margin: '6px 0 4px' }}>
                ₹{telemetry.driverPayouts.toLocaleString('en-IN')}
              </div>
              <span style={{ fontSize: '11.5px', color: theme.green, fontWeight: 600 }}>✓ Settled to verified chauffeurs</span>
            </div>

            {/* Total Trips */}
            <div style={{ padding: '18px', borderRadius: '16px', background: theme.card, border: `1px solid ${theme.line}` }}>
              <span style={{ fontSize: '12px', color: theme.muted, fontWeight: 600, textTransform: 'uppercase' }}>Total Trips Completed</span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: theme.blue, margin: '6px 0 4px' }}>
                {telemetry.completedCount} / {telemetry.totalTrips || 184}
              </div>
              <span style={{ fontSize: '11.5px', color: theme.muted }}>{telemetry.completionRate}% completion rate</span>
            </div>
          </section>

          {/* ========================================================
              TAB 1: DRIVERS MANAGEMENT (NEW REGISTRATIONS & OLD ACTIVE)
             ======================================================== */}
          {activeTab === 'drivers' && (
            <div>
              {/* Category Filter Tabs */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: `1px solid ${theme.line}`,
                  paddingBottom: '16px',
                  marginBottom: '20px',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setDriverCategory('new_registration');
                      setSelectedDriver(null);
                    }}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '12px',
                      border: 'none',
                      background: driverCategory === 'new_registration' ? theme.accent : theme.card,
                      color: driverCategory === 'new_registration' ? '#000000' : theme.ink,
                      fontWeight: 700,
                      fontSize: '13.5px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: driverCategory === 'new_registration' ? '0 4px 12px rgba(255,199,10,0.25)' : 'none'
                    }}
                  >
                    <span>🆕</span>
                    <span>New Registrations</span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: driverCategory === 'new_registration' ? '#000000' : theme.accent,
                        color: driverCategory === 'new_registration' ? '#FFFFFF' : '#000000',
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
                      padding: '10px 18px',
                      borderRadius: '12px',
                      border: 'none',
                      background: driverCategory === 'old_registered' ? theme.ink : theme.card,
                      color: driverCategory === 'old_registered' ? (isDark ? '#000000' : '#FFFFFF') : theme.ink,
                      fontWeight: 700,
                      fontSize: '13.5px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <span>✅</span>
                    <span>Old Registered Drivers</span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: driverCategory === 'old_registered' ? (isDark ? '#222' : '#FFF') : theme.line,
                        color: driverCategory === 'old_registered' ? '#FFF' : theme.ink,
                        fontSize: '11px',
                        fontWeight: 800
                      }}
                    >
                      {oldCount}
                    </span>
                  </button>
                </div>

                {/* Search Bar & Status Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="Search by ID, Name, PIN, Mobile..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{
                      padding: '9px 14px',
                      borderRadius: '10px',
                      border: `1px solid ${theme.line}`,
                      background: theme.card,
                      color: theme.ink,
                      fontSize: '13px',
                      minWidth: '240px',
                      outline: 'none'
                    }}
                  />
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    style={{
                      padding: '9px 12px',
                      borderRadius: '10px',
                      border: `1px solid ${theme.line}`,
                      background: theme.card,
                      color: theme.ink,
                      fontSize: '13px',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending KYC</option>
                    <option value="approved">Approved</option>
                    <option value="suspended">Suspended</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {/* Drivers Grid / List with Profile Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: selectedDriver ? '1fr 380px' : '1fr', gap: '24px' }}>
                {/* List Table / Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {filteredDrivers.length === 0 ? (
                    <div
                      style={{
                        padding: '48px 24px',
                        textAlign: 'center',
                        background: theme.card,
                        borderRadius: '16px',
                        border: `1px solid ${theme.line}`
                      }}
                    >
                      <span style={{ fontSize: '36px', display: 'block', marginBottom: '12px' }}>🔍</span>
                      <b style={{ fontSize: '16px', color: theme.ink }}>No drivers found in this category</b>
                      <p style={{ fontSize: '13px', color: theme.muted, margin: '6px 0 0' }}>
                        {searchQuery ? 'Try clearing your search query or filters.' : 'Newly registered drivers will appear here.'}
                      </p>
                    </div>
                  ) : (
                    filteredDrivers.map(drv => {
                      const isSelected = selectedDriver?.id === drv.id;
                      return (
                        <div
                          key={drv.id}
                          onClick={() => setSelectedDriver(drv)}
                          style={{
                            padding: '18px 20px',
                            borderRadius: '16px',
                            background: isSelected ? (isDark ? '#1C1F28' : '#EEF2F6') : theme.card,
                            border: isSelected ? `2px solid ${theme.accent}` : `1px solid ${theme.line}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {/* Driver Left: Avatar & Basic Details */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
                            <div
                              style={{
                                width: '52px',
                                height: '52px',
                                borderRadius: '14px',
                                background: theme.bg,
                                overflow: 'hidden',
                                border: `1.5px solid ${theme.line}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '18px',
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
                                <b style={{ fontSize: '15.5px', color: theme.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {drv.name}
                                </b>
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    padding: '2px 7px',
                                    borderRadius: '6px',
                                    background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                                    color: theme.accent,
                                    letterSpacing: '0.04em'
                                  }}
                                >
                                  {drv.id}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12.5px', color: theme.muted }}>
                                <span>📱 {drv.phone}</span>
                                <span>📍 {drv.city || 'Kochi'} (PIN: {drv.pincode || '682030'})</span>
                              </div>
                            </div>
                          </div>

                          {/* Driver Right: Status Badge & Quick Actions */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <span
                              style={{
                                fontSize: '11.5px',
                                fontWeight: 700,
                                padding: '4px 10px',
                                borderRadius: '8px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                                background:
                                  drv.status === 'approved' ? 'rgba(16, 185, 129, 0.15)' :
                                  drv.status === 'pending' ? 'rgba(245, 158, 11, 0.15)' :
                                  drv.status === 'suspended' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                                color:
                                  drv.status === 'approved' ? theme.green :
                                  drv.status === 'pending' ? '#F59E0B' :
                                  drv.status === 'suspended' ? theme.red : theme.muted
                              }}
                            >
                              {drv.status === 'pending' ? '⏳ Pending KYC' : drv.status}
                            </span>

                            {drv.category === 'new_registration' && drv.status === 'pending' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApprove(drv.id);
                                }}
                                style={{
                                  background: theme.green,
                                  color: '#FFFFFF',
                                  border: 'none',
                                  borderRadius: '8px',
                                  padding: '6px 12px',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                ✓ Quick Approve
                              </button>
                            )}

                            <span style={{ fontSize: '14px', color: theme.muted }}>&rarr;</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* ========================================================
                    FULL DRIVER PROFILE CARD (CRM DETAIL VIEW)
                   ======================================================== */}
                {selectedDriver && (
                  <div
                    style={{
                      background: theme.card,
                      borderRadius: '20px',
                      border: `1px solid ${theme.line}`,
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '18px',
                      height: 'fit-content',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.15)'
                    }}
                  >
                    {/* Header: ID & Close */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 800,
                          background: theme.accent,
                          color: '#000000',
                          padding: '3px 9px',
                          borderRadius: '6px',
                          letterSpacing: '0.04em'
                        }}
                      >
                        Profile: {selectedDriver.id}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedDriver(null)}
                        style={{ background: 'none', border: 'none', color: theme.muted, cursor: 'pointer', fontSize: '16px' }}
                      >
                        ✕
                      </button>
                    </div>

                    {/* Driver Avatar & Identity */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                      <div
                        style={{
                          width: '84px',
                          height: '84px',
                          borderRadius: '22px',
                          overflow: 'hidden',
                          border: `2.5px solid ${theme.accent}`,
                          marginBottom: '10px'
                        }}
                      >
                        {selectedDriver.avatar ? (
                          <img src={selectedDriver.avatar} alt={selectedDriver.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', background: theme.bg }}>
                            👤
                          </div>
                        )}
                      </div>
                      <b style={{ fontSize: '18px', color: theme.ink }}>{selectedDriver.name}</b>
                      <span style={{ fontSize: '12.5px', color: theme.muted, margin: '2px 0 6px' }}>
                        {selectedDriver.category === 'new_registration' ? '🆕 New Registration' : '⭐ Verified Partner'}
                      </span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <a
                          href={`tel:${selectedDriver.phone}`}
                          style={{
                            padding: '5px 12px',
                            borderRadius: '8px',
                            background: theme.bg,
                            border: `1px solid ${theme.line}`,
                            color: theme.ink,
                            fontSize: '12px',
                            fontWeight: 600,
                            textDecoration: 'none'
                          }}
                        >
                          📞 Call
                        </a>
                        <a
                          href={`mailto:${selectedDriver.email}`}
                          style={{
                            padding: '5px 12px',
                            borderRadius: '8px',
                            background: theme.bg,
                            border: `1px solid ${theme.line}`,
                            color: theme.ink,
                            fontSize: '12px',
                            fontWeight: 600,
                            textDecoration: 'none'
                          }}
                        >
                          ✉️ Email
                        </a>
                      </div>
                    </div>

                    {/* Detailed Profile Info List */}
                    <div
                      style={{
                        padding: '14px',
                        borderRadius: '14px',
                        background: theme.bg,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        fontSize: '13px'
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '11px', color: theme.muted, textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>Mobile Number</span>
                        <b style={{ color: theme.ink }}>{selectedDriver.phone || 'N/A'}</b>
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', color: theme.muted, textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>Email Address</span>
                        <b style={{ color: theme.ink }}>{selectedDriver.email || 'N/A'}</b>
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', color: theme.muted, textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>Address & Locality</span>
                        <span style={{ color: theme.ink, lineHeight: 1.4, display: 'block' }}>
                          {selectedDriver.homeAddress ? `${selectedDriver.homeAddress}, ${selectedDriver.street}` : 'TC 14/820, Vazhuthacaud'}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <span style={{ fontSize: '11px', color: theme.muted, textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>City</span>
                          <b style={{ color: theme.ink }}>{selectedDriver.city || 'Kochi'}</b>
                        </div>
                        <div>
                          <span style={{ fontSize: '11px', color: theme.muted, textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>PIN Code</span>
                          <b style={{ color: theme.ink }}>{selectedDriver.pincode || '682030'}</b>
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', color: theme.muted, textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>State & Nationality</span>
                        <span style={{ color: theme.ink }}>{selectedDriver.state || 'Kerala'}, {selectedDriver.nationality || 'India'}</span>
                      </div>
                    </div>

                    {/* KYC Documents Preview */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '11.5px', color: theme.muted, textTransform: 'uppercase', fontWeight: 700 }}>
                        KYC Documents Verification
                      </span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {/* DL Photo Thumbnail */}
                        <div
                          onClick={() => selectedDriver.dlPhoto && setIsPhotoPreviewOpen(selectedDriver.dlPhoto)}
                          style={{
                            padding: '8px',
                            borderRadius: '10px',
                            background: theme.bg,
                            border: `1px solid ${theme.line}`,
                            cursor: 'pointer'
                          }}
                        >
                          <span style={{ fontSize: '11px', color: theme.muted, display: 'block' }}>Driving Licence</span>
                          <b style={{ fontSize: '12px', color: theme.ink, display: 'block', margin: '2px 0 6px' }}>
                            {selectedDriver.dlNumber || 'KL-07-20160049281'}
                          </b>
                          {selectedDriver.dlPhoto ? (
                            <img src={selectedDriver.dlPhoto} alt="DL" style={{ width: '100%', height: '56px', borderRadius: '6px', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ height: '56px', borderRadius: '6px', background: theme.card, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                              📄
                            </div>
                          )}
                        </div>

                        {/* Aadhaar Photo Thumbnail */}
                        <div
                          onClick={() => selectedDriver.aadharPhoto && setIsPhotoPreviewOpen(selectedDriver.aadharPhoto)}
                          style={{
                            padding: '8px',
                            borderRadius: '10px',
                            background: theme.bg,
                            border: `1px solid ${theme.line}`,
                            cursor: 'pointer'
                          }}
                        >
                          <span style={{ fontSize: '11px', color: theme.muted, display: 'block' }}>Aadhaar Card</span>
                          <b style={{ fontSize: '12px', color: theme.ink, display: 'block', margin: '2px 0 6px' }}>
                            {selectedDriver.aadharNumber || 'XXXX XXXX 1234'}
                          </b>
                          {selectedDriver.aadharPhoto ? (
                            <img src={selectedDriver.aadharPhoto} alt="Aadhaar" style={{ width: '100%', height: '56px', borderRadius: '6px', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ height: '56px', borderRadius: '6px', background: theme.card, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                              🪪
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* KYC Actions Buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                      {selectedDriver.status !== 'approved' && (
                        <button
                          type="button"
                          onClick={() => handleApprove(selectedDriver.id)}
                          style={{
                            width: '100%',
                            height: '42px',
                            borderRadius: '12px',
                            background: theme.green,
                            color: '#FFFFFF',
                            border: 'none',
                            fontWeight: 700,
                            fontSize: '13.5px',
                            cursor: 'pointer'
                          }}
                        >
                          ✓ Approve KYC & Activate Chauffeur
                        </button>
                      )}

                      {selectedDriver.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => handleReject(selectedDriver.id)}
                          style={{
                            width: '100%',
                            height: '38px',
                            borderRadius: '12px',
                            background: 'transparent',
                            color: theme.red,
                            border: `1.5px solid ${theme.red}`,
                            fontWeight: 700,
                            fontSize: '13px',
                            cursor: 'pointer'
                          }}
                        >
                          ✕ Reject Documents
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleToggleSuspend(selectedDriver.id)}
                        style={{
                          width: '100%',
                          height: '38px',
                          borderRadius: '12px',
                          background: theme.bg,
                          color: theme.ink,
                          border: `1px solid ${theme.line}`,
                          fontWeight: 600,
                          fontSize: '12.5px',
                          cursor: 'pointer'
                        }}
                      >
                        {selectedDriver.status === 'suspended' ? '▶ Unsuspend Driver' : '⏸ Suspend Account'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 2: TRIP CALCULATIONS & REVENUE CRM ENGINE
             ======================================================== */}
          {activeTab === 'telemetry' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Interactive Calculation Simulator */}
              <div
                style={{
                  padding: '24px',
                  borderRadius: '20px',
                  background: theme.card,
                  border: `1px solid ${theme.line}`
                }}
              >
                <div style={{ marginBottom: '18px' }}>
                  <b style={{ fontSize: '17px', color: theme.ink }}>Interactive Ride Commission & Profit Calculator</b>
                  <p style={{ fontSize: '13px', color: theme.muted, margin: '4px 0 0' }}>
                    Simulate platform revenues, driver payouts, and net take rate based on ride tariffs.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                        <span style={{ color: theme.muted }}>Estimated Ride Fare:</span>
                        <b style={{ color: theme.ink }}>₹{simFare}</b>
                      </div>
                      <input
                        type="range"
                        min="250"
                        max="3500"
                        step="50"
                        value={simFare}
                        onChange={e => setSimFare(Number(e.target.value))}
                        style={{ width: '100%', accentColor: theme.accent }}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                        <span style={{ color: theme.muted }}>Platform Take Rate (Commission %):</span>
                        <b style={{ color: theme.accent }}>{simCommission}%</b>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="30"
                        step="1"
                        value={simCommission}
                        onChange={e => setSimCommission(Number(e.target.value))}
                        style={{ width: '100%', accentColor: theme.accent }}
                      />
                    </div>
                  </div>

                  {/* Profit breakdown cards */}
                  <div
                    style={{
                      padding: '18px',
                      borderRadius: '16px',
                      background: theme.bg,
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '14px'
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '11.5px', color: theme.muted, textTransform: 'uppercase', fontWeight: 700 }}>Ridingo Net Fee</span>
                      <div style={{ fontSize: '22px', fontWeight: 800, color: theme.accent, margin: '4px 0' }}>
                        ₹{Math.round((simFare * simCommission) / 100)}
                      </div>
                      <span style={{ fontSize: '11px', color: theme.muted }}>Per trip margin</span>
                    </div>

                    <div>
                      <span style={{ fontSize: '11.5px', color: theme.muted, textTransform: 'uppercase', fontWeight: 700 }}>Driver Earning</span>
                      <div style={{ fontSize: '22px', fontWeight: 800, color: theme.green, margin: '4px 0' }}>
                        ₹{simFare - Math.round((simFare * simCommission) / 100)}
                      </div>
                      <span style={{ fontSize: '11px', color: theme.muted }}>Direct chauffeur payout</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trip Calculations Table */}
              <div
                style={{
                  borderRadius: '20px',
                  background: theme.card,
                  border: `1px solid ${theme.line}`,
                  padding: '24px'
                }}
              >
                <b style={{ fontSize: '17px', color: theme.ink, display: 'block', marginBottom: '14px' }}>
                  Recent Completed Trips & Financial Breakdown
                </b>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${theme.line}`, color: theme.muted }}>
                        <th style={{ padding: '10px 14px' }}>Trip ID</th>
                        <th style={{ padding: '10px 14px' }}>Pickup & Drop</th>
                        <th style={{ padding: '10px 14px' }}>Driver</th>
                        <th style={{ padding: '10px 14px' }}>Total Fare</th>
                        <th style={{ padding: '10px 14px' }}>Ridingo 15%</th>
                        <th style={{ padding: '10px 14px' }}>Driver 85%</th>
                        <th style={{ padding: '10px 14px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(trips.length > 0 ? trips : [
                        { id: 'TRP-8419', pickup: 'Edappally Toll', drop: 'Cochin Airport T3', driver: 'Ravi Kumar', fare: 850, status: 'completed' },
                        { id: 'TRP-8420', pickup: 'Kaloor Stadium', drop: 'Lulu Mall Edappally', driver: 'Sujith V Nair', fare: 450, status: 'completed' },
                        { id: 'TRP-8421', pickup: 'Marine Drive Kochi', drop: 'Infopark Kakkanad', driver: 'Manoj P V', fare: 650, status: 'completed' }
                      ]).map((t, idx) => {
                        const fareVal = Number(t.fare) || 500;
                        const commVal = Math.round(fareVal * 0.15);
                        const driverVal = fareVal - commVal;
                        return (
                          <tr key={t.id || idx} style={{ borderBottom: `1px solid ${theme.line}` }}>
                            <td style={{ padding: '12px 14px', fontWeight: 700, color: theme.ink }}>{t.id}</td>
                            <td style={{ padding: '12px 14px', color: theme.muted }}>
                              {t.pickup?.split(',')[0]} &rarr; {t.drop?.split(',')[0]}
                            </td>
                            <td style={{ padding: '12px 14px', color: theme.ink }}>{t.driver?.name || t.driver || 'Ravi Kumar'}</td>
                            <td style={{ padding: '12px 14px', fontWeight: 700, color: theme.ink }}>₹{fareVal}</td>
                            <td style={{ padding: '12px 14px', fontWeight: 700, color: theme.accent }}>₹{commVal}</td>
                            <td style={{ padding: '12px 14px', color: theme.green, fontWeight: 700 }}>₹{driverVal}</td>
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: theme.green, padding: '3px 8px', borderRadius: '6px', background: 'rgba(16,185,129,0.1)' }}>
                                {t.status || 'completed'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 3: ALL TRIPS TELEMETRY
             ======================================================== */}
          {activeTab === 'trips' && (
            <div style={{ borderRadius: '20px', background: theme.card, border: `1px solid ${theme.line}`, padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <b style={{ fontSize: '17px', color: theme.ink }}>Dispatch & Trips Real-Time Stream</b>
                <span style={{ fontSize: '12.5px', color: theme.muted }}>{trips.length} active records in memory</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {trips.map(t => (
                  <div
                    key={t.id}
                    style={{
                      padding: '14px 18px',
                      borderRadius: '14px',
                      background: theme.bg,
                      border: `1px solid ${theme.line}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <b style={{ fontSize: '14px', color: theme.ink }}>{t.id}</b>
                      <span style={{ fontSize: '12.5px', color: theme.muted, display: 'block', margin: '2px 0' }}>
                        {t.pickup} &rarr; {t.drop}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <b style={{ fontSize: '15px', color: theme.ink }}>₹{t.fare}</b>
                      <span style={{ fontSize: '11px', display: 'block', color: theme.accent, fontWeight: 700 }}>
                        Status: {t.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 4: USER ACCOUNTS
             ======================================================== */}
          {activeTab === 'users' && (
            <div style={{ borderRadius: '20px', background: theme.card, border: `1px solid ${theme.line}`, padding: '24px' }}>
              <b style={{ fontSize: '17px', color: theme.ink, display: 'block', marginBottom: '16px' }}>
                Registered User App Accounts ({usersList.length})
              </b>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {usersList.map((usr, i) => (
                  <div
                    key={usr.id || i}
                    style={{
                      padding: '18px',
                      borderRadius: '16px',
                      background: theme.bg,
                      border: `1px solid ${theme.line}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: theme.accent, color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                        {usr.name?.[0] || 'U'}
                      </div>
                      <div>
                        <b style={{ fontSize: '14.5px', color: theme.ink }}>{usr.name}</b>
                        <span style={{ fontSize: '11.5px', color: theme.muted, display: 'block' }}>{usr.id}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: '12.5px', color: theme.muted, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span>📱 {usr.phone}</span>
                      <span>✉️ {usr.email}</span>
                      <span>🚗 Total Rides Booked: <strong style={{ color: theme.ink }}>{usr.rides || 5}</strong></span>
                      <span>💳 Lifetime Spent: <strong style={{ color: theme.accent }}>₹{(usr.spent || 3400).toLocaleString('en-IN')}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ========================================================
          ADD NEW DRIVER MODAL
         ======================================================== */}
      {isAddDriverModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setIsAddDriverModalOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '460px',
              borderRadius: '24px',
              background: theme.card,
              border: `1px solid ${theme.line}`,
              padding: '28px',
              boxShadow: '0 24px 60px rgba(0,0,0,0.5)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <b style={{ fontSize: '18px', color: theme.ink }}>Register New Driver Chauffeur</b>
              <button
                type="button"
                onClick={() => setIsAddDriverModalOpen(false)}
                style={{ background: 'none', border: 'none', color: theme.muted, cursor: 'pointer', fontSize: '18px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDriverSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: theme.muted, display: 'block', marginBottom: '4px', fontWeight: 600 }}>Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Arun Kumar"
                  value={newDriverName}
                  onChange={e => setNewDriverName(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: theme.bg, border: `1px solid ${theme.line}`, color: theme.ink, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: theme.muted, display: 'block', marginBottom: '4px', fontWeight: 600 }}>Mobile *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98401 23456"
                    value={newDriverPhone}
                    onChange={e => setNewDriverPhone(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: theme.bg, border: `1px solid ${theme.line}`, color: theme.ink, boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: theme.muted, display: 'block', marginBottom: '4px', fontWeight: 600 }}>Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="driver@example.com"
                    value={newDriverEmail}
                    onChange={e => setNewDriverEmail(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: theme.bg, border: `1px solid ${theme.line}`, color: theme.ink, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: theme.muted, display: 'block', marginBottom: '4px', fontWeight: 600 }}>Home Address</label>
                <input
                  type="text"
                  placeholder="House Name / Flat No."
                  value={newDriverAddress}
                  onChange={e => setNewDriverAddress(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: theme.bg, border: `1px solid ${theme.line}`, color: theme.ink, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: theme.muted, display: 'block', marginBottom: '4px', fontWeight: 600 }}>City</label>
                  <input
                    type="text"
                    value={newDriverCity}
                    onChange={e => setNewDriverCity(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: theme.bg, border: `1px solid ${theme.line}`, color: theme.ink, boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: theme.muted, display: 'block', marginBottom: '4px', fontWeight: 600 }}>PIN Code</label>
                  <input
                    type="text"
                    value={newDriverPin}
                    onChange={e => setNewDriverPin(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: theme.bg, border: `1px solid ${theme.line}`, color: theme.ink, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: theme.muted, display: 'block', marginBottom: '4px', fontWeight: 600 }}>Driving Licence No.</label>
                  <input
                    type="text"
                    placeholder="KL-07-20210049281"
                    value={newDriverDl}
                    onChange={e => setNewDriverDl(e.target.value.toUpperCase())}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: theme.bg, border: `1px solid ${theme.line}`, color: theme.ink, boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: theme.muted, display: 'block', marginBottom: '4px', fontWeight: 600 }}>Aadhaar No.</label>
                  <input
                    type="text"
                    placeholder="XXXX XXXX 1234"
                    value={newDriverAadhar}
                    onChange={e => setNewDriverAadhar(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: theme.bg, border: `1px solid ${theme.line}`, color: theme.ink, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                style={{
                  width: '100%',
                  height: '46px',
                  borderRadius: '12px',
                  background: theme.accent,
                  color: '#000000',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '14.5px',
                  cursor: 'pointer',
                  marginTop: '8px',
                  boxShadow: '0 4px 16px rgba(255,199,10,0.3)'
                }}
              >
                Register Driver Profile &rarr;
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          IMAGE ZOOM / PREVIEW MODAL
         ======================================================== */}
      {isPhotoPreviewOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
          onClick={() => setIsPhotoPreviewOpen(null)}
        >
          <div style={{ maxWidth: '85vw', maxHeight: '85vh', position: 'relative' }}>
            <button
              type="button"
              onClick={() => setIsPhotoPreviewOpen(null)}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                background: 'none',
                border: 'none',
                color: '#FFFFFF',
                fontSize: '24px',
                cursor: 'pointer'
              }}
            >
              ✕ Close
            </button>
            <img
              src={isPhotoPreviewOpen}
              alt="KYC Document Preview"
              style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '16px', objectFit: 'contain', boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
