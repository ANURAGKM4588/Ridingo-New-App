import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { App as CapApp } from '@capacitor/app';
import { StatusBar } from '@capacitor/status-bar';
import { getDeviceLocation } from '../lib/deviceLocation';
import { processRazorpayCashbackTransfer } from '../utils/razorpay';
import { realtime } from '../utils/realtime';

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
  rating: 5.0,
  tripsCount: 0,
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
  blackMarks: 0,
  popups: true,
  sound: true,
  autoQueue: false,
  biometric: true,
  haptic: true
};

export const INITIAL_TRIPS = [];

export const INITIAL_UTX = [];

export const INITIAL_UNOTES = [
  {
    id: 'notif-welcome',
    ts: Date.now(),
    title: 'Welcome to Ridingo',
    body: 'Your account is ready. Book your first verified chauffeur on demand.',
    icon: 'check',
    read: false
  }
];

export function AppProvider({ children }) {
  // User state: null on fresh install or logged out
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('ridingo_user_session');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Driver Partner state: null on fresh install or logged out
  const [driverPartner, setDriverPartner] = useState(() => {
    try {
      const saved = localStorage.getItem('ridingo_driver_session');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // App navigation state (User App or Driver App)
  const [view, setView] = useState(() => {
    if (typeof window !== 'undefined') {
      const search = window.location.search.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      if (
        window.RIDINGO_TARGET === 'driver' ||
        search.includes('app=driver') ||
        path.includes('/driver') ||
        (typeof document !== 'undefined' && document.body?.classList?.contains('standalone-driver'))
      ) {
        return 'driver';
      }
      if (
        window.RIDINGO_TARGET === 'user' ||
        search.includes('app=user') ||
        path.includes('/user') ||
        (typeof document !== 'undefined' && document.body?.classList?.contains('standalone-user'))
      ) {
        return 'user';
      }
    }
    return 'user';
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.add('standalone-app');
      document.body.classList.add('standalone-app');
      if (view === 'driver') {
        document.documentElement.classList.add('standalone-driver');
        document.documentElement.classList.remove('standalone-user');
        document.body.classList.add('standalone-driver');
        document.body.classList.remove('standalone-user');
      } else {
        document.documentElement.classList.add('standalone-user');
        document.documentElement.classList.remove('standalone-driver');
        document.body.classList.add('standalone-user');
        document.body.classList.remove('standalone-driver');
      }
    }
  }, [view]);
  const [uTab, setUTab] = useState('home'); // 'home' | 'history' | 'wallet' | 'profile'
  const [dTab, setDTab] = useState('dash');
  const [tripsFilter, setTripsFilter] = useState('all');
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingCategory, setBookingCategory] = useState('hourly');
  const [bookingDestination, setBookingDestination] = useState('');
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [liveTrackingOpen, setLiveTrackingOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(() => {
    try {
      const saved = localStorage.getItem('ridingo_user_session');
      return !saved;
    } catch (e) {
      return true;
    }
  });
  const [driverOnboardingOpen, setDriverOnboardingOpen] = useState(() => {
    try {
      const saved = localStorage.getItem('ridingo_driver_session');
      return !saved;
    } catch (e) {
      return true;
    }
  });
  const [legalModal, setLegalModal] = useState({ open: false, tab: 'terms' });

  const openLegal = (tab = 'terms') => setLegalModal({ open: true, tab });
  const closeLegal = () => setLegalModal(prev => ({ ...prev, open: false }));

  // Trips, Wallet & Notifications
  const [trips, setTrips] = useState(INITIAL_TRIPS);
  const [utx, setUtx] = useState(INITIAL_UTX);
  const [unotes, setUnotes] = useState(INITIAL_UNOTES);
  const [driverOnline, setDriverOnline] = useState(true);
  const [incomingTripRequest, setIncomingTripRequest] = useState(null);
  const [driverBalance, setDriverBalance] = useState(0);
  const [driverTx, setDriverTx] = useState([]);
  const [toasts, setToasts] = useState([]);

  // Subscribe to real-time communication between User and Driver apps
  useEffect(() => {
    const unbindReq = realtime.on('TRIP_REQUESTED', (newTrip) => {
      setTrips(prev => {
        const exists = prev.some(t => t.id === newTrip.id);
        return exists ? prev : [newTrip, ...prev.filter(t => t.status !== 'requested')];
      });
      setIncomingTripRequest(newTrip);
    });

    const unbindAcc = realtime.on('TRIP_ACCEPTED', ({ tripId, driver }) => {
      const driverName = driver?.name || 'Ravi Kumar';
      let targetOtp = '4821';
      setTrips(prev =>
        prev.map(t => {
          if (t.id === tripId) {
            targetOtp = t.startOtp || targetOtp;
            return { ...t, status: 'accepted', driver: driverName };
          }
          return t;
        })
      );
      setIncomingTripRequest(null);
      addNotification(
        'Chauffeur Assigned!',
        `${driverName} is on the way to your pickup. Share Pickup OTP: ${targetOtp} upon arrival.`,
        'car'
      );
      addToast(`Chauffeur confirmed! ${driverName} accepted your ride.`, 'check');
    });

    const unbindArr = realtime.on('ARRIVED_PICKUP', ({ tripId }) => {
      let targetOtp = '4821';
      setTrips(prev =>
        prev.map(t => {
          if (t.id === tripId) {
            targetOtp = t.startOtp || targetOtp;
            return { ...t, status: 'pickup_arrived' };
          }
          return t;
        })
      );
      addNotification(
        'Chauffeur Arrived at Pickup!',
        `Your chauffeur is at your pickup location. Please share your 4-digit OTP: ${targetOtp}.`,
        'car'
      );
      addToast('Chauffeur has arrived at pickup!', 'info');
    });

    const unbindOtp1 = realtime.on('START_OTP_VERIFIED', ({ tripId }) => {
      setTrips(prev =>
        prev.map(t => (t.id === tripId ? { ...t, status: 'ready_to_start' } : t))
      );
      addToast('Pickup OTP verified! Trip ready to start.', 'check');
    });

    const unbindCond = realtime.on('CONDITION_VERIFIED', ({ tripId, photos, scratches }) => {
      setTrips(prev =>
        prev.map(t => (t.id === tripId ? { ...t, status: 'ready_to_start', conditionPhotos: photos, conditionScratches: scratches } : t))
      );
      addToast('Vehicle 4-angle condition check verified!', 'check');
    });

    const unbindStart = realtime.on('TRIP_STARTED', ({ tripId }) => {
      setTrips(prev =>
        prev.map(t => (t.id === tripId ? { ...t, status: 'inprogress', startedAt: Date.now() } : t))
      );
      addNotification(
        'Trip in Progress!',
        'Your chauffeur has started the trip. Live GPS route tracking is active.',
        'map'
      );
      addToast('Trip started! Live tracking active.', 'check');
    });

    const unbindEndReq = realtime.on('END_OTP_REQUESTED', ({ tripId, endOtp }) => {
      let targetOtp = endOtp || '8392';
      setTrips(prev =>
        prev.map(t => {
          if (t.id === tripId) {
            targetOtp = t.endOtp || targetOtp;
            return { ...t, status: 'ending_otp' };
          }
          return t;
        })
      );
      addNotification(
        'Arrived at Destination!',
        `Trip ending. Please share Drop OTP: ${targetOtp} with your chauffeur to complete.`,
        'flag'
      );
      addToast(`Arrived at destination! Share Drop OTP ${targetOtp} to finalize.`, 'info');
    });

    const unbindDec = realtime.on('TRIP_DECLINED', ({ tripId }) => {
      setIncomingTripRequest(null);
    });

    const unbindComp = realtime.on('TRIP_COMPLETED', ({ tripId }) => {
      setTrips(prev =>
        prev.map(t => (t.id === tripId ? { ...t, status: 'completed' } : t))
      );
      addNotification(
        'Trip Completed!',
        'Thank you for riding with Ridingo. Your digital invoice has been settled.',
        'check'
      );
    });

    return () => {
      unbindReq();
      unbindAcc();
      unbindArr();
      unbindOtp1();
      unbindCond();
      unbindStart();
      unbindEndReq();
      unbindDec();
      unbindComp();
    };
  }, []);

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

      // Meta theme-color strictly matches app background color (var(--surface))
      const appBgColor = isDark ? '#0D0E12' : '#F2F2F7';
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) {
        metaTheme.setAttribute('content', appBgColor);
      }

      // Capacitor StatusBar strictly matches app background
      if (window.Capacitor?.isPluginAvailable('StatusBar')) {
        StatusBar.setStyle({ style: isDark ? 'DARK' : 'LIGHT' }).catch(() => {});
        StatusBar.setBackgroundColor({ color: appBgColor }).catch(() => {});
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

  const scrollUserToTop = () => {
    if (typeof document !== 'undefined') {
      const el = document.getElementById('u-content');
      if (el) el.scrollTop = 0;
      window.requestAnimationFrame(() => {
        const el2 = document.getElementById('u-content');
        if (el2) el2.scrollTop = 0;
      });
    }
  };

  const scrollDriverToTop = () => {
    if (typeof document !== 'undefined') {
      const el = document.getElementById('d-content');
      if (el) el.scrollTop = 0;
      window.requestAnimationFrame(() => {
        const el2 = document.getElementById('d-content');
        if (el2) el2.scrollTop = 0;
      });
    }
  };

  // User session sync
  const loginDemo = () => {
    setUser(DEFAULT_USER);
    try {
      localStorage.setItem('ridingo_user_session', JSON.stringify(DEFAULT_USER));
      localStorage.setItem('ridingo_has_onboarded', 'true');
    } catch (e) {}
    setUTab('home');
    scrollUserToTop();
    setOnboardingOpen(false);
    addToast('Signed in as Arjun Menon', 'check');
  };

  const loginWithDetails = (userData = {}) => {
    const isGoogle = userData.provider === 'google' || !!userData.idToken;
    const computedName = userData.name || (userData.firstName ? `${userData.firstName} ${userData.lastName || ''}`.trim() : DEFAULT_USER.name);
    const updated = {
      ...DEFAULT_USER,
      ...userData,
      name: computedName,
      firstName: userData.firstName || computedName.split(' ')[0],
      lastName: userData.lastName || (computedName.split(' ').slice(1).join(' ') || ''),
      email: userData.email || (isGoogle ? '' : DEFAULT_USER.email),
      avatar: userData.avatar || (isGoogle ? userData.avatar : DEFAULT_USER.avatar),
      phone: userData.phone
        ? (userData.phone.startsWith('+91') ? userData.phone : `+91 ${userData.phone}`)
        : (isGoogle ? '' : DEFAULT_USER.phone),
      emergencyPhone: userData.emergencyPhone || '',
      isAuthenticated: true,
      isDemo: false,
      authProvider: userData.provider || (isGoogle ? 'google' : 'phone')
    };
    setUser(updated);
    try {
      localStorage.setItem('ridingo_user_session', JSON.stringify(updated));
      localStorage.setItem('ridingo_has_onboarded', 'true');
    } catch (e) {}
    setUTab('home');
    scrollUserToTop();
    setOnboardingOpen(false);
    addToast(`Welcome, ${updated.firstName || updated.name || 'User'}!`, 'check');
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

  const loginDriverDemo = () => {
    setDriverPartner(DEFAULT_DRIVER);
    try {
      localStorage.setItem('ridingo_driver_session', JSON.stringify(DEFAULT_DRIVER));
    } catch (e) {}
    setDTab('dash');
    scrollDriverToTop();
    setDriverOnboardingOpen(false);
    addToast('Signed in as Ravi Kumar (Demo)', 'check');
  };

  const loginDriverWithDetails = (driverData = {}) => {
    const updated = {
      ...DEFAULT_DRIVER,
      ...driverData,
      phone: driverData.phone
        ? driverData.phone.startsWith('+91') ? driverData.phone : `+91 ${driverData.phone}`
        : DEFAULT_DRIVER.phone
    };
    setDriverPartner(updated);
    try {
      localStorage.setItem('ridingo_driver_session', JSON.stringify(updated));
    } catch (e) {}
    setDTab('dash');
    scrollDriverToTop();
    setDriverOnboardingOpen(false);
    addToast(`Welcome, ${updated.name || 'Driver Partner'}!`, 'check');
  };

  const logoutDriver = () => {
    setDriverPartner(null);
    try {
      localStorage.removeItem('ridingo_driver_session');
    } catch (e) {}
    setDTab('dash');
    scrollDriverToTop();
    setDriverOnboardingOpen(true);
    addToast('Signed out of Driver Partner account', 'info');
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem('ridingo_user_session');
    } catch (e) {}
    setUTab('home');
    scrollUserToTop();
    setOnboardingOpen(true);
    addToast('Logged out', 'info');
  };

  const resetDemo = () => {
    setUser(null);
    try {
      localStorage.removeItem('ridingo_user_session');
      localStorage.removeItem('ridingo_has_onboarded');
    } catch (e) {}
    setTrips([]);
    setUtx([]);
    setDriverBalance(0);
    setDriverTx([]);
    setBookingOpen(false);
    setOnboardingOpen(true);
    setUTab('home');
    addToast('App reset. Clean install state active.', 'check');
  };

  const bookRide = (cat = 'hourly', qty = 2, pickup = 'Edappally Toll, Kochi', drop = 'City Route', fare = 600, advanceAmount, razorpayPaymentId, schedule) => {
    const tripId = 'TRP-' + Math.floor(1000 + Math.random() * 9000);
    const pId = String(razorpayPaymentId || ('pay_test_' + Date.now().toString(36)));
    const safeFare = Number(fare) || 600;
    const adv = advanceAmount !== undefined ? Number(advanceAmount) : Math.round(safeFare * 0.3);
    const cb = Math.round(safeFare * 0.05);
    const safeCat = String(cat || 'hourly');
    const safePickup = (typeof pickup === 'string' && pickup.trim()) || 'Edappally Toll, Kochi';
    const safeDrop = (typeof drop === 'string' && drop.trim()) || (safeCat === 'airport' ? 'Cochin International Airport (COK)' : 'City Route');
    const scheduledDate = schedule?.date || null;
    const scheduledTime = schedule?.time || null;

    const startOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const endOtp = Math.floor(1000 + Math.random() * 9000).toString();

    const newTrip = {
      id: tripId,
      cat: safeCat,
      qty: Number(qty) || 2,
      pickup: safePickup,
      drop_loc: safeDrop,
      when_ts: Date.now(),
      scheduledDate,
      scheduledTime,
      scheduleDisplay: scheduledDate ? `${scheduledDate} · ${scheduledTime}` : 'Immediate Pickup',
      fare: safeFare,
      advance: adv,
      status: 'requested',
      startOtp,
      endOtp,
      conditionPhotos: { front: null, left: null, back: null, top: null },
      conditionScratches: [],
      conditionNotes: '',
      conditionVerified: false,
      paymentGateway: 'Razorpay',
      paymentId: pId,
      driver: null,
      car: user?.car || { model: 'Hyundai Creta', plate: 'KL 07 AB 4821', trans: 'Automatic' },
      rider: { name: user?.name || 'Car Owner', phone: user?.phone || '+91 98401 23456' },
      cashback: cb,
      cashbackStatus: 'pending'
    };

    // Record 30% advance payment in user transactions
    const newTx = {
      ts: Date.now(),
      type: 'trip',
      amount: -adv,
      title: `Ride Advance · ${safeCat.toUpperCase()}`,
      sub: `Razorpay (${pId.slice(0, 14)}) · Just now`,
      gateway: 'Razorpay',
      paymentId: pId
    };

    setUtx(prev => [newTx, ...(Array.isArray(prev) ? prev : [])]);
    // Purge any old 'requested' trips so only the active new booking is routed
    setTrips(prev => [newTrip, ...(Array.isArray(prev) ? prev.filter(t => t.status !== 'requested') : [])]);
    setIncomingTripRequest(newTrip);
    realtime.requestRide(newTrip);
    setBookingOpen(false);
    setUTab('home');
    setLiveTrackingOpen(true);
    addToast(`Booked ${safeCat.toUpperCase()} chauffeur! ₹${adv} advance paid via Razorpay.`, 'check');
  };

  const acceptTrip = (tripId) => {
    const driver = driverPartner || DEFAULT_DRIVER;
    let targetOtp = '4821';
    setTrips(prev =>
      prev.map(t => {
        if (t.id === tripId) {
          targetOtp = t.startOtp || targetOtp;
          return { ...t, status: 'accepted', driver: driver.name };
        }
        return t;
      })
    );
    setIncomingTripRequest(null);

    // Notify User App in real time
    addNotification(
      'Chauffeur Assigned!',
      `${driver.name} (★ ${driver.rating || '4.8'}) is heading to your pickup. Share Pickup OTP: ${targetOtp} upon arrival.`,
      'car'
    );
    addToast(`Trip confirmed! ${driver.name} accepted your ride.`, 'check');

    // Broadcast across realtime bus
    realtime.acceptRide(tripId, driver);
  };

  const arrivedAtPickup = (tripId) => {
    let targetOtp = '4821';
    setTrips(prev =>
      prev.map(t => {
        if (t.id === tripId) {
          targetOtp = t.startOtp || targetOtp;
          return { ...t, status: 'pickup_arrived' };
        }
        return t;
      })
    );
    realtime.arrivedAtPickup(tripId);
    addToast('Arrived at pickup location! Enter customer OTP to start ride.', 'info');
  };

  const verifyStartOtp = (tripId) => {
    setTrips(prev =>
      prev.map(t => (t.id === tripId ? { ...t, status: 'ready_to_start' } : t))
    );
    realtime.verifyStartOtp(tripId);
    addToast('Pickup OTP verified! Ready to start trip.', 'check');
  };

  const submitConditionCheck = (tripId, { photos, scratches, notes }) => {
    setTrips(prev =>
      prev.map(t => (t.id === tripId ? {
        ...t,
        status: 'ready_to_start',
        conditionPhotos: photos,
        conditionScratches: scratches || [],
        conditionNotes: notes || '',
        conditionVerified: true
      } : t))
    );
    realtime.verifyConditionCheck(tripId, photos, scratches);
    addToast('Car condition verified! You can now start the trip.', 'check');
  };

  const startTrip = (tripId) => {
    setTrips(prev =>
      prev.map(t => (t.id === tripId ? { ...t, status: 'inprogress', startedAt: Date.now() } : t))
    );
    realtime.startRide(tripId);
    addToast('Trip started! Live GPS sharing activated.', 'check');
  };

  const requestEndTrip = (tripId, overrideEndOtp) => {
    let targetOtp = overrideEndOtp || Math.floor(1000 + Math.random() * 9000).toString();
    setTrips(prev =>
      prev.map(t => {
        if (t.id === tripId) {
          targetOtp = overrideEndOtp || t.endOtp || targetOtp;
          return { ...t, status: 'ending_otp', endOtp: targetOtp, endOtpRegenerated: true };
        }
        return t;
      })
    );
    realtime.requestEndTrip(tripId, targetOtp);
    addToast(`Destination reached! Trip End OTP: ${targetOtp}`, 'info');
  };

  const verifyEndOtp = (tripId) => {
    setTrips(prev =>
      prev.map(t => (t.id === tripId ? { ...t, status: 'invoice_pending' } : t))
    );
    addToast('Drop OTP verified! Displaying Razorpay Invoice.', 'check');
  };

  const settleTripPayment = (tripId, { amount, fare, tip = 0, method = 'Razorpay UPI', isCash = false } = {}) => {
    const tripFare = fare || 750;
    const companyCommission = Math.round(tripFare * 0.15); // 15% platform fee
    const driverEarnings = Math.round(tripFare * 0.85) + Number(tip || 0); // 85% + 100% tip

    if (isCash) {
      // PENALTY: Increment Black Mark for accepting cash
      setDriverPartner(prev => ({
        ...prev,
        blackMarks: (prev?.blackMarks || 0) + 1
      }));
      addToast('⚠️ Violation: 1 Black Mark issued for cash transaction!', 'warn');
    } else {
      addToast(`₹${driverEarnings} credited to Chauffeur Wallet via Razorpay Escrow!`, 'check');
    }

    // Update driver partner wallet
    setDriverBalance(prev => prev + driverEarnings);
    setDriverTx(prev => [
      {
        id: 'tx-' + Date.now(),
        title: `Trip Earnings · ${method}`,
        sub: `Net 85% (₹${Math.round(tripFare * 0.85)}) + Tip (₹${tip})`,
        amount: driverEarnings,
        type: 'fare',
        gateway: 'Razorpay Escrow',
        ts: Date.now()
      },
      ...prev
    ]);

    // Mark trip complete
    setTrips(prev =>
      prev.map(t => (t.id === tripId ? {
        ...t,
        status: 'completed',
        completedAt: Date.now(),
        finalSettlement: {
          total: amount || tripFare,
          driverEarnings,
          commission: companyCommission,
          tip,
          method,
          isCash
        }
      } : t))
    );

    realtime.completeRide(tripId, { amount, fare, tip, isCash });
  };

  const declineTrip = (tripId) => {
    setIncomingTripRequest(null);
    setTrips(prev => prev.filter(t => t.id !== tripId));
    realtime.declineRide(tripId);
    addToast('Trip request dismissed', 'info');
  };

  const completeTrip = (tripId) => {
    settleTripPayment(tripId);
  };

  const userBalance = Math.max(0, Array.isArray(utx)
    ? utx.reduce((a, t) => a + (Number(t?.amount) || 0), 0)
    : 0);

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
        loginDriverDemo,
        loginDriverWithDetails,
        logoutDriver,
        scrollUserToTop,
        scrollDriverToTop,
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
        acceptTrip,
        declineTrip,
        arrivedAtPickup,
        verifyStartOtp,
        submitConditionCheck,
        startTrip,
        requestEndTrip,
        verifyEndOtp,
        settleTripPayment,
        incomingTripRequest,
        setIncomingTripRequest,
        completeTrip,
        driverOnline,
        setDriverOnline,
        driverBalance,
        setDriverBalance,
        driverTx,
        setDriverTx,
        toasts,
        addToast,
        liveTrackingOpen,
        setLiveTrackingOpen,
        onboardingOpen,
        setOnboardingOpen,
        driverOnboardingOpen,
        setDriverOnboardingOpen,
        legalModal,
        setLegalModal,
        openLegal,
        closeLegal
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
