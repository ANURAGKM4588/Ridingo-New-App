/**
 * bannerService.js
 *
 * Centralized Offer Banner Management Service for Ridingo Ecosystem.
 * Connects the CRM Admin Panel (ridingo.in/admin) with the User App home tab.
 * Supports image slide uploads, discount badges, promo codes, and
 * direct service navigation (Hourly, Full Day, Airport, Outstation, Events).
 */

import { supabase } from '../lib/supabase';

export const LOCAL_BANNERS_KEY = 'ridingo_offer_banners_v1';
export const BANNERS_EVENT_KEY = 'ridingo_banners_updated';

export const SERVICE_OPTIONS = [
  {
    id: 'airport',
    name: 'Airport Pickup & Drop',
    category: 'airport',
    icon: 'plane',
    tag: 'RIDINGO · AIRPORT',
    color: '#10B981',
    description: 'Terminal pickup or drop with live flight delay tracking'
  },
  {
    id: 'hourly',
    name: 'Hourly City Driver',
    category: 'hourly',
    icon: 'hourly',
    tag: 'RIDINGO · DRIVER',
    color: '#F59E0B',
    description: 'City errands, meetings & shopping in your own vehicle'
  },
  {
    id: 'daily',
    name: 'Full Day Hire',
    category: 'daily',
    icon: 'sun',
    tag: 'RIDINGO · FULL DAY',
    color: '#3B82F6',
    description: '10 hours / day for all-day city hospital, client or personal trips'
  },
  {
    id: 'outstation',
    name: 'Outstation Highway Trip',
    category: 'outstation',
    icon: 'route',
    tag: 'RIDINGO · HIGHWAY',
    color: '#8B5CF6',
    description: 'Multi-day hill stations, family tours & interstate road journeys'
  },
  {
    id: 'event',
    name: 'Night & Events Driver',
    category: 'event',
    icon: 'moon',
    tag: 'RIDINGO · NIGHT',
    color: '#EC4899',
    description: 'Late night parties, wedding events & safe return cabin service'
  }
];

export const DEFAULT_SEED_BANNERS = [
  {
    id: 'banner-airport-1',
    title: 'Airport Rides Offer',
    headline: '5% Off Airport Rides',
    sub: 'Flight delay tracking with zero surge guarantee',
    category: 'airport',
    serviceName: 'Airport Pickup & Drop',
    brandTag: 'RIDINGO · AIRPORT',
    tag: '5% CASHBACK',
    tagBg: '#10B981',
    tagColor: '#FFFFFF',
    promoCode: 'AIRPORT5',
    cta: 'Book Now',
    ctaBgColor: '#FFFFFF',
    ctaTextColor: '#000000',
    showCta: true,
    trustText: 'Verified Flight Drivers',
    icon: 'plane',
    imageMobile: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1000&auto=format&fit=crop&q=80',
    imageTablet: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1500&auto=format&fit=crop&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1000&auto=format&fit=crop&q=80',
    bgGradient: 'linear-gradient(135deg, #061A15 0%, #0D2C24 45%, #0B1929 100%)',
    accentBorder: 'rgba(16, 185, 129, 0.4)',
    ambientGlow: 'rgba(16, 185, 129, 0.25)',
    active: true,
    order: 1,
    createdAt: '2026-10-15T00:00:00Z'
  },
  {
    id: 'banner-hourly-2',
    title: 'City Driver Offer',
    headline: '35% Off City Driver',
    sub: 'Errands, meetings & shopping in your own car',
    category: 'hourly',
    serviceName: 'Hourly City Driver',
    brandTag: 'RIDINGO · DRIVER',
    tag: '35% OFF',
    tagBg: '#F59E0B',
    tagColor: '#000000',
    promoCode: 'FIRST35',
    cta: 'Book Now',
    ctaBgColor: '#FFC70A',
    ctaTextColor: '#000000',
    showCta: true,
    trustText: '100% Background-Checked',
    icon: 'hourly',
    imageMobile: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1000&auto=format&fit=crop&q=80',
    imageTablet: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1500&auto=format&fit=crop&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1000&auto=format&fit=crop&q=80',
    bgGradient: 'linear-gradient(135deg, #1A1102 0%, #2A1A05 45%, #18181B 100%)',
    accentBorder: 'rgba(245, 158, 11, 0.4)',
    ambientGlow: 'rgba(245, 158, 11, 0.25)',
    active: true,
    order: 2,
    createdAt: '2026-10-15T00:00:00Z'
  },
  {
    id: 'banner-outstation-3',
    title: 'Highway Trips Offer',
    headline: 'Flat ₹250 Off Highway Trips',
    sub: 'Scenic hill stations & outstation road drives',
    category: 'outstation',
    serviceName: 'Outstation Highway Trip',
    brandTag: 'RIDINGO · HIGHWAY',
    tag: 'FLAT ₹250 OFF',
    tagBg: '#3B82F6',
    tagColor: '#FFFFFF',
    promoCode: 'HIGHWAY250',
    cta: 'Book Now',
    ctaBgColor: '#FFFFFF',
    ctaTextColor: '#000000',
    showCta: true,
    trustText: 'Experienced Highway Drivers',
    icon: 'route',
    imageMobile: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1000&auto=format&fit=crop&q=80',
    imageTablet: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1500&auto=format&fit=crop&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1000&auto=format&fit=crop&q=80',
    bgGradient: 'linear-gradient(135deg, #091326 0%, #102246 45%, #131722 100%)',
    accentBorder: 'rgba(59, 130, 246, 0.4)',
    ambientGlow: 'rgba(59, 130, 246, 0.25)',
    active: true,
    order: 3,
    createdAt: '2026-10-15T00:00:00Z'
  }
];

/**
 * Fetch all banners from localStorage or defaults
 */
export function getAllBanners() {
  if (typeof window === 'undefined') return DEFAULT_SEED_BANNERS;
  try {
    const raw = localStorage.getItem(LOCAL_BANNERS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_BANNERS_KEY, JSON.stringify(DEFAULT_SEED_BANNERS));
      return DEFAULT_SEED_BANNERS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    return DEFAULT_SEED_BANNERS;
  } catch (e) {
    console.error('[BannerService] Failed to read banners:', e);
    return DEFAULT_SEED_BANNERS;
  }
}

/**
 * Get active running banners displayed on the User App
 */
export function getActiveOfferBanners() {
  const all = getAllBanners();
  const active = all.filter(b => b.active !== false);
  return active.length > 0 ? active : DEFAULT_SEED_BANNERS;
}

/**
 * Save / Update a banner
 */
export async function saveOfferBanner(bannerData) {
  const all = getAllBanners();
  const isNew = !bannerData.id;
  const id = bannerData.id || `banner_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  // Find service config
  const srv = SERVICE_OPTIONS.find(s => s.id === bannerData.category) || SERVICE_OPTIONS[0];

  const imageMobile = bannerData.imageMobile || bannerData.imageUrl || '';
  const imageTablet = bannerData.imageTablet || imageMobile;

  const banner = {
    ...bannerData,
    id,
    imageMobile,
    imageTablet,
    imageUrl: imageMobile || imageTablet,
    category: bannerData.category || srv.category,
    serviceName: srv.name,
    title: bannerData.title || `${srv.name} Banner`,
    headline: bannerData.headline || srv.name,
    cta: bannerData.cta || 'Book Now',
    ctaBgColor: bannerData.ctaBgColor || '#FFFFFF',
    ctaTextColor: bannerData.ctaTextColor || '#000000',
    showCta: bannerData.showCta !== false,
    active: bannerData.active !== false,
    order: typeof bannerData.order === 'number' ? bannerData.order : all.length + 1,
    tagBg: srv.color,
    tagColor: '#FFFFFF',
    icon: srv.icon,
    updatedAt: new Date().toISOString()
  };

  let updatedList;
  if (isNew) {
    updatedList = [...all, { ...banner, createdAt: new Date().toISOString() }];
  } else {
    updatedList = all.map(b => (b.id === id ? { ...b, ...banner } : b));
  }

  // Sort by order
  updatedList.sort((a, b) => (a.order || 0) - (b.order || 0));

  // Save local
  try {
    localStorage.setItem(LOCAL_BANNERS_KEY, JSON.stringify(updatedList));
  } catch (e) {
    console.error('[BannerService] LocalStorage save error:', e);
  }

  // Broadcast event for live updates
  broadcastBannersUpdated(updatedList);

  // Attempt sync to Supabase if table is configured
  try {
    if (supabase) {
      await supabase.from('offer_banners').upsert(banner, { onConflict: 'id' }).catch(() => {});
    }
  } catch (err) {
    // Non-blocking fallback
  }

  return { success: true, banner, list: updatedList };
}

/**
 * Delete a banner
 */
export async function deleteOfferBanner(id) {
  const all = getAllBanners();
  const updatedList = all.filter(b => b.id !== id);

  try {
    localStorage.setItem(LOCAL_BANNERS_KEY, JSON.stringify(updatedList));
  } catch (e) {
    console.error('[BannerService] LocalStorage delete error:', e);
  }

  broadcastBannersUpdated(updatedList);

  try {
    if (supabase) {
      await supabase.from('offer_banners').delete().eq('id', id).catch(() => {});
    }
  } catch (err) {}

  return updatedList;
}

/**
 * Toggle banner active state
 */
export async function toggleBannerActive(id) {
  const all = getAllBanners();
  const updatedList = all.map(b => (b.id === id ? { ...b, active: !b.active } : b));

  try {
    localStorage.setItem(LOCAL_BANNERS_KEY, JSON.stringify(updatedList));
  } catch (e) {
    console.error('[BannerService] LocalStorage toggle error:', e);
  }

  broadcastBannersUpdated(updatedList);
  return updatedList;
}

/**
 * Broadcast banner update to all tabs/windows
 */
function broadcastBannersUpdated(banners) {
  if (typeof window === 'undefined') return;

  // Window custom event
  window.dispatchEvent(new CustomEvent(BANNERS_EVENT_KEY, { detail: banners }));

  // BroadcastChannel for cross-tab instant sync
  try {
    if ('BroadcastChannel' in window) {
      const bc = new BroadcastChannel('ridingo_banner_sync');
      bc.postMessage({ type: 'BANNERS_UPDATED', banners });
      bc.close();
    }
  } catch (e) {}
}

/**
 * Hook or subscriber for reactive banner updates
 */
export function subscribeToOfferBanners(callback) {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = (e) => {
    if (e.detail) callback(e.detail);
  };

  const handleStorage = (e) => {
    if (e.key === LOCAL_BANNERS_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        callback(parsed);
      } catch (err) {}
    }
  };

  let bc = null;
  try {
    if ('BroadcastChannel' in window) {
      bc = new BroadcastChannel('ridingo_banner_sync');
      bc.onmessage = (event) => {
        if (event?.data?.type === 'BANNERS_UPDATED' && event.data.banners) {
          callback(event.data.banners);
        }
      };
    }
  } catch (e) {}

  window.addEventListener(BANNERS_EVENT_KEY, handleCustomEvent);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(BANNERS_EVENT_KEY, handleCustomEvent);
    window.removeEventListener('storage', handleStorage);
    if (bc) bc.close();
  };
}
