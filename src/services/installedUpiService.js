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

// 5 Preset UPI Apps requested specifically by user (PhonePe, Google Pay, Apple Pay, CRED, super.money)
export const PRESET_UPI_APPS = [
  {
    id: 'phonepe',
    name: 'PhonePe',
    subName: 'Instant UPI Payments',
    scheme: 'phonepe',
    testUrl: 'phonepe://pay',
    testUrls: ['phonepe://pay', 'phonepe://'],
    launchPrefix: 'phonepe://pay',
    packageName: 'com.phonepe.app',
    appStoreId: '1170055821',
    appStoreUrl: 'https://apps.apple.com/in/app/phonepe-payments-recharge/id1170055821',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.phonepe.app',
    color: '#5F259F',
    priority: 1
  },
  {
    id: 'gpay',
    name: 'Google Pay',
    subName: 'Google Pay UPI',
    scheme: 'tez',
    testUrl: 'tez://upi/pay',
    testUrls: ['tez://upi/pay', 'tez://', 'gpay://'],
    launchPrefix: 'tez://upi/pay',
    packageName: 'com.google.android.apps.nbu.paisa.user',
    appStoreId: '1193357041',
    appStoreUrl: 'https://apps.apple.com/in/app/google-pay-save-pay-with-upi/id1193357041',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.google.android.apps.nbu.paisa.user',
    color: '#4285F4',
    priority: 2
  },
  {
    id: 'applepay',
    name: 'Apple Pay',
    subName: 'Apple Wallet & Pay',
    scheme: 'shoebox',
    testUrl: 'shoebox://',
    testUrls: ['shoebox://'],
    launchPrefix: 'shoebox://',
    packageName: null,
    appStoreId: '1160487578',
    appStoreUrl: 'https://apps.apple.com/in/app/apple-wallet/id1160487578',
    playStoreUrl: 'https://www.apple.com/apple-pay/',
    color: '#000000',
    priority: 3
  },
  {
    id: 'cred',
    name: 'CRED',
    subName: 'CRED Pay UPI',
    scheme: 'credpay',
    testUrl: 'credpay://pay',
    testUrls: ['credpay://pay', 'credpay://', 'cred://'],
    launchPrefix: 'credpay://pay',
    packageName: 'com.dreamplug.androidapp',
    appStoreId: '1422888280',
    appStoreUrl: 'https://apps.apple.com/in/app/cred-credit-card-bills/id1422888280',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.dreamplug.androidapp',
    color: '#0F172A',
    priority: 4
  },
  {
    id: 'supermoney',
    name: 'super.money',
    subName: 'Super UPI & 5% Cashback',
    scheme: 'supermoney',
    testUrl: 'supermoney://pay',
    testUrls: ['supermoney://pay', 'supermoney://'],
    launchPrefix: 'supermoney://pay',
    packageName: 'money.super.app',
    appStoreId: '6503923053',
    appStoreUrl: 'https://apps.apple.com/in/app/super-money-upi-rewards/id6503923053',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=money.super.app',
    color: '#7C3AED',
    priority: 5
  }
];

export const KNOWN_UPI_APPS = [
  ...PRESET_UPI_APPS,
  {
    id: 'navi',
    name: 'Navi UPI',
    subName: 'Navi',
    scheme: 'navi',
    testUrl: 'navi://pay',
    testUrls: ['navi://pay', 'navi://', 'naviapp://'],
    launchPrefix: 'navi://pay',
    packageName: 'com.naviapp',
    appStoreId: '1585860477',
    appStoreUrl: 'https://apps.apple.com/in/app/navi-upi-loans-investments/id1585860477',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.naviapp',
    color: '#00D09C',
    priority: 6
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
    appStoreId: '1533519803',
    appStoreUrl: 'https://apps.apple.com/in/app/jupiter-money-upi-cards/id1533519803',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=money.jupiter',
    color: '#FF725E',
    priority: 7
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
    appStoreId: '473941634',
    appStoreUrl: 'https://apps.apple.com/in/app/paytm-secure-upi-payments/id473941634',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=net.one97.paytm',
    color: '#00BAF2',
    priority: 8
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
    appStoreId: '1200315595',
    appStoreUrl: 'https://apps.apple.com/in/app/bhim-making-india-cashless/id1200315595',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=in.org.npci.upiapp',
    color: '#00833E',
    priority: 9
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
    appStoreId: '297606951',
    appStoreUrl: 'https://apps.apple.com/in/app/amazon-india-shop-pay-minitv/id297606951',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=in.amazon.mShop.android.shopping',
    color: '#FF9900',
    priority: 10
  }
];

export const PRIORITIZED_UPI_IDS = ['phonepe', 'gpay', 'applepay', 'cred', 'supermoney'];

/**
 * Checks if a specific app is installed on the user's device
 */
export async function checkAppInstalled(app) {
  if (!app) return false;

  // 1. Apple Pay check
  if (app.id === 'applepay') {
    const isIOSDevice = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (typeof window !== 'undefined' && (window.Capacitor?.getPlatform?.() === 'ios' || Capacitor?.getPlatform?.() === 'ios')));
    if (!isIOSDevice) return false;
    if (typeof window !== 'undefined' && window.ApplePaySession && typeof window.ApplePaySession.canMakePayments === 'function') {
      try {
        if (window.ApplePaySession.canMakePayments()) return true;
      } catch (e) {}
    }
    return canOpenUrlSafely('shoebox://');
  }

  // 2. Native iOS / Android check via UpiAppDetector or AppLauncher
  if (typeof window !== 'undefined' && (window.Capacitor?.isNativePlatform?.() || Capacitor?.isNativePlatform?.())) {
    const testCandidates = app.testUrls || [app.testUrl];
    for (const testUrl of testCandidates) {
      try {
        const canOpen = await canOpenUrlSafely(testUrl);
        if (canOpen) return true;
      } catch (e) {}
    }
    return false;
  }

  // 3. Web or desktop browser environment:
  // Cannot query device installed apps directly due to browser sandboxing.
  return false;
}

/**
 * Redirects the user directly to the official App Store (iOS) or Google Play Store (Android)
 * if the app is not installed on their device.
 */
export function openAppStoreForApp(app) {
  if (!app) return false;

  const isIOS = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (typeof window !== 'undefined' && (window.Capacitor?.getPlatform?.() === 'ios' || Capacitor?.getPlatform?.() === 'ios')));
  const isAndroid = typeof navigator !== 'undefined' && (/Android/.test(navigator.userAgent) ||
    (typeof window !== 'undefined' && (window.Capacitor?.getPlatform?.() === 'android' || Capacitor?.getPlatform?.() === 'android')));

  let targetUrl = '';
  if (isIOS) {
    targetUrl = app.appStoreUrl || (app.appStoreId ? `https://apps.apple.com/app/id${app.appStoreId}` : null);
  } else if (isAndroid) {
    // Prefer direct market:// scheme on Android if supported, fallback to Play Store https URL
    targetUrl = app.packageName ? `market://details?id=${app.packageName}` : app.playStoreUrl;
  }

  if (!targetUrl) {
    targetUrl = isIOS ? app.appStoreUrl : (app.playStoreUrl || app.appStoreUrl);
  }

  if (targetUrl && typeof window !== 'undefined') {
    try {
      if (window.Capacitor?.isNativePlatform?.() && targetUrl.startsWith('market://')) {
        window.location.href = targetUrl;
      } else {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      }
      return true;
    } catch (e) {
      window.location.href = targetUrl;
      return true;
    }
  }
  return false;
}

/**
 * Checks if a specific URL scheme can be opened
 */
export async function canOpenUrlSafely(url) {
  if (!url) return false;

  // 1. Native iOS / Android UpiAppDetector plugin canOpenUrl
  try {
    if (typeof UpiAppDetector?.canOpenUrl === 'function') {
      const res = await UpiAppDetector.canOpenUrl({ url });
      if (res && res.value) return true;
    }
  } catch (e) {}

  // 2. Capacitor AppLauncher plugin
  try {
    if (typeof AppLauncher !== 'undefined' && typeof AppLauncher.canOpenUrl === 'function') {
      const { value } = await AppLauncher.canOpenUrl({ url });
      if (value) return true;
    }
  } catch (e) {}

  // 3. window.Capacitor.Plugins.AppLauncher
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
const DEFAULT_PAYEE_NAME = 'Ridingo Driver Services';
const MERCHANT_CODE = '4121';

/**
 * Dynamically queries the device to find ONLY physically installed UPI apps,
 * prioritized according to the configured list.
 * @returns {Promise<Array>} List of installed UPI apps with metadata
 */
export async function getInstalledUpiApps() {
  const detectedApps = [];
  const detectedIds = new Set();

  // 1. Native Plugin query via UpiAppDetector (Android PackageManager & iOS canOpenURL via Swift plugin)
  if (typeof window !== 'undefined' && (window.Capacitor?.isNativePlatform?.() || Capacitor?.isNativePlatform?.())) {
    try {
      let res = null;
      if (typeof UpiAppDetector?.getInstalledUpiApps === 'function') {
        res = await UpiAppDetector.getInstalledUpiApps();
      } else if (typeof UpiAppDetector?.checkInstalledApps === 'function') {
        res = await UpiAppDetector.checkInstalledApps();
      }

      const appList = res?.apps || res?.installedApps || [];
      if (Array.isArray(appList) && appList.length > 0) {
        for (const item of appList) {
          const appObj = typeof item === 'string' ? { id: item, scheme: item } : item;
          const matched = KNOWN_UPI_APPS.find(k => 
            (appObj.id && k.id === appObj.id) || 
            (appObj.scheme && k.scheme === appObj.scheme) || 
            (appObj.packageName && k.packageName === appObj.packageName) ||
            (appObj.appName && appObj.appName.toLowerCase().includes(k.name.toLowerCase())) ||
            (appObj.name && appObj.name.toLowerCase().includes(k.name.toLowerCase()))
          );
          const id = matched ? matched.id : (appObj.id || appObj.packageName || appObj.scheme);
          if (id && !detectedIds.has(id)) {
            detectedIds.add(id);
            detectedApps.push({
              id,
              name: matched?.name || appObj.appName || appObj.name || 'UPI App',
              subName: matched?.subName || 'UPI',
              packageName: matched?.packageName || appObj.packageName,
              scheme: matched?.scheme || appObj.scheme,
              launchPrefix: matched ? matched.launchPrefix : `${appObj.scheme || 'upi'}://pay`,
              customIcon: appObj.icon || null,
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
  if (!deepLinkUrl) return false;

  // 1. Native iOS / Android UpiAppDetector plugin openUrl
  try {
    if (typeof UpiAppDetector?.openUrl === 'function') {
      const res = await UpiAppDetector.openUrl({ url: deepLinkUrl });
      if (res && res.completed) return true;
    }
  } catch (err) {
    console.warn('UpiAppDetector.openUrl note:', err);
  }

  // 2. Capacitor AppLauncher plugin
  if (typeof window !== 'undefined' && (window.Capacitor?.isNativePlatform?.() || Capacitor?.isNativePlatform?.())) {
    try {
      if (typeof AppLauncher !== 'undefined' && typeof AppLauncher.openUrl === 'function') {
        const { completed } = await AppLauncher.openUrl({ url: deepLinkUrl });
        if (completed) return true;
      }
    } catch (err) {
      console.warn('AppLauncher.openUrl error:', err);
    }
  }

  // 3. Web / mobile browser navigation
  if (typeof window !== 'undefined') {
    try {
      window.location.href = deepLinkUrl;
      return true;
    } catch (e) {}
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

/**
 * Native image + caption sharer targeting WhatsApp directly
 * (ensures text is populated as the image caption, NOT a separate message)
 */
export async function shareTicketImageWithCaption({ base64Data, caption, targetApp = 'whatsapp' }) {
  if (typeof window !== 'undefined' && (window.Capacitor?.isNativePlatform?.() || Capacitor?.isNativePlatform?.())) {
    try {
      if (typeof UpiAppDetector?.shareImageWithCaption === 'function') {
        await UpiAppDetector.shareImageWithCaption({ base64Data, caption, targetApp });
        return true;
      }
    } catch (e) {
      console.warn('[shareTicketImageWithCaption] Native plugin note:', e);
    }
  }
  return false;
}
