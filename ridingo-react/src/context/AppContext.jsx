import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { App as CapApp } from '@capacitor/app';
import { StatusBar } from '@capacitor/status-bar';
import { getDeviceLocation } from '../lib/deviceLocation';

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

export const DEFAULT_DRIVER = {
  name: 'Ravi Kumar',
  phone: '+91 94471 23456',
  email: 'ravi.kumar@ridingo.partner',
  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
  rating: 4.8,
  tripsCount: 142,
  bankName: 'HDFC Bank',
  bankAccount: '•••• 4521',
  upiId: 'ravi.kumar@okhdfcbank',
  dlNumber: 'KL-07-20160049281',
  badgeNumber: 'KL-07-2024-CH08',
  experienceYears: 8,
  services: {
    hourly: true,
    daily: true,
    airport: true,
    outstation: true,
    event: true
  },
  popups: true,
  sound: true,
  autoQueue: false,
  biometric: true,
  haptic: true
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

export const INITIAL_UNOTES = [
  {
    id: 'notif-1',
    ts: Date.now() - 1000 * 60 * 18,
    title: 'Trip in progress',
    body: 'Ravi Kumar is driving your Hyundai Creta to Lulu Mall, Edappally.',
    icon: 'car',
    read: false
  },
  {
    id: 'notif-2',
    ts: Date.now() - 1000 * 60 * 60 * 3,
    title: 'Cashback credited! ₹35',
    body: 'Your 5% ride cashback has been deposited into your Ridingo wallet.',
    icon: 'gift',
    read: false
  },
  {
    id: 'notif-3',
    ts: Date.now() - 1000 * 60 * 60 * 24,
    title: 'Welcome to Ridingo',
    body: 'Book a professional driver for your car by the hour, day or airport run.',
    icon: 'check',
    read: true
  }
];

export function AppProvider({ children }) {
  // User state
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('ridingo_user_session');
      return saved ? JSON.parse(saved) : DEFAULT_USER;
    } catch (e) {
      return DEFAULT_USER;
    }
  });

  // Driver Partner state
  const [driverPartner, setDriverPartner] = useState(() => {
    try {
      const saved = localStorage.getItem('ridingo_driver_session');
      return saved ? JSON.parse(saved) : DEFAULT_DRIVER;
    } catch (e) {
      return DEFAULT_DRIVER;
    }
  });

  // App navigation state (User App or Driver App)
  const [view, setView] = useState(() => {
    if (typeof window !== 'undefined') {
      if (
        window.RIDINGO_TARGET === 'driver' ||
        window.location.search.includes('app=driver') ||
        (typeof document !== 'undefined' && document.body?.classList?.contains('standalone-driver'))
      ) {
        return 'driver';
      }
    }
    return 'user';
  });
  const [uTab, setUTab] = useState('home'); // 'home' | 'history' | 'wallet' | 'profile'
  const [dTab, setDTab] = useState('dash');
  const [tripsFilter, setTripsFilter] = useState('all');
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingCategory, setBookingCategory] = useState('hourly');
  const [bookingDestination, setBookingDestination] = useState('');
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [liveTrackingOpen, setLiveTrackingOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  // Trips, Wallet & Notifications
  const [trips, setTrips] = useState(INITIAL_TRIPS);
  const [utx, setUtx] = useState(INITIAL_UTX);
  const [unotes, setUnotes] = useState(INITIAL_UNOTES);
  const [driverOnline, setDriverOnline] = useState(true);
  const [toasts, setToasts] = useState([]);

  const markAllNotifsRead = () => {
    setUnotes(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markNotifRead = (id) => {
    setUnotes(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
  };

  const deleteNotif = (id) => {
    setUnotes(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifs = () => {
    setUnotes([]);
  };

  const addNotification = (title, body, icon = 'bell') => {
    const newNote = {
      id: 'notif-' + Date.now(),
      ts: Date.now(),
      title,
      body,
      icon,
      read: false
    };
    setUnotes(prev => [newNote, ...prev]);
  };

  // Toast helper
  const addToast = (msg, icon = 'check') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg, icon }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3200);
  };

  // Separate theme states: User App & Driver App are independent apps
  const [userTheme, setUserTheme] = useState(() => {
    try {
      return localStorage.getItem('ridingo_user_theme') || localStorage.getItem('ridingo_theme_pref') || 'light';
    } catch (e) {
      return 'light';
    }
  });

  const [driverTheme, setDriverTheme] = useState(() => {
    try {
      return localStorage.getItem('ridingo_driver_theme') || 'light';
    } catch (e) {
      return 'light';
    }
  });

  // Track system OS color scheme preference
  const [systemIsDark, setSystemIsDark] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = (e) => setSystemIsDark(e.matches);
    media.addEventListener?.('change', handleMediaChange);
    return () => media.removeEventListener?.('change', handleMediaChange);
  }, []);

  const userThemeVal = userTheme === 'system' ? (systemIsDark ? 'dark' : 'light') : userTheme;
  const driverThemeVal = driverTheme === 'system' ? (systemIsDark ? 'dark' : 'light') : driverTheme;

  // Persist userTheme
  useEffect(() => {
    try {
      localStorage.setItem('ridingo_user_theme', userTheme);
      localStorage.setItem('ridingo_theme_pref', userTheme);
    } catch (e) {}
  }, [userTheme]);

  // Persist driverTheme
  useEffect(() => {
    try {
      localStorage.setItem('ridingo_driver_theme', driverTheme);
    } catch (e) {}
  }, [driverTheme]);

  // Pre-warm real device GPS location in background
  useEffect(() => {
    getDeviceLocation(false).catch(() => {});
  }, []);

  // Backward compatibility alias for single theme
  const theme = view === 'driver' ? driverTheme : userTheme;
  const setTheme = (val) => {
    if (view === 'driver') {
      setDriverTheme(val);
    } else {
      setUserTheme(val);
    }
  };

  // Sync root (document.documentElement / Capacitor) for standalone view or active tab
  useEffect(() => {
    try {
      const isStandaloneDriver = typeof document !== 'undefined' && (
        document.body?.classList?.contains('standalone-driver') ||
        window.location.search.includes('app=driver')
      );
      const activeThemeVal = (isStandaloneDriver || view === 'driver') ? driverThemeVal : userThemeVal;
      const isDark = activeThemeVal === 'dark';

      document.documentElement.setAttribute('data-theme', activeThemeVal);
      document.documentElement.style.colorScheme = activeThemeVal;
      document.body.setAttribute('data-theme', activeThemeVal);

      // Meta theme-color
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) {
        metaTheme.setAttribute('content', isDark ? '#0A0A0B' : '#FFFFFF');
      }

      // Capacitor StatusBar
      if (window.Capacitor?.isPluginAvailable('StatusBar')) {
        StatusBar.setStyle({ style: isDark ? 'DARK' : 'LIGHT' }).catch(() => {});
        StatusBar.setBackgroundColor({ color: isDark ? '#000000' : '#FFFFFF' }).catch(() => {});
        StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
      }
    } catch (e) {}
  }, [userThemeVal, driverThemeVal, view]);

  // Capacitor Android Back Button handler
  useEffect(() => {
    let backListener = null;
    try {
      if (window.Capacitor?.isPluginAvailable('App')) {
        CapApp.addListener('backButton', ({ canGoBack }) => {
          if (bookingOpen) {
            setBookingOpen(false);
          } else if (liveTrackingOpen) {
            setLiveTrackingOpen(false);
          } else if (notifsOpen) {
            setNotifsOpen(false);
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

  const loginWithDetails = (userData = {}) => {
    const updated = {
      ...DEFAULT_USER,
      ...userData,
      phone: userData.phone ? (userData.phone.startsWith('+91') ? userData.phone : `+91 ${userData.phone}`) : DEFAULT_USER.phone
    };
    setUser(updated);
    try {
      localStorage.setItem('ridingo_user_session', JSON.stringify(updated));
    } catch (e) {}
    setOnboardingOpen(false);
    addToast(`Welcome, ${updated.name || 'User'}!`, 'check');
  };

  const updateUserProfile = (updates) => {
    setUser(prev => {
      const next = { ...(prev || DEFAULT_USER), ...updates };
      try {
        localStorage.setItem('ridingo_user_session', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const updateDriverPartner = (updates) => {
    setDriverPartner(prev => {
      const next = { ...(prev || DEFAULT_DRIVER), ...updates };
      try {
        localStorage.setItem('ridingo_driver_session', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
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
        userTheme,
        setUserTheme,
        userThemeVal,
        userIsDark: userThemeVal === 'dark',
        driverTheme,
        setDriverTheme,
        driverThemeVal,
        driverIsDark: driverThemeVal === 'dark',
        user,
        setUser,
        updateUserProfile,
        driverPartner,
        setDriverPartner,
        updateDriverPartner,
        loginDemo,
        loginWithDetails,
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
        notifsOpen,
        setNotifsOpen,
        unotes,
        setUnotes,
        markAllNotifsRead,
        markNotifRead,
        deleteNotif,
        clearAllNotifs,
        addNotification,
        bookRide,
        driverOnline,
        setDriverOnline,
        toasts,
        addToast,
        liveTrackingOpen,
        setLiveTrackingOpen,
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
