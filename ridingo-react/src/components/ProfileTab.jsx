import React from 'react';
import { useApp } from '../context/AppContext';

export default function ProfileTab() {
  const { user, theme, setTheme, logout, loginDemo } = useApp();

  return (
    <div>
      <div className="hello" style={{ marginBottom: '14px' }}>
        <h1>Profile</h1>
        <p>Account & preferences</p>
      </div>

      {/* Exact Profile Card */}
      <div className="card prof-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ position: 'relative', display: 'inline-block', flex: 'none' }}>
            <span className="av lg" style={{ width: '48px', height: '48px', overflow: 'hidden' }}>
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                'AM'
              )}
            </span>
          </div>
          <div className="prof-meta grow" style={{ minWidth: 0 }}>
            <span className="prof-meta-name" style={{ fontSize: '17px', fontWeight: 700, display: 'block' }}>
              {user?.name || 'Arjun Menon'}
            </span>
            <span className="prof-meta-sub" style={{ fontSize: '13px', color: 'var(--muted)' }}>
              {user?.phone || '+91 98401 23456'} · {user?.email || 'arjun.menon@example.com'}
            </span>
          </div>
        </div>
        <div style={{ marginTop: '12px', display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span className="pill good">Verified Owner</span>
          <span className="sub small">Member since 2024</span>
        </div>
      </div>

      {/* Safety & Security Group */}
      <div className="setgroup">
        <h4>Safety & Security</h4>
        <div className="card" style={{ padding: '0 16px' }}>
          <div className="setrow">
            <div className="grow">
              <b>Ride Start PIN</b>
              <span className="sub">PIN: <b>{user?.pinCode || '4821'}</b> · Driver verifies before departure</span>
            </div>
            <span className="pill good">Active</span>
          </div>
          <div className="setrow">
            <div className="grow">
              <b>Share Live Trip Status</b>
              <span className="sub">Auto-send live GPS link to your emergency contacts</span>
            </div>
            <span className="pill good">Enabled</span>
          </div>
          <div className="setrow">
            <div className="grow">
              <b>Emergency SOS Contacts</b>
              <span className="sub">Priya Menon (Spouse) configured for real-time alerts</span>
            </div>
            <span className="pill">Configured</span>
          </div>
          <div className="setrow" style={{ border: 'none' }}>
            <div className="grow">
              <b>Trip Insurance Policy</b>
              <span className="sub">Standard (₹5L) on-trip vehicle & medical protection</span>
            </div>
            <span className="pill good">Active</span>
          </div>
        </div>
      </div>

      {/* Ride Preferences */}
      <div className="setgroup">
        <h4>Ride Preferences</h4>
        <div className="card" style={{ padding: '0 16px' }}>
          <div className="setrow">
            <div className="grow">
              <b>Quiet Ride Mode</b>
              <span className="sub">Driver keeps cabin quiet for calls and focus</span>
            </div>
            <span className="pill good">Active</span>
          </div>
          <div className="setrow">
            <div className="grow">
              <b>Cabin Temperature & AC</b>
              <span className="sub">22°C (Chill) · Auto pre-cool upon arrival</span>
            </div>
            <span className="pill">Active</span>
          </div>
          <div className="setrow" style={{ border: 'none' }}>
            <div className="grow">
              <b>Driver Language</b>
              <span className="sub">English, Hindi, Malayalam</span>
            </div>
            <span className="pill">3 Langs</span>
          </div>
        </div>
      </div>

      {/* App & Privacy (Appearance) */}
      <div className="setgroup">
        <h4>App & Privacy</h4>
        <div className="card" style={{ padding: '0 16px' }}>
          <div className="setrow" style={{ display: 'block', padding: '14px 0' }}>
            <b>Appearance</b>
            <div style={{ marginTop: '10px' }}>
              <div className="seg" role="group" aria-label="Appearance">
                {[['system', 'System'], ['light', 'Light'], ['dark', 'Dark']].map(([mode, label]) => (
                  <button
                    key={mode}
                    className={theme === mode ? 'on' : ''}
                    onClick={() => setTheme(mode)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sign Out Actions */}
      <div style={{ textAlign: 'center', padding: '24px 0 10px' }}>
        <p className="mut small" style={{ margin: 0 }}>Ridingo for Car Owners · v2.4.2</p>
        <button
          className="btn line sm"
          style={{ marginTop: '12px', color: 'var(--bad)', borderColor: 'rgba(239,68,68,.3)', cursor: 'pointer' }}
          onClick={logout}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
