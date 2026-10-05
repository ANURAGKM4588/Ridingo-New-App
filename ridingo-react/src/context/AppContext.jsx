import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { App as CapApp } from '@capacitor/app';
import { StatusBar } from '@capacitor/status-bar';

const AppContext = createContext(null);

export const DEFAULT_USER = {
  name: 'Arjun Menon',
  phone: '+91 98401 23456',
  email: 'arjun.menon@example.com',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  car: { model: 'Hyundai Creta (Automatic)', plate: 'KL 07 AB 4821', trans: 'Automatic' },
  notif: true,
  pin: true,
  pinCode: '4821',
  liveShare: true,
  quiet: false,
  acTemp: '22°C',
  acMode: 'Chill',
  acPrecool: true,
  whatsapp: true,
  promo: true,
  sosContacts: [{ name: 'Priya Menon', relation: 'Spouse', phone: '+91 98401 98765' }],
  insuranceTier: 'standard',
  nominee: { name: 'Priya Menon', relation: 'Spouse' },
  languages: ['English', 'Hindi', 'Malayalam'],
  quietCabin: true,
  maskNumber: true,
  locPrivacy: true
};

export const INITIAL_TRIPS = [
  {
    id: 'TRP-1092',
    cat: 'hourly',
    qty: 3,
    pickup: 'Edappally Toll, Kochi',
    drop_loc: 'Lulu Mall, Edappally',
    when_ts: Date.now() - 3600000,
    fare: 796,
    advance: 0,
    status: 'inprogress',
    driver: 'Ravi Kumar',
    car: { model: 'Hyundai Creta', plate: 'KL 07 AB 4821', trans: 'Automatic' },
    rider: { name: 'Arjun Menon', phone: '+91 98401 23456' },
    cashback: 40
  },
  {
    id: 'TRP-1085',
    cat: 'airport',
    qty: 1,
    pickup: 'Panampilly Nagar, Kochi',
    drop_loc: 'Cochin International Airport (COK)',
    when_ts: Date.now() - 86400000 * 2,
    fare: 699,
    advance: 0,
    status: 'completed',
    driver: 'Vikram Joshi',
    car: { model: 'Hyundai Creta', plate: 'KL 07 AB 4821', trans: 'Automatic' },
    rider: { name: 'Arjun Menon', phone: '+91 98401 23456' },
    cashback: 35
  }
];

export const INITIAL_UTX = [
  { ts: Date.now() - 86400000 * 5, type: 'topup', amount: 2000, title: 'Wallet Top-up', sub: 'UPI • Google Pay' },
  { ts: Date.now() - 86400000 * 2, type: 'ride', amount: -699, title: 'Trip TRP-1085', sub: 'Panampilly to Airport' },
  { ts: Date.now() - 86400000 * 2, type: 'cashback', amount: 35, title: 'Ride Cashback (5%)', sub: 'TRP-1085' }
];

export function AppProvider({ children }) {
  // Theme state
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('ridingo_theme_pref') || 'system';
    } catch (e) {
      return 'system';
    }
  });

  // User state
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('ridingo_user_session');
      return saved ? JSON.parse(saved) : DEFAULT_USER;
    } catch (e) {
      return DEFAULT_USER;
    }
  });

  // App navigation state
  const [view, setView] = useState('user'); // 'user' | 'driver'
  const [uTab, setUTab] = useState('home'); // 'home' | 'history' | 'wallet' | 'profile'
  const [dTab, setDTab] = useState('dash');
  const [tripsFilter, setTripsFilter] = useState('all');
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingCategory, setBookingCategory] = useState('hourly');
  const [bookingDestination, setBookingDestination] = useState('');
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  // Trips & Wallet
  const [trips, setTrips] = useState(INITIAL_TRIPS);
  const [utx, setUtx] = useState(INITIAL_UTX);
  const [driverOnline, setDriverOnline] = useState(true);
  const [toasts, setToasts] = useState([]);

  // Toast helper
  const addToast = (msg, icon = 'check') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg, icon }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3200);
  };

  // Sync theme with HTML attribute & Capacitor StatusBar
  useEffect(() => {
    try {
      let isDark = false;
      if (theme === 'dark') isDark = true;
      else if (theme === 'light') isDark = false;
      else {
        isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      }

      const themeVal = isDark ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', themeVal);
      document.body.setAttribute('data-theme', themeVal);
      localStorage.setItem('ridingo_theme_pref', theme);

      // Capacitor StatusBar
      if (window.Capacitor?.isPluginAvailable('StatusBar')) {
        StatusBar.setStyle({ style: isDark ? 'DARK' : 'LIGHT' }).catch(() => {});
        StatusBar.setBackgroundColor({ color: isDark ? '#000000' : '#FFFFFF' }).catch(() => {});
        StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
      }
    } catch (e) {}
  }, [theme]);

  // Capacitor Android Back Button handler
  useEffect(() => {
    let backListener = null;
    try {
      if (window.Capacitor?.isPluginAvailable('App')) {
        CapApp.addListener('backButton', ({ canGoBack }) => {
          if (bookingOpen) {
            setBookingOpen(false);
          } else if (onboardingOpen) {
            setOnboardingOpen(false);
          } else if (uTab !== 'home') {
            setUTab('home');
          } else if (canGoBack) {
            window.history.back();
          } else {
            CapApp.exitApp();
          }
        }).then(h => {
          backListener = h;
        }).catch(() => {});
      }
    } catch (e) {}

    return () => {
      if (backListener && typeof backListener.remove === 'function') {
        backListener.remove();
      }
    };
  }, [bookingOpen, onboardingOpen, uTab]);

  // User session sync
  const loginDemo = () => {
    setUser(DEFAULT_USER);
    try {
      localStorage.setItem('ridingo_user_session', JSON.stringify(DEFAULT_USER));
    } catch (e) {}
    setOnboardingOpen(false);
    addToast('Signed in as Arjun Menon', 'check');
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem('ridingo_user_session');
    } catch (e) {}
    setOnboardingOpen(true);
    addToast('Logged out', 'info');
  };

  const resetDemo = () => {
    setUser(DEFAULT_USER);
    setTrips(INITIAL_TRIPS);
    setUtx(INITIAL_UTX);
    setBookingOpen(false);
    setOnboardingOpen(false);
    setUTab('home');
    addToast('Demo state reset', 'check');
  };

  const bookRide = (cat, qty, pickup, drop, fare) => {
    const newTrip = {
      id: 'TRP-' + Math.floor(1000 + Math.random() * 9000),
      cat,
      qty,
      pickup,
      drop_loc: drop,
      when_ts: Date.now(),
      fare,
      advance: 0,
      status: 'requested',
      driver: 'Ravi Kumar',
      car: user?.car || { model: 'Hyundai Creta', plate: 'KL 07 AB 4821', trans: 'Automatic' },
      rider: { name: user?.name || 'Car Owner', phone: user?.phone || '+91 98401 23456' },
      cashback: Math.round(fare * 0.05)
    };
    setTrips(prev => [newTrip, ...prev]);
    setBookingOpen(false);
    setUTab('trips');
    addToast(`Booked ${cat.toUpperCase()} driver! Waiting for driver...`, 'check');
  };

  const userBalance = utx.reduce((a, t) => a + t.amount, 0);

  return (
    <AppContext.Provider
      value={{
        theme,
        setTheme,
        user,
        setUser,
        loginDemo,
        logout,
        resetDemo,
        view,
        setView,
        uTab,
        setUTab,
        dTab,
        setDTab,
        trips,
        setTrips,
        tripsFilter,
        setTripsFilter,
        utx,
        setUtx,
        userBalance,
        bookingOpen,
        setBookingOpen,
        bookingCategory,
        setBookingCategory,
        bookingDestination,
        setBookingDestination,
        bookRide,
        driverOnline,
        setDriverOnline,
        toasts,
        addToast,
        onboardingOpen,
        setOnboardingOpen
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
