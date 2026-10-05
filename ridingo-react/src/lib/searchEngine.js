import { INDIAN_LANDMARKS } from './locationService';

export const APP_SETTINGS = [
  {
    id: 'set-car',
    title: 'Vehicle & Car Details',
    sub: 'Hyundai Creta (Automatic) · KL 07 AB 4821',
    icon: 'car',
    category: 'Settings',
    tab: 'profile',
    badge: 'Setting',
    keywords: ['car', 'vehicle', 'creta', 'hyundai', 'plate', 'kl 07', 'automatic', 'transmission', 'gearbox', 'auto', 'manual', 'model']
  },
  {
    id: 'set-wallet',
    title: 'Wallet & Payment Settings',
    sub: 'Balance: ₹1,336 · Add money via UPI & Google Pay',
    icon: 'wallet',
    category: 'Settings',
    tab: 'wallet',
    badge: 'Wallet',
    keywords: ['wallet', 'money', 'balance', 'topup', 'add money', 'pay', 'upi', 'cashback', 'payment', 'card', 'bank', 'funds', 'rupee', 'inr']
  },
  {
    id: 'set-pin',
    title: 'Ride Start PIN & Security',
    sub: 'PIN: 4821 · Driver verifies before departure',
    icon: 'pin',
    category: 'Security',
    tab: 'profile',
    badge: 'Setting',
    keywords: ['pin', 'security', 'code', 'start pin', 'passcode', 'password', 'verify', 'safety', 'auth']
  },
  {
    id: 'set-ac',
    title: 'Cabin AC & Temperature Preferences',
    sub: '22°C (Chill) · Pre-cool cabin before arrival',
    icon: 'sun',
    category: 'Preferences',
    tab: 'profile',
    badge: 'Setting',
    keywords: ['ac', 'air condition', 'temp', 'temperature', 'chill', 'cool', 'precool', 'climate', 'fan', 'heat', 'cabin']
  },
  {
    id: 'set-quiet',
    title: 'Quiet Ride Mode',
    sub: 'Driver maintains cabin silence for calls and focus',
    icon: 'moon',
    category: 'Preferences',
    tab: 'profile',
    badge: 'Setting',
    keywords: ['quiet', 'silent', 'silence', 'focus', 'calls', 'peace', 'noise', 'cabin']
  },
  {
    id: 'set-sos',
    title: 'Emergency SOS Contacts',
    sub: 'Priya Menon (Spouse) configured for 24/7 alerts',
    icon: 'shield',
    category: 'Safety',
    tab: 'profile',
    badge: 'Safety',
    keywords: ['sos', 'emergency', 'contacts', 'safety', 'spouse', 'family', 'police', 'alert', 'help']
  },
  {
    id: 'set-live-share',
    title: 'Share Live Trip Status',
    sub: 'Auto-share live GPS tracking link with family',
    icon: 'route',
    category: 'Safety',
    tab: 'profile',
    badge: 'Safety',
    keywords: ['share', 'live', 'gps', 'tracking', 'track', 'link', 'follow', 'status']
  },
  {
    id: 'set-insurance',
    title: 'Trip Insurance Policy',
    sub: 'Standard (₹5L) vehicle & personal protection',
    icon: 'shield',
    category: 'Safety',
    tab: 'profile',
    badge: 'Insurance',
    keywords: ['insurance', 'policy', 'protection', 'cover', 'medical', 'vehicle insurance', 'claim']
  },
  {
    id: 'set-lang',
    title: 'Driver Language Preferences',
    sub: 'English, Hindi, Malayalam preferred drivers',
    icon: 'chat',
    category: 'Preferences',
    tab: 'profile',
    badge: 'Setting',
    keywords: ['language', 'lang', 'english', 'hindi', 'malayalam', 'speak', 'talk', 'communication']
  },
  {
    id: 'set-theme',
    title: 'Appearance & Theme',
    sub: 'Dark, Light, or System display mode',
    icon: 'moon',
    category: 'Display',
    tab: 'profile',
    badge: 'Theme',
    keywords: ['theme', 'dark', 'light', 'mode', 'display', 'appearance', 'screen', 'night', 'color']
  },
  {
    id: 'set-notifs',
    title: 'Notifications & Alerts',
    sub: 'View recent trip updates, cashback & alerts',
    icon: 'bell',
    category: 'Alerts',
    action: 'open_notifs',
    badge: 'Notifs',
    keywords: ['notification', 'notifications', 'alerts', 'bell', 'messages', 'updates', 'unread', 'notif']
  },
  {
    id: 'set-profile',
    title: 'Account & Profile Information',
    sub: 'Arjun Menon · arjun.menon@example.com · +91 98401 23456',
    icon: 'user',
    category: 'Account',
    tab: 'profile',
    badge: 'Account',
    keywords: ['profile', 'account', 'name', 'phone', 'email', 'mobile', 'user', 'member', 'owner', 'login']
  }
];

export const APP_SERVICES = [
  {
    id: 'srv-hourly',
    title: 'Hourly Driver',
    sub: 'Flexible 2 to 12 hours for city errands, meetings & shopping · ₹250/hr',
    icon: 'clock',
    cat: 'hourly',
    keywords: ['hourly', 'hour', 'hours', 'city', 'shopping', 'errands', 'meetings', 'part time', 'local']
  },
  {
    id: 'srv-daily',
    title: 'Full Day Chauffeur',
    sub: 'Dedicated 10 hours day driver for family visits & office · ₹1,800/day',
    icon: 'sun',
    cat: 'daily',
    keywords: ['full day', 'daily', 'day', 'day hire', 'whole day', 'office', 'family']
  },
  {
    id: 'srv-airport',
    title: 'Airport Transfer Driver',
    sub: 'Prompt terminal drop-off or pickup (COK / BLR / DEL) · ₹900 flat',
    icon: 'plane',
    cat: 'airport',
    keywords: ['airport', 'flight', 'terminal', 'cok', 'blr', 'del', 'drop', 'plane', 'fly']
  },
  {
    id: 'srv-outstation',
    title: 'Outstation Highway Driver',
    sub: 'Multi-day long distance & hill station driver · ₹2,200/day',
    icon: 'route',
    cat: 'outstation',
    keywords: ['outstation', 'highway', 'hills', 'long distance', 'vacation', 'holiday', 'trip', 'intercity']
  },
  {
    id: 'srv-event',
    title: 'Night & Event Driver',
    sub: 'Safe night drive home from dinners, parties & late weddings · ₹350/hr',
    icon: 'moon',
    cat: 'event',
    keywords: ['night', 'event', 'party', 'dinner', 'wedding', 'late', 'evening', 'night out']
  }
];

export function getRecommendations(query, { trips = [] }) {
  const clean = (query || '').trim().toLowerCase();
  if (!clean) {
    return {
      trips: [],
      settings: [],
      services: [],
      landmarks: []
    };
  }

  const words = clean.split(/\s+/);

  // 1. Search Recent Trips History
  const matchedTrips = (trips || []).filter(t => {
    const text = `${t.id} ${t.drop_loc} ${t.pickup} ${t.driver || ''} ${t.cat} ${t.status}`.toLowerCase();
    return words.some(w => text.includes(w));
  }).slice(0, 3);

  // 2. Search Settings & Preferences
  const matchedSettings = APP_SETTINGS.filter(s => {
    const text = `${s.title} ${s.sub} ${s.category} ${s.keywords.join(' ')}`.toLowerCase();
    return words.some(w => text.includes(w) || s.keywords.some(k => k.startsWith(w) || k.includes(w)));
  }).slice(0, 3);

  // 3. Search Services
  const matchedServices = APP_SERVICES.filter(s => {
    const text = `${s.title} ${s.sub} ${s.keywords.join(' ')}`.toLowerCase();
    return words.some(w => text.includes(w) || s.keywords.some(k => k.startsWith(w) || k.includes(w)));
  }).slice(0, 2);

  // 4. Search Locations & Landmarks
  const matchedLandmarks = (INDIAN_LANDMARKS || []).filter(p => {
    const text = `${p.title} ${p.sub}`.toLowerCase();
    return words.some(w => text.includes(w));
  }).slice(0, 3);

  return {
    trips: matchedTrips,
    settings: matchedSettings,
    services: matchedServices,
    landmarks: matchedLandmarks
  };
}
