import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

/**
 * Multi-Platform Native Device Push & System Notification Engine for Ridingo Driver App
 * 
 * Bypasses in-app UI to deliver persistent alerts directly into the native OS Notification Center:
 * - Native iOS Notification Center (APNs / UNUserNotificationCenter)
 * - Native Android Notification Shade & Heads-Up Banner (NotificationManager Channels)
 * - Desktop & Mobile Web OS Notification Center (W3C Web Notifications & ServiceWorker API)
 */

let isChannelCreated = false;

/**
 * Synthesizes a high-clarity transaction/alert chime using the Web Audio API
 */
export function playNativeAlertChime(type = 'alert') {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;

    if (type === 'payout') {
      // 2-tone pleasant bank credit chime (F5 -> C6)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.frequency.setValueAtTime(698.46, now);
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.frequency.setValueAtTime(1046.5, now + 0.08);
      gain2.gain.setValueAtTime(0.25, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.6);
    } else {
      // Urgent ride request / transaction bell alert (G5 -> E6)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(783.99, now);
      osc.frequency.setValueAtTime(1318.51, now + 0.09);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    }
  } catch (e) {}
}

/**
 * Initializes notification channels on native devices (Android 8.0+)
 */
async function ensureNativeChannel() {
  if (isChannelCreated) return;
  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.createChannel({
        id: 'driver_dispatch_alerts',
        name: 'Ridingo Driver Alerts',
        description: 'Instant ride requests, payout credits, and trip lifecycle alerts',
        importance: 5, // Maximum priority (heads-up banner + sound)
        visibility: 1, // Visible on secure lockscreens
        sound: 'res://raw/beep',
        vibration: true,
        lights: true,
        lightColor: '#FFC70A'
      });
      isChannelCreated = true;
    } catch (e) {
      console.warn('Channel creation error:', e);
    }
  }
}

/**
 * Request OS-level notification permissions
 */
export async function requestDriverNotificationPermission() {
  try {
    if (Capacitor.isNativePlatform()) {
      await ensureNativeChannel();
      const result = await LocalNotifications.requestPermissions();
      return result.display === 'granted';
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
  } catch (err) {
    console.warn('Failed to request notification permission:', err);
  }
  return false;
}

/**
 * Check current OS notification permission status
 */
export async function getDriverNotificationPermission() {
  try {
    if (Capacitor.isNativePlatform()) {
      const status = await LocalNotifications.checkPermissions();
      return status.display; // 'granted' | 'denied' | 'prompt'
    }
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission; // 'granted' | 'denied' | 'default'
    }
  } catch (e) {}
  return 'denied';
}

/**
 * Primary Native Notification Dispatcher:
 * Bypasses in-app UI and delivers notification directly to the native OS Notification Center
 */
export async function sendDriverNativeNotification(title, body, options = {}) {
  const {
    id = Math.floor(Math.random() * 900000) + 100000,
    tag = 'driver_alert_' + Date.now(),
    type = 'alert',
    extra = {}
  } = options;

  // 1. Hardware vibration reinforcement
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      if (type === 'payout') {
        navigator.vibrate([80, 40, 120]);
      } else {
        navigator.vibrate([150, 75, 150, 75, 300]);
      }
    } catch (e) {}
  }

  // 2. Play acoustic transaction / alert chime
  playNativeAlertChime(type);

  // 3. Native Device Notification (iOS Notification Center / Android Notification Tray)
  if (Capacitor.isNativePlatform()) {
    try {
      await ensureNativeChannel();
      await LocalNotifications.schedule({
        notifications: [
          {
            id,
            title,
            body,
            channelId: 'driver_dispatch_alerts',
            smallIcon: 'ic_stat_icon_config_sample',
            largeIcon: 'res://drawable/ic_launcher',
            iconColor: '#FFC70A',
            schedule: { at: new Date(Date.now() + 100) },
            extra: {
              ...extra,
              timestamp: Date.now(),
              source: 'RidingoDriver'
            }
          }
        ]
      });
      return true;
    } catch (err) {
      console.warn('Native LocalNotifications.schedule error:', err);
    }
  }

  // 4. Web / Desktop / PWA OS Notification Center Fallback
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      if (Notification.permission === 'granted') {
        // If Service Worker registration is available, use showNotification for persistent OS shade display
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          const reg = await navigator.serviceWorker.ready;
          if (reg && reg.showNotification) {
            await reg.showNotification(title, {
              body,
              icon: '/favicon.ico',
              badge: '/favicon.ico',
              tag,
              renotify: true,
              requireInteraction: true,
              vibrate: [200, 100, 200, 100, 200],
              data: { ...extra, timestamp: Date.now() }
            });
            return true;
          }
        }

        // Direct OS Notification
        const n = new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag,
          silent: false
        });
        n.onclick = () => {
          window.focus();
          n.close();
        };
        return true;
      } else if (Notification.permission !== 'denied') {
        // Request on the fly if user hasn't explicitly denied
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          new Notification(title, { body, icon: '/favicon.ico', tag });
          return true;
        }
      }
    } catch (err) {
      console.warn('Browser Notification error:', err);
    }
  }

  return false;
}

/**
 * Specialized Driver Alert Dispatches
 */

// 1. Incoming Ride Request Alert
export function notifyIncomingRideRequest(trip) {
  const pickup = trip?.from || 'Customer Pickup Location';
  const fare = trip?.fare || 650;
  const category = trip?.category ? trip.category.toUpperCase() : 'HOURLY';
  return sendDriverNativeNotification(
    '🚗 New Booking Request Nearby!',
    `${category} Chauffeur · ₹${fare} · Pickup at ${pickup}. Tap to accept now.`,
    {
      id: Math.floor(Math.random() * 500000) + 10000,
      tag: `booking_req_${trip?.id || Date.now()}`,
      type: 'request',
      extra: { tripId: trip?.id, fare }
    }
  );
}

// 2. Instant PhonePe Bank Payout / Withdrawal Credit Alert
export function notifyPayoutSuccess(amount, bankDetails = {}, utr = '') {
  const bankAcc = bankDetails.bankAccount || bankDetails.accountNumber || '•••• 4521';
  const bankName = bankDetails.bankName || 'HDFC Bank';
  const refCode = utr || `UTR${Date.now().toString().slice(-8)}`;
  return sendDriverNativeNotification(
    `💰 PhonePe Payout Transferred: ₹${Number(amount).toLocaleString('en-IN')}`,
    `Credited to ${bankName} (${bankAcc}). UTR: ${refCode}. Amount available immediately.`,
    {
      id: Math.floor(Math.random() * 500000) + 500000,
      tag: `payout_tx_${Date.now()}`,
      type: 'payout',
      extra: { amount, utr: refCode }
    }
  );
}

// 3. Pickup OTP Verified Alert
export function notifyStartOtpVerified(trip) {
  return sendDriverNativeNotification(
    '✓ Pickup OTP Verified',
    'Customer identity confirmed. Vehicle condition inspection unlocked.',
    {
      id: 2001,
      tag: 'otp_verified_start',
      type: 'alert',
      extra: { tripId: trip?.id }
    }
  );
}

// 4. Trip Completed & Payment Settled Alert
export function notifyTripCompleted(trip, fare) {
  const earned = fare || trip?.fare || 650;
  return sendDriverNativeNotification(
    '🏁 Trip Completed & Payment Settled',
    `₹${earned} earnings deposited into your Ridingo Driver wallet. Great job!`,
    {
      id: 2002,
      tag: 'trip_completed_fare',
      type: 'payout',
      extra: { tripId: trip?.id, fare: earned }
    }
  );
}

// 5. Driver Online / Radar Activated Alert
export function notifyDriverOnlineStatus(isOnline) {
  if (!isOnline) return;
  return sendDriverNativeNotification(
    '🟢 You Are Online on Ridingo Radar',
    'Live dispatch active. You will receive OS alerts for incoming ride requests.',
    {
      id: 1001,
      tag: 'driver_online_radar',
      type: 'alert'
    }
  );
}
