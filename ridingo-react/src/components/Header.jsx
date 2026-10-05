import React from 'react';
import { useApp } from '../context/AppContext';

export default function Header() {
  const { view, setView, resetDemo } = useApp();

  return (
    <header className="top">
      <div className="brand">
        <span className="logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="2.3" />
            <path d="M3.2 11h6.5M14.3 11h6.5M12 14.3V21" />
          </svg>
        </span>
        <div>
          <b>Ridingo</b>
          <small>Hire a driver for your own car</small>
        </div>
      </div>
      <div className="top-r">
        <button className="sb-status-btn" aria-label="Supabase database status">
          <span className="sb-status-dot"></span>
          <span className="sb-status-text">Supabase DB</span>
        </button>
        <div className="seg viewseg" role="tablist" aria-label="Choose app">
          <button
            className={view === 'user' ? 'on' : ''}
            onClick={() => setView('user')}
          >
            User app
          </button>
          <button
            className={view === 'driver' ? 'on' : ''}
            onClick={() => setView('driver')}
          >
            Driver app
          </button>
        </div>
        <button className="btn line sm" onClick={resetDemo}>
          Reset demo
        </button>
      </div>
    </header>
  );
}
