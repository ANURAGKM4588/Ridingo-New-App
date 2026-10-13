/**
 * Legacy Razorpay bridge - Redirected to PhonePe Payment Gateway (PhonePe PG)
 */
import {
  PHONEPE_MERCHANT_ID,
  PHONEPE_MERCHANT_VPA,
  generateLivePhonePeQrUrl,
  registerPaymentSheetHandler,
  unregisterPaymentSheetHandler,
  openPhonePeCheckout,
  processPhonePeDriverPayout,
  processPhonePeCashbackTransfer
} from './phonepe';

export const RAZORPAY_KEY_ID = PHONEPE_MERCHANT_ID;
export const RAZORPAY_LIVE_KEY_ID = PHONEPE_MERCHANT_ID;
export const RAZORPAY_LIVE_VPA = PHONEPE_MERCHANT_VPA;

export const generateLiveUpiQrUrl = generateLivePhonePeQrUrl;
export const openRazorpayCheckout = openPhonePeCheckout;
export const processRazorpayDriverPayout = processPhonePeDriverPayout;
export const processRazorpayCashbackTransfer = processPhonePeCashbackTransfer;

export { registerPaymentSheetHandler, unregisterPaymentSheetHandler };

export function loadRazorpayScript() {
  return Promise.resolve(true);
}

export const SUPPORTED_UPI_APPS = [
  { id: 'phonepe', name: 'PhonePe', packageName: 'com.phonepe.app', scheme: 'phonepe' },
  { id: 'gpay', name: 'Google Pay', packageName: 'com.google.android.apps.nbu.paisa.user', scheme: 'gpay' },
  { id: 'paytm', name: 'Paytm', packageName: 'net.one97.paytm', scheme: 'paytm' },
  { id: 'cred', name: 'CRED UPI', packageName: 'com.dreamplug.androidapp', scheme: 'cred' }
];

export async function getAppsWhichSupportUPI() {
  return SUPPORTED_UPI_APPS;
}
