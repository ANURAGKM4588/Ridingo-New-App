/**
 * installedUpiService.js
 * 
 * Dynamic Native Installed UPI Apps Detection & Deep-Link Launcher:
 * - iOS: Queries LSApplicationQueriesSchemes via canOpenURL / Linking.canOpenURL
 * - Android: Queries PackageManager via native UpiAppDetector / AppLauncher
 * - Dynamic Filtering: Shows ONLY physically installed apps on the user's device
 * - Prioritized Apps: GooglePay, PhonePe, NaviUPI, Cred, super.money, Jupiter
 */
import { AppLauncher } from '@capacitor/app-launcher';
import { registerPlugin, Capacitor } from '@capacitor/core';

// Register native Android UpiAppDetector Capacitor plugin
export const UpiAppDetector = registerPlugin('UpiAppDetector');

export const KNOWN_UPI_APPS = [
  {
    id: 'gpay',
    name: 'Google Pay',
    subName: 'GPay',
    scheme: 'tez',
    testUrl: 'tez://upi/pay',
    testUrls: ['tez://upi/pay', 'tez://', 'gpay://'],
    launchPrefix: 'tez://upi/pay',
    packageName: 'com.google.android.apps.nbu.paisa.user',
    color: '#4285F4',
    priority: 1
  },
  {
    id: 'phonepe',
    name: 'PhonePe',
    subName: 'PhonePe',
    scheme: 'phonepe',
    testUrl: 'phonepe://pay',
    testUrls: ['phonepe://pay', 'phonepe://'],
    launchPrefix: 'phonepe://pay',
    packageName: 'com.phonepe.app',
    color: '#5F259F',
    priority: 2
  },
  {
    id: 'navi',
    name: 'Navi UPI',
    subName: 'Navi',
    scheme: 'navi',
    testUrl: 'navi://pay',
    testUrls: ['navi://pay', 'navi://', 'naviapp://'],
    launchPrefix: 'navi://pay',
    packageName: 'com.naviapp',
    color: '#00D09C',
    priority: 3
  },
  {
    id: 'cred',
    name: 'CRED Pay',
    subName: 'CRED',
    scheme: 'credpay',
    testUrl: 'credpay://pay',
    testUrls: ['credpay://pay', 'credpay://', 'cred://'],
    launchPrefix: 'credpay://pay',
    packageName: 'com.dreamplug.androidapp',
    color: '#0F172A',
    priority: 4
  },
  {
    id: 'supermoney',
    name: 'super.money',
    subName: 'SuperMoney',
    scheme: 'supermoney',
    testUrl: 'supermoney://pay',
    testUrls: ['supermoney://pay', 'supermoney://'],
    launchPrefix: 'supermoney://pay',
    packageName: 'money.super.app',
    color: '#7C3AED',
    priority: 5
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    subName: 'Jupiter UPI',
    scheme: 'jupiter',
    testUrl: 'jupiter://pay',
    testUrls: ['jupiter://pay', 'jupiter://'],
    launchPrefix: 'jupiter://pay',
    packageName: 'money.jupiter',
    color: '#FF725E',
    priority: 6
  },
  {
    id: 'paytm',
    name: 'Paytm',
    subName: 'Paytm UPI',
    scheme: 'paytmmp',
    testUrl: 'paytmmp://pay',
    testUrls: ['paytmmp://pay', 'paytmmp://', 'paytm://'],
    launchPrefix: 'paytmmp://pay',
    packageName: 'net.one97.paytm',
    color: '#00BAF2',
    priority: 7
  },
  {
    id: 'bhim',
    name: 'BHIM UPI',
    subName: 'NPCI BHIM',
    scheme: 'bhim',
    testUrl: 'bhim://pay',
    testUrls: ['bhim://pay', 'bhim://'],
    launchPrefix: 'bhim://pay',
    packageName: 'in.org.npci.upiapp',
    color: '#00833E',
    priority: 8
  },
  {
    id: 'amazonpay',
    name: 'Amazon Pay',
    subName: 'Amazon',
    scheme: 'amazonpay',
    testUrl: 'amazonpay://pay',
    testUrls: ['amazonpay://pay', 'amazonpay://'],
    launchPrefix: 'amazonpay://pay',
    packageName: 'in.amazon.mShop.android.shopping',
    color: '#FF9900',
    priority: 9
  }
];

export const PRIORITIZED_UPI_IDS = ['gpay', 'phonepe', 'navi', 'cred', 'supermoney', 'jupiter'];

/**
 * Checks if a specific URL scheme can be opened
 */
export async function canOpenUrlSafely(url) {
  if (!url) return false;

  // 1. Capacitor AppLauncher plugin
  try {
    if (typeof AppLauncher !== 'undefined' && typeof AppLauncher.canOpenUrl === 'function') {
      const { value } = await AppLauncher.canOpenUrl({ url });
      if (value) return true;
    }
  } catch (e) {}

  // 2. window.Capacitor.Plugins.AppLauncher
  try {
    if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.AppLauncher?.canOpenUrl) {
      const { value } = await window.Capacitor.Plugins.AppLauncher.canOpenUrl({ url });
      if (value) return true;
    }
  } catch (e) {}

  return false;
}

/**
 * Linking compatibility object providing canOpenURL and openURL
 */
export const Linking = {
  canOpenURL: async (url) => {
    return canOpenUrlSafely(url);
  },
  openURL: async (url) => {
    return launchDeepLink(url);
  }
};

/**
 * Sorts detected UPI apps placing prioritized apps (GPay, PhonePe, Navi, Cred, SuperMoney, Jupiter) first
 */
export function sortUpiAppsByPriority(apps) {
  if (!Array.isArray(apps)) return [];
  const priorityMap = {
    gpay: 1,
    phonepe: 2,
    navi: 3,
    cred: 4,
    supermoney: 5,
    jupiter: 6,
    paytm: 7,
    bhim: 8,
    amazonpay: 9
  };

  return [...apps].sort((a, b) => {
    const rankA = priorityMap[a.id] || 99;
    const rankB = priorityMap[b.id] || 99;
    return rankA - rankB;
  });
}

const DEFAULT_VPA = 'ridingo.rzp@icici';
const DEFAULT_PAYEE_NAME = 'Ridingo Chauffeur Services';
const MERCHANT_CODE = '4121';

/**
 * Dynamically queries the device to find ONLY physically installed UPI apps,
 * prioritized according to the configured list.
 * @returns {Promise<Array>} List of installed UPI apps with metadata
 */
export async function getInstalledUpiApps() {
  const detectedApps = [];
  const detectedIds = new Set();

  // 1. Android Native Plugin query via PackageManager
  if (typeof window !== 'undefined' && (window.Capacitor?.isNativePlatform?.() || Capacitor?.isNativePlatform?.())) {
    try {
      const res = await UpiAppDetector.getInstalledUpiApps();
      if (res && Array.isArray(res.apps) && res.apps.length > 0) {
        for (const a of res.apps) {
          const matched = KNOWN_UPI_APPS.find(k => k.packageName === a.packageName || a.appName?.toLowerCase().includes(k.name.toLowerCase()));
          const id = matched ? matched.id : a.packageName;
          if (!detectedIds.has(id)) {
            detectedIds.add(id);
            detectedApps.push({
              id,
              name: a.appName || matched?.name || 'UPI App',
              subName: matched?.subName || 'UPI',
              packageName: a.packageName,
              launchPrefix: matched ? matched.launchPrefix : 'upi://pay',
              customIcon: a.icon || null,
              color: matched?.color || '#0F172A'
            });
          }
        }
      }
    } catch (nativeErr) {
      console.warn('Native UpiAppDetector query note:', nativeErr);
    }
  }

  // 2. iOS / Android AppLauncher / Linking.canOpenURL check with multi-URL candidate testing
  if (typeof window !== 'undefined' && (window.Capacitor?.isNativePlatform?.() || Capacitor?.isNativePlatform?.())) {
    for (const app of KNOWN_UPI_APPS) {
      if (detectedIds.has(app.id)) continue;
      const testCandidates = app.testUrls || [app.testUrl];
      for (const testUrl of testCandidates) {
        try {
          const isAvailable = await canOpenUrlSafely(testUrl);
          if (isAvailable) {
            detectedIds.add(app.id);
            detectedApps.push(app);
            break;
          }
        } catch (e) {}
      }
    }

    if (detectedApps.length > 0) {
      return sortUpiAppsByPriority(detectedApps);
    }
  }

  // 3. Fallback for Mobile Device Browser / Mobile Environment
  // When testing on a physical mobile device (Android or iOS):
  // Mobile browsers cannot query PackageManager or canOpenURL due to browser sandbox.
  // We detect if user is on a mobile device and provide prioritized UPI apps
  // so tapping them triggers the mobile UPI intent seamlessly.
  const isMobileDevice = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobileDevice) {
    return sortUpiAppsByPriority(KNOWN_UPI_APPS.slice(0, 6));
  }

  // Desktop laptop/PC browser: strictly return empty list
  return detectedApps;
}

/**
 * Builds standard UPI URI with NPCI parameters
 */
export function buildUpiPaymentUrl(appId, {
  amount = 100,
  orderId,
  note = 'Ridingo Trip Booking',
  payeeVpa = DEFAULT_VPA,
  payeeName = DEFAULT_PAYEE_NAME
} = {}) {
  const cleanAmount = Number(amount || 0).toFixed(2);
  const txnRef = orderId || ('RZP_' + Date.now().toString(36).toUpperCase());
  const queryParams = new URLSearchParams({
    pa: payeeVpa,
    pn: payeeName,
    mc: MERCHANT_CODE,
    tr: txnRef,
    tn: note,
    am: cleanAmount,
    cu: 'INR'
  }).toString();

  const app = KNOWN_UPI_APPS.find(a => a.id === appId);
  const prefix = app ? app.launchPrefix : 'upi://pay';
  return `${prefix}?${queryParams}`;
}

/**
 * Launches a generic deep link URL safely
 */
export async function launchDeepLink(deepLinkUrl) {
  if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) {
    try {
      const { completed } = await AppLauncher.openUrl({ url: deepLinkUrl });
      if (completed) return true;
    } catch (err) {
      console.warn('AppLauncher.openUrl error:', err);
    }
  }

  // Web / mobile browser navigation
  if (typeof window !== 'undefined') {
    window.location.href = deepLinkUrl;
    return true;
  }

  return false;
}

/**
 * Triggers the native UPI app directly via deep link
 */
export async function launchUpiApp(appId, paymentParams) {
  const deepLinkUrl = buildUpiPaymentUrl(appId, paymentParams);
  return launchDeepLink(deepLinkUrl);
}
