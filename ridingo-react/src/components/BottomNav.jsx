import React from 'react';
import { useApp } from '../context/AppContext';
import Icon from './Icon';

export default function BottomNav() {
  const { uTab, setUTab } = useApp();

  const NAV_ITEMS = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'trips', label: 'History', icon: 'history' },
    { id: 'wallet', label: 'Wallet', icon: 'wallet' },
    { id: 'profile', label: 'Profile', icon: 'user' }
  ];

  return (
    <nav className="nav" id="u-nav" aria-label="User app">
      {NAV_ITEMS.map(n => (
        <button
          key={n.id}
          className={`nv ${uTab === n.id ? 'on' : ''}`}
          aria-label={n.label}
          aria-current={uTab === n.id}
          onClick={() => setUTab(n.id)}
        >
          <span className="nv-i">
            <Icon name={n.icon} size={23} />
          </span>
          <span className="nv-l">{n.label}</span>
        </button>
      ))}
    </nav>
  );
}
