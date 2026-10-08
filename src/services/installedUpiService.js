/**
 * installedUpiService.js
 * 
 * Dynamic Native Installed UPI Apps Detection & Deep-Link Launcher:
 * - iOS: Queries LSApplicationQueriesSchemes via canOpenURL
 * - Android: Queries PackageManager via native UpiAppDetector / AppLauncher
 * - Dynamic Filtering: Shows ONLY physically installed apps on the user's device
 */
import { AppLauncher } from '@capacitor/app-launcher';

export const KNOWN_UPI_APPS = [
  {
    id: 'gpay',
    name: 'Google Pay',
    subName: 'GPay',
    scheme: 'tez',
    testUrl: 'tez://upi/pay',
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
    launchPrefix: 'amazonpay://pay',
    packageName: 'in.amazon.mShop.android.shopping',
    color: '#FF9900',
    priority: 9
  }
];

export const PRIORITIZED_UPI_IDS = ['gpay', 'phonepe', 'navi', 'cred', 'supermoney', 'jupiter'];

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

  // 1. First attempt: Native Android Plugin / Module (if running on Android native)
  if (typeof window !== 'undefined' && window.Capacitor?.isPluginAvailable?.('UpiAppDetector')) {
    try {
      const res = await window.Capacitor.Plugins.UpiAppDetector.getInstalledUpiApps();
      if (res && Array.isArray(res.apps) && res.apps.length > 0) {
        const mapped = res.apps.map(a => {
          const matched = KNOWN_UPI_APPS.find(k => k.packageName === a.packageName || a.appName?.toLowerCase().includes(k.name.toLowerCase()));
          return {
            id: matched ? matched.id : a.packageName,
            name: a.appName || matched?.name || 'UPI App',
            subName: matched?.subName || 'UPI',
            packageName: a.packageName,
            launchPrefix: matched ? matched.launchPrefix : 'upi://pay',
            customIcon: a.icon || null,
            color: matched?.color || '#0F172A'
          };
        });
        return sortUpiAppsByPriority(mapped);
      }
    } catch (nativeErr) {
      console.warn('Native UpiAppDetector query note:', nativeErr);
    }
  }

  // 2. Cross-platform detection using AppLauncher / canOpenURL (iOS LSApplicationQueriesSchemes & Android)
  if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) {
    try {
      for (const app of KNOWN_UPI_APPS) {
        try {
          const { value } = await AppLauncher.canOpenUrl({ url: app.testUrl });
          if (value) {
            detectedApps.push(app);
          }
        } catch (e) {
          // Scheme not available or not installed
        }
      }

      if (detectedApps.length > 0) {
        return sortUpiAppsByPriority(detectedApps);
      }
    } catch (launcherErr) {
      console.warn('AppLauncher query error:', launcherErr);
    }
  }

  // 3. Desktop Browser / Non-Native Environment:
  // Strictly return empty list because desktop browsers (like laptops) do NOT have native UPI apps installed.
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
 * Triggers the native UPI app directly via deep link
 */
export async function launchUpiApp(appId, paymentParams) {
  const deepLinkUrl = buildUpiPaymentUrl(appId, paymentParams);

  if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) {
    try {
      const { completed } = await AppLauncher.openUrl({ url: deepLinkUrl });
      if (completed) return true;
    } catch (err) {
      console.warn('AppLauncher.openUrl error:', err);
    }
  }

  // Web / fallback navigation
  if (typeof window !== 'undefined') {
    window.location.href = deepLinkUrl;
    return true;
  }

  return false;
}
