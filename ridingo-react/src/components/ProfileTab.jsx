import React from 'react';
import { useApp } from '../context/AppContext';

export default function ProfileTab() {
  const { user, theme, setTheme, logout, loginDemo } = useApp();

  return (
    <div className="tab-pane active" id="tab-profile">
      <div className="hello" style={{ marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '34px', fontWeight: 700, letterSpacing: '-1px', lineHeight: 1.1 }}>Profile</h1>
          <p>Account & preferences</p>
        </div>
      </div>

      {/* User Info Card */}
      <div
        className="prof-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '16px',
          borderRadius: '20px',
          background: 'var(--card)',
          border: '1px solid var(--line)',
          marginBottom: '20px'
        }}
      >
        <span
          className="av"
          style={{ width: '56px', height: '56px', padding: 0, overflow: 'hidden', flexShrink: 0 }}
        >
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            user?.name?.slice(0, 2).toUpperCase() || 'CU'
          )}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <b style={{ fontSize: '17px' }}>{user?.name || 'Guest User'}</b>
            <span style={{ fontSize: '11px', padding: '2px 6px', background: 'var(--good-soft)', color: 'var(--good)', borderRadius: '6px', fontWeight: 700 }}>
              VERIFIED
            </span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>{user?.phone}</div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
            🚗 {user?.car?.model || 'Hyundai Creta'} ({user?.car?.plate || 'KL 07 AB 4821'})
          </div>
        </div>
      </div>

      {/* Appearance / Theme Settings */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>Appearance</h4>
        <div className="seg" style={{ display: 'flex', width: '100%' }}>
          <button
            style={{ flex: 1 }}
            className={theme === 'system' ? 'on' : ''}
            onClick={() => setTheme('system')}
          >
            System
          </button>
          <button
            style={{ flex: 1 }}
            className={theme === 'light' ? 'on' : ''}
            onClick={() => setTheme('light')}
          >
            Light
          </button>
          <button
            style={{ flex: 1 }}
            className={theme === 'dark' ? 'on' : ''}
            onClick={() => setTheme('dark')}
          >
            Dark
          </button>
        </div>
      </div>

      {/* Ride Preferences */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>Chauffeur Preferences</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--card)', borderRadius: '14px', border: '1px solid var(--line)' }}>
            <span style={{ fontSize: '14px' }}>Quiet Cabin Mode</span>
            <span style={{ fontWeight: 600, color: 'var(--good)' }}>Enabled</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--card)', borderRadius: '14px', border: '1px solid var(--line)' }}>
            <span style={{ fontSize: '14px' }}>AC Temperature</span>
            <span style={{ fontWeight: 600 }}>22°C (Chill)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--card)', borderRadius: '14px', border: '1px solid var(--line)' }}>
            <span style={{ fontSize: '14px' }}>Live Ride Sharing</span>
            <span style={{ fontWeight: 600, color: 'var(--good)' }}>Spouse (Priya)</span>
          </div>
        </div>
      </div>

      {/* Account Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
        <button
          className="btn line"
          style={{ width: '100%', padding: '14px', borderRadius: '14px', fontWeight: 600, cursor: 'pointer' }}
          onClick={loginDemo}
        >
          🔄 Reload Demo Account
        </button>
        <button
          className="btn line"
          style={{ width: '100%', padding: '14px', borderRadius: '14px', color: 'var(--bad)', borderColor: 'var(--bad)', fontWeight: 600, cursor: 'pointer' }}
          onClick={logout}
        >
          Log Out
        </button>
      </div>
    </div>
  );
}
