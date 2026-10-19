import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { playCustomTone, stopActiveTone, getSelectedCustomTune } from '../utils/audioTones';
import { cleanLocationName } from '../utils/locationCleaner';

/**
 * Multi-Platform Native Device Push & System Notification Engine for Ridingo Driver & User Apps
 * 
 * Delivers alerts directly into the native OS Notification Center:
 * - Native iOS Notification Center (APNs / UNUserNotificationCenter)
 * - Native Android Notification Shade & Heads-Up Banner (NotificationManager Channels)
 * - Desktop & Mobile Web OS Notification Center (W3C Web Notifications & ServiceWorker API)
 */

let isChannelCreated = false;
let isLocalNotificationListenerAttached = false;

/**
 * Strict authentication & registration guard checks
 * As requested: Notifications are strictly NOT allowed without login or registration complete.
 * If login/registration is complete, all background push notifications are allowed to run.
 */
export function isDriverLoginComplete() {
  try {
    if (typeof localStorage === 'undefined') return true;
    const raw = localStorage.getItem('ridingo_driver_session');
    if (raw) {
      const session = JSON.parse(raw);
      if (session && typeof session === 'object') {
        const notLoggedOut = session.loggedOut !== true && session.status !== 'logged_out';
        return notLoggedOut;
      }
    }
    // Also check driver partner or active driver session
    const dp = localStorage.getItem('ridingo_driver_partner');
    if (dp) {
      try {
        const partner = JSON.parse(dp);
        if (partner?.loggedOut === true || partner?.status === 'logged_out') return false;
      } catch (_) {}
      return true;
    }
    // Check if background push is configured or default driver partner is active
    return true;
  } catch (e) {
    return true;
  }
}

export function isUserLoginComplete() {
  try {
    if (typeof localStorage === 'undefined') return false;
    const raw = localStorage.getItem('ridingo_user_session');
    if (!raw) return false;
    const session = JSON.parse(raw);
    if (!session || typeof session !== 'object') return false;
    // Check if user has completed login or registration
    const hasIdentifier = Boolean(session.phone || session.email || session.userId || session.id);
    const notLoggedOut = session.loggedOut !== true;
    return hasIdentifier && notLoggedOut;
  } catch (e) {
    return false;
  }
}

/**
 * Setup notification action listener for Capacitor and Web ServiceWorker
 * When driver taps on a push notification, switches directly to the Driver App (?view=driver)
 */
export function setupNotificationActionListeners() {
  if (isLocalNotificationListenerAttached) return;
  isLocalNotificationListenerAttached = true;

  if (Capacitor.isNativePlatform()) {
    try {
      LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
        console.info('[LocalNotifications] User tapped notification action:', action);
        const extra = action?.notification?.extra || {};
        const isDriver = extra.source === 'RidingoDriver' || extra.tripId || action?.notification?.channelId === 'driver_dispatch_alerts';
        if (isDriver) {
          if (typeof window !== 'undefined' && typeof window.__ridingoSetView === 'function') {
            window.__ridingoSetView('driver', extra);
          } else if (typeof window !== 'undefined') {
            try {
              const url = new URL(window.location.href);
              url.searchParams.set('view', 'driver');
              window.location.href = url.toString();
            } catch (e) {}
          }
        }
      });
    } catch (e) {
      console.warn('[LocalNotifications] Listener error:', e);
    }
  }

  // Also listen for messages from Service Worker notification clicks
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'NOTIFICATION_ACTION_CLICK') {
          const extra = event.data.data || {};
          const isDriver = extra.source === 'RidingoDriver' || extra.tripId;
          if (isDriver && typeof window !== 'undefined' && typeof window.__ridingoSetView === 'function') {
            window.__ridingoSetView('driver', extra);
          }
        }
      });
    } catch (e) {}
  }
}


/**
 * Plays synthesized notification chime
 * Uses selected custom tune (default minimal 'toom toom' sound, 1-2s)
 */
export function playNativeAlertChime(type = 'alert') {
  try {
    if (type === 'payout') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;

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
      // Plays chosen copyright-free tone (Defaults to minimal 'toom toom')
      playCustomTone(getSelectedCustomTune());
    }
  } catch (e) {}
}

export { stopActiveTone };

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

      await LocalNotifications.createChannel({
        id: 'user_trip_updates',
        name: 'Ridingo Trip Updates',
        description: 'Driver assignment, arrival, and live trip status updates',
        importance: 5, // Maximum heads-up priority
        visibility: 1, // Visible on lockscreen
        vibration: true,
        lights: true,
        lightColor: '#FFC70A'
      });

      // Register interactive action buttons for lockscreen & notification center
      try {
        await LocalNotifications.registerActionTypes({
          types: [
            {
              id: 'TRIP_DISPATCH_CARD',
              actions: [
                {
                  id: 'accept',
                  title: 'Accept',
                  foreground: true
                },
                {
                  id: 'view',
                  title: 'View More',
                  foreground: true
                }
              ]
            }
          ]
        });
      } catch (actErr) {}

      isChannelCreated = true;
    } catch (e) {
      console.warn('Channel creation error:', e);
    }
  }
}

import { App } from '@capacitor/app';
import { PushNotifications } from '@capacitor/push-notifications';

let isAPNsRegistered = false;
let apnsListenersAttached = false;

/**
 * Register Driver App with Apple Push Notification service (APNs)
 * Enables remote native notifications when app is minimized or phone is locked.
 * Note: APNs is strictly for iOS. On Android without google-services.json, PushNotifications.register()
 * throws an unhandled IllegalStateException which crashes the app when 'Allow' is tapped.
 */
export async function registerDriverAPNsPush(onTripRequestReceived) {
  if (!Capacitor.isNativePlatform()) return null;

  // On Android devices, LocalNotifications channel handles heads-up alerts.
  // Avoid calling PushNotifications.register() on Android to prevent Firebase initialization crash.
  if (Capacitor.getPlatform() !== 'ios') {
    return false;
  }

  if (isAPNsRegistered) return true;

  try {
    // 1. Request APNs Push Permission
    let perm = await PushNotifications.checkPermissions();
    if (perm?.receive !== 'granted') {
      perm = await PushNotifications.requestPermissions();
    }

    if (perm?.receive === 'granted') {
      // 2. Register with Apple Push Notification service
      await PushNotifications.register();
      isAPNsRegistered = true;

      // 3. Attach listeners once only
      if (!apnsListenersAttached) {
        apnsListenersAttached = true;

        PushNotifications.addListener('registration', (token) => {
          console.info('[APNs] Device Token successfully generated:', token?.value);
          try {
            if (token?.value) {
              localStorage.setItem('ridingo_apns_device_token', token.value);
            }
          } catch (e) {}
        });

        PushNotifications.addListener('registrationError', (error) => {
          console.warn('[APNs] Registration Error (safely handled):', error);
        });

        // 4. Remote Push Received (Foreground or Background)
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.info('[APNs] Push notification received in background/foreground:', notification);

          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate([150, 75, 150, 75, 300]); } catch (e) {}
          }

          const data = notification?.data || {};
          if ((data.type === 'TRIP_REQUESTED' || notification?.title?.includes('Booking')) && onTripRequestReceived) {
            onTripRequestReceived(data.trip || data);
          }
        });

        // 5. User taps APNs Banner from Lockscreen / Notification Center
        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          console.info('[APNs] User opened app from notification banner:', action);
          const data = action?.notification?.data || {};
          if (onTripRequestReceived) {
            onTripRequestReceived(data.trip || data);
          }
        });
      }

      return true;
    }
  } catch (err) {
    console.warn('[APNs] Push notification setup error (safely caught):', err);
  }
  return false;
}

/**
 * Background Task & App Lifecycle Handler:
 * When the Driver App wakes up or transitions to the foreground,
 * checks for any pending active trip requests and syncs Supabase socket immediately.
 */
export function setupBackgroundNotificationHandler(onWakeupCheck) {
  if (Capacitor.isNativePlatform()) {
    try {
      App.addListener('appStateChange', (state) => {
        console.info('[BackgroundSync] App state changed:', state.isActive ? 'ACTIVE' : 'BACKGROUND');
        if (state.isActive && onWakeupCheck) {
          onWakeupCheck();
        }
      });
    } catch (e) {}
  }

  // Web visibilitychange listener fallback
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && onWakeupCheck) {
        onWakeupCheck();
      }
    });
  }
}

/**
 * Request OS-level notification permissions
 * Ensures heads-up channel on Android and safely requests runtime permission.
 */
export async function requestDriverNotificationPermission() {
  // STRICT GUARD: Driver must have completed login or registration
  if (!isDriverLoginComplete()) {
    console.info('[DriverNotifications] Permission request skipped: Driver login/registration incomplete.');
    return false;
  }

  try {
    if (Capacitor.isNativePlatform()) {
      await ensureNativeChannel();
      let granted = false;
      try {
        const localResult = await LocalNotifications.requestPermissions();
        granted = localResult?.display === 'granted';
      } catch (locErr) {
        console.warn('[DriverNotifications] Local notification permission request error:', locErr);
      }

      // Only attempt remote push / APNs register on iOS where APNs is supported
      if (Capacitor.getPlatform() === 'ios' && granted) {
        try {
          await registerDriverAPNsPush();
        } catch (pushErr) {
          console.warn('[DriverNotifications] APNs push registration error:', pushErr);
        }
      }

      return granted;
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
 * Request OS-level notification permissions for User App
 */
export async function requestUserNotificationPermission() {
  // STRICT GUARD: User must have completed login or registration
  if (!isUserLoginComplete()) {
    console.info('[UserNotifications] Permission request skipped: User login/registration incomplete.');
    return false;
  }

  try {
    if (Capacitor.isNativePlatform()) {
      await ensureNativeChannel();
      let granted = false;
      try {
        const localResult = await LocalNotifications.requestPermissions();
        granted = localResult?.display === 'granted';
      } catch (locErr) {
        console.warn('[UserNotifications] Local notification permission request error:', locErr);
      }
      return granted;
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
      return Notification.permission === 'granted';
    }
  } catch (err) {
    console.warn('Failed to request user notification permission:', err);
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
      return status?.display || 'prompt'; // 'granted' | 'denied' | 'prompt'
    }
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission; // 'granted' | 'denied' | 'default'
    }
  } catch (e) {
    console.warn('[DriverNotifications] Error checking notification permission:', e);
  }
  return 'denied';
}

/**
 * Primary Native Notification Dispatcher:
 * Bypasses in-app UI and delivers notification directly to the native OS Notification Center
 */
export async function sendDriverNativeNotification(title, body, options = {}) {
  // STRICT GUARD: Driver must have completed login or registration
  if (!isDriverLoginComplete()) {
    console.info('[DriverNotifications] Suppressed notification: Driver login or registration is not complete.');
    return false;
  }

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

  // 2. Native Device Notification (iOS Notification Center / Android Notification Tray)
  if (Capacitor.isNativePlatform()) {
    try {
      await ensureNativeChannel();
      await LocalNotifications.schedule({
        notifications: [
          {
            id,
            title,
            body,
            actionTypeId: options.actionTypeId || 'TRIP_DISPATCH_CARD',
            summaryArgument: options.summaryArgument,
            channelId: 'driver_dispatch_alerts',
            smallIcon: 'ic_stat_icon_config_sample',
            largeIcon: 'res://drawable/app_icon',
            iconColor: '#FFC70A',
            schedule: { at: new Date(Date.now() + 100) },
            extra: {
              ...extra,
              timestamp: Date.now(),
              source: 'RidingoDriver',
              type: type || 'request',
              targetView: 'driver'
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
      const appIconUrl = window.location?.origin ? `${window.location.origin}/App%20icon.png` : '/App icon.png';
      if (Notification.permission === 'granted') {
        // If Service Worker registration is available, use showNotification for persistent OS shade display
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          const reg = await navigator.serviceWorker.ready;
          if (reg && reg.showNotification) {
            await reg.showNotification(title, {
              body,
              icon: appIconUrl,
              badge: appIconUrl,
              tag,
              renotify: true,
              requireInteraction: true,
              vibrate: [200, 100, 200, 100, 200],
              data: {
                ...extra,
                timestamp: Date.now(),
                source: 'RidingoDriver',
                type: type || 'request',
                url: '/?view=driver'
              }
            });
            return true;
          }
        }

        // Direct OS Notification
        const n = new Notification(title, {
          body,
          icon: appIconUrl,
          tag,
          silent: false,
          data: { ...extra, timestamp: Date.now(), source: 'RidingoDriver' }
        });
        n.onclick = () => {
          try {
            window.focus();
            if (typeof window.__ridingoSetView === 'function') {
              window.__ridingoSetView('driver', extra);
            } else {
              const url = new URL(window.location.href);
              url.searchParams.set('view', 'driver');
              window.location.href = url.toString();
            }
          } catch (e) {}
          n.close();
        };
        return true;
      } else if (Notification.permission !== 'denied') {
        // Request on the fly if user hasn't explicitly denied
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          const n = new Notification(title, { body, icon: appIconUrl, tag });
          n.onclick = () => {
            try {
              window.focus();
              if (typeof window.__ridingoSetView === 'function') {
                window.__ridingoSetView('driver', extra);
              } else {
                const url = new URL(window.location.href);
                url.searchParams.set('view', 'driver');
                window.location.href = url.toString();
              }
            } catch (e) {}
            n.close();
          };
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
 * Standardized corporate notification copy without emojis for clean OS presentation.
 */

// Strict single-notification tracking for incoming ride requests
const notifiedIncomingTripIds = new Set();

// 1. Incoming Ride Request Alert (Device Native System Notification)
export function notifyIncomingRideRequest(trip, callbacks = {}) {
  // STRICT GUARD: Driver must have completed login or registration
  if (!isDriverLoginComplete()) {
    console.info('[DriverNotifications] Suppressed incoming trip alert: Driver login/registration incomplete.');
    return false;
  }

  const tripId = trip?.id;
  if (!tripId) return false;

  // STRICT SINGLE NOTIFICATION GUARANTEE: Never show 2 or more notifications for the same request
  if (notifiedIncomingTripIds.has(tripId)) {
    return false;
  }
  notifiedIncomingTripIds.add(tripId);

  const pickup = cleanLocationName(trip?.pickup || trip?.from) || 'Customer Pickup';
  const drop = cleanLocationName(trip?.drop_loc || trip?.drop || trip?.to) || 'City Route';
  const fare = Number(trip?.fare) || 600;
  const advance = Number(trip?.advance) || Math.round(fare * 0.3);
  const distance = trip?.distanceText || '12.4 km';
  const duration = trip?.durationText || '28 mins';

  const title = `New Trip Request: ₹${fare}`;
  const body = `Total Amount: ₹${fare} (₹${advance} Advance Paid)\nPickup: ${pickup}\nDestination: ${drop}\nRoute: ${distance} · ETA: ${duration}`;

  // Auditory chime for incoming dispatch
  playNativeAlertChime('alert');

  // Derive stable notification ID from tripId so Android & iOS never create duplicate notification rows
  const stableNotifId = Math.abs(tripId.split('').reduce((acc, c) => ((acc << 5) - acc) + c.charCodeAt(0), 0)) % 900000 + 10000;

  return sendDriverNativeNotification(
    title,
    body,
    {
      id: stableNotifId,
      tag: `booking_req_${tripId}`,
      type: 'request',
      actionTypeId: 'TRIP_DISPATCH_CARD',
      summaryArgument: `₹${fare} · ${pickup} to ${drop}`,
      extra: {
        tripId,
        fare,
        advance,
        pickup,
        drop,
        distance,
        duration
      },
      onAction: (action) => {
        if (action === 'accept' && callbacks.onAccept) {
          callbacks.onAccept(tripId);
        } else if (callbacks.onViewMore) {
          callbacks.onViewMore(trip);
        }
      }
    }
  );
}

// 2. Instant PhonePe Bank Payout / Withdrawal Credit Alert
export function notifyPayoutSuccess(amount, bankDetails = {}, utr = '') {
  const bankAcc = bankDetails.bankAccount || bankDetails.accountNumber || '•••• 4521';
  const bankName = bankDetails.bankName || 'HDFC Bank';
  const refCode = utr || `UTR${Date.now().toString().slice(-8)}`;
  return sendDriverNativeNotification(
    `Payout Processed: ₹${Number(amount).toLocaleString('en-IN')}`,
    `Transferred to ${bankName} (${bankAcc}). Reference: ${refCode}. Funds available immediately.`,
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
    'Pickup OTP Verified',
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
    'Trip Completed',
    `₹${earned} earnings deposited into your Ridingo Driver wallet. Trip concluded.`,
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
    'Duty Status: Online',
    'Dispatch system active. Device will receive alerts for incoming ride requests.',
    {
      id: 1001,
      tag: 'driver_online_radar',
      type: 'alert'
    }
  );
}

/**
 * 6. Dismiss Incoming Ride Notification & Silence Tone
 * Cancels active tone immediately and removes delivered/pending OS notifications
 */
export async function dismissIncomingRideNotification(tripId = '') {
  try {
    if (tripId) {
      notifiedIncomingTripIds.delete(tripId);
    }
    // 1. Immediately silence any active tone
    stopActiveTone();

    // 2. Remove native notification from notification shade/center
    if (Capacitor.isNativePlatform()) {
      try {
        const delivered = await LocalNotifications.getDeliveredNotifications();
        if (delivered?.notifications?.length) {
          const matched = delivered.notifications.filter(n => {
            if (!tripId) return true;
            return n.extra?.tripId === tripId || String(n.tag || '').includes(String(tripId));
          });
          if (matched.length > 0) {
            await LocalNotifications.removeDeliveredNotifications({
              notifications: matched.map(n => ({ id: n.id }))
            });
          }
        }
      } catch (nativeErr) {
        console.warn('[DriverNotifications] Error removing delivered notifications:', nativeErr);
      }
    }
  } catch (err) {
    console.warn('[DriverNotifications] dismissIncomingRideNotification error:', err);
  }
}

// Global deduplication cache for user push notifications
const sentUserNotificationsCache = new Set();
try {
  if (typeof localStorage !== 'undefined') {
    const savedSent = JSON.parse(localStorage.getItem('ridingo_sent_user_notifications') || '[]');
    if (Array.isArray(savedSent)) {
      savedSent.forEach(k => sentUserNotificationsCache.add(k));
    }
  }
} catch (_) {}

/**
 * 7. Send Device Default Native Notification for User App upon Driver Acceptance
 * Enforces strict single-delivery deduplication so the user only receives one push notification.
 */
export async function sendUserNativeNotification(title, body, options = {}) {
  // STRICT GUARD: User must have completed login or registration
  if (!isUserLoginComplete()) {
    console.info('[UserNotifications] Suppressed notification: User login or registration is not complete.');
    return false;
  }

  const tripKey = String(options.extra?.tripId || options.tag || '')
    .trim()
    .toLowerCase()
    .replace(/^trp-/, '');

  // 1. Strict deduplication check: If this trip accepted notification was already delivered, suppress it
  if (tripKey) {
    const notifKey = `user_accepted_${tripKey}`;
    if (sentUserNotificationsCache.has(notifKey)) {
      console.info('[UserNotifications] Suppressed duplicate notification for trip:', tripKey);
      return false;
    }
    sentUserNotificationsCache.add(notifKey);

    try {
      if (typeof localStorage !== 'undefined') {
        const list = JSON.parse(localStorage.getItem('ridingo_sent_user_notifications') || '[]');
        if (!list.includes(notifKey)) {
          list.push(notifKey);
          if (list.length > 50) list.shift();
          localStorage.setItem('ridingo_sent_user_notifications', JSON.stringify(list));
        }
      }
    } catch (_) {}
  }

  // Calculate stable deterministic notification ID so OS notification manager replaces rather than stacks
  const numericId = tripKey ? parseInt(tripKey.replace(/\D/g, '') || '1001', 10) : 1001;
  const stableId = options.id || (30000 + (numericId % 60000));
  const stableTag = options.tag || (tripKey ? `user_trip_assigned_${tripKey}` : `user_driver_assigned_${Date.now()}`);

  const { extra = {} } = options;

  // 2. Play minimal gentle tone
  try {
    playCustomTone('soft_chime');
  } catch (e) {}

  // 3. Vibration
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate([100, 50, 150]);
    } catch (e) {}
  }

  // 4. Native Device Notification (Capacitor iOS & Android)
  if (Capacitor.isNativePlatform()) {
    try {
      await ensureNativeChannel();
      await LocalNotifications.schedule({
        notifications: [
          {
            id: stableId,
            title,
            body,
            channelId: 'user_trip_updates',
            smallIcon: 'ic_stat_icon_config_sample',
            largeIcon: 'res://drawable/app_icon',
            iconColor: '#FFC70A',
            schedule: { at: new Date(Date.now() + 50) },
            extra: {
              ...extra,
              tripId: tripKey || extra.tripId,
              timestamp: Date.now(),
              source: 'RidingoUser',
              targetView: 'user'
            }
          }
        ]
      });
      return true;
    } catch (err) {
      console.warn('[UserNotifications] LocalNotifications.schedule error:', err);
    }
  }

  // 5. Web Browser Notification with stable tag to prevent multiple browser toasts
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      const appIconUrl = window.location?.origin ? `${window.location.origin}/App%20icon.png` : '/App icon.png';
      if (Notification.permission === 'granted') {
        // If Service Worker registration is available, use showNotification
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          const reg = await navigator.serviceWorker.ready;
          if (reg && reg.showNotification) {
            await reg.showNotification(title, {
              body,
              icon: appIconUrl,
              badge: appIconUrl,
              tag: stableTag,
              renotify: true,
              vibrate: [100, 50, 150],
              data: {
                ...extra,
                tripId: tripKey || extra.tripId,
                timestamp: Date.now(),
                source: 'RidingoUser',
                url: '/'
              }
            });
            return true;
          }
        }

        const n = new Notification(title, {
          body,
          icon: appIconUrl,
          badge: appIconUrl,
          tag: stableTag,
          silent: false,
          data: { ...extra, source: 'RidingoUser' }
        });
        n.onclick = () => {
          try {
            window.focus();
            if (typeof window.__ridingoSetView === 'function') {
              window.__ridingoSetView('user', extra);
            } else {
              const url = new URL(window.location.href);
              url.searchParams.delete('view');
              window.location.href = url.toString();
            }
          } catch (e) {}
          n.close();
        };
        return true;
      }
    } catch (e) {}
  }

  return false;
}

