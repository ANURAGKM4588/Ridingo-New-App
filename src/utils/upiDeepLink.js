/**
 * Indian Mobile UPI Deep Linking Utility
 * Configured specifically for: Google Pay, PhonePe, Paytm, CRED, Navi, and Device Installed Apps
 */

export const MAJOR_UPI_APPS = [
  {
    id: 'gpay',
    name: 'Google Pay',
    subName: 'GPay',
    scheme: 'tez://upi/pay',
    packageName: 'com.google.android.apps.nbu.paisa.user',
    themeColor: '#4285F4'
  },
  {
    id: 'phonepe',
    name: 'PhonePe',
    subName: 'पे',
    scheme: 'phonepe://pay',
    packageName: 'com.phonepe.app',
    themeColor: '#5F259F'
  },
  {
    id: 'paytm',
    name: 'Paytm',
    subName: 'UPI',
    scheme: 'paytmmp://pay',
    packageName: 'net.one97.paytm',
    themeColor: '#00BAF2'
  },
  {
    id: 'cred',
    name: 'CRED',
    subName: 'CRED Pay',
    scheme: 'credpay://pay',
    packageName: 'com.dreamplug.androidapp',
    themeColor: '#0F172A'
  },
  {
    id: 'navi',
    name: 'Navi',
    subName: 'Navi UPI',
    scheme: 'navi://pay',
    packageName: 'com.naviapp',
    themeColor: '#00D09C'
  },
  {
    id: 'generic',
    name: 'Installed Apps',
    subName: 'Device UPI',
    scheme: 'upi://pay',
    packageName: null,
    themeColor: '#0F172A'
  }
];

const DEFAULT_VPA = 'ridingo.rzp@icici';
const DEFAULT_PAYEE_NAME = 'Ridingo Chauffeur Services';
const MERCHANT_CODE = '4121'; // Passenger Transportation

/**
 * Builds standard UPI URI and Vendor-Specific Deep Link URL schemes
 */
export function buildUpiSchemeUrl(appId, {
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

  switch (appId?.toLowerCase()) {
    case 'gpay':
    case 'tez':
      return `tez://upi/pay?${queryParams}`;
    case 'phonepe':
      return `phonepe://pay?${queryParams}`;
    case 'paytm':
      return `paytmmp://pay?${queryParams}`;
    case 'cred':
    case 'credpay':
      return `credpay://pay?${queryParams}`;
    case 'navi':
      return `navi://pay?${queryParams}`;
    case 'generic':
    default:
      return `upi://pay?${queryParams}`;
  }
}

/**
 * Dispatches deep link to React Native host or device system intent
 */
export function triggerUpiDeepLink({
  appId,
  amount,
  orderId,
  note = 'Ridingo Trip Booking',
  onTriggered
}) {
  const deepLink = buildUpiSchemeUrl(appId, { amount, orderId, note });
  const genericUpi = buildUpiSchemeUrl('generic', { amount, orderId, note });
  const appMeta = MAJOR_UPI_APPS.find(a => a.id === appId) || { name: 'Device UPI App', packageName: '' };

  if (typeof window !== 'undefined') {
    // 1. Send native message to React Native WebView bridge
    if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
      try {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({
            type: 'OPEN_UPI_URL',
            appId,
            appName: appMeta.name,
            packageName: appMeta.packageName,
            url: deepLink,
            fallbackUrl: genericUpi,
            amount,
            orderId
          })
        );
      } catch (e) {
        console.warn('Failed to postMessage to ReactNativeWebView:', e);
      }
    }

    // 2. Direct Window Intent Trigger for Android / iOS
    try {
      window.location.href = deepLink;
    } catch (e) {
      console.warn('Direct location.href deep link trigger failed:', e);
    }
  }

  if (typeof onTriggered === 'function') {
    onTriggered({ appId, deepLink, genericUpi, appName: appMeta.name });
  }

  return { deepLink, genericUpi, appMeta };
}
