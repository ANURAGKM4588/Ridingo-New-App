import React from 'react';
import { useApp } from '../context/AppContext';

export default function BottomNav() {
  const { uTab, setUTab } = useApp();

  return (
    <nav className="nav" id="u-nav" aria-label="User app">
      <button
        className={`nv ${uTab === 'home' ? 'on' : ''}`}
        onClick={() => setUTab('home')}
      >
        <span className="nv-i">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </span>
        <span className="nv-l">Home</span>
      </button>

      <button
        className={`nv ${uTab === 'trips' ? 'on' : ''}`}
        onClick={() => setUTab('trips')}
      >
        <span className="nv-i">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M12 7v5l4 2" />
          </svg>
        </span>
        <span className="nv-l">History</span>
      </button>

      <button
        className={`nv ${uTab === 'wallet' ? 'on' : ''}`}
        onClick={() => setUTab('wallet')}
      >
        <span className="nv-i">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="20" height="14" x="2" y="5" rx="2" />
            <line x1="2" x2="22" y1="10" y2="10" />
          </svg>
        </span>
        <span className="nv-l">Wallet</span>
      </button>

      <button
        className={`nv ${uTab === 'profile' ? 'on' : ''}`}
        onClick={() => setUTab('profile')}
      >
        <span className="nv-i">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="5" />
            <path d="M20 21a8 8 0 0 0-16 0" />
          </svg>
        </span>
        <span className="nv-l">Profile</span>
      </button>
    </nav>
  );
}
