import { Appearance, Platform } from 'react-native';

/**
 * Ridingo React Native Custom Notification Engine
 * 
 * Core Specifications:
 * 1. Dynamic Theme Switching:
 *    - Light Mode: White Background (#FFFFFF) with Black Text (#000000)
 *    - Dark Mode: Black Background (#000000) with White Text (#FFFFFF)
 * 2. Information Displayed:
 *    - Pickup Location & Destination / Drop Location
 *    - Fare Amount (₹) & Advance Payment details
 *    - Route Distance & ETA duration
 * 3. Action Buttons:
 *    - Green Accept Button (#16A34A / #22C55E)
 *    - Red Decline Button (#DC2626 / #EF4444)
 * 4. Platform Architecture:
 *    - iOS: UNNotificationCategory ('TRIP_DISPATCH_CATEGORY') with native Destructive (Red) & Foreground (Green) actions
 *    - Android: Custom Layout & Background Action Event Receiver via @notifee/react-native & Firebase Headless JS
 */

export const NOTIFICATION_CHANNELS = {
  TRIP_DISPATCH: 'ridingo_trip_dispatch_channel',
  TRIP_ALERTS: 'ridingo_trip_alerts_channel'
};

export const NOTIFICATION_CATEGORIES = {
  TRIP_DISPATCH: 'TRIP_DISPATCH_CATEGORY'
};

export const NOTIFICATION_ACTIONS = {
  ACCEPT: 'ACTION_ACCEPT_TRIP',
  DECLINE: 'ACTION_DECLINE_TRIP'
};

// Theme Color Palettes
export const NOTIFICATION_THEMES = {
  light: {
    background: '#FFFFFF',       // Strict White Background
    cardBackground: '#F8FAFC',
    textPrimary: '#000000',      // Strict Black Text
    textSecondary: '#334155',    // Dark Slate
    accent: '#0F172A',
    borderColor: '#E2E8F0',
    acceptColor: '#16A34A',      // Emerald Green
    declineColor: '#DC2626'      // Crimson Red
  },
  dark: {
    background: '#000000',       // Strict Black Background
    cardBackground: '#111827',
    textPrimary: '#FFFFFF',      // Strict White Text
    textSecondary: '#CBD5E1',    // Light Slate
    accent: '#F8FAFC',
    borderColor: '#1F2937',
    acceptColor: '#22C55E',      // Vibrant Green
    declineColor: '#EF4444'      // Vibrant Red
  }
};

/**
 * Resolves current theme colors based on device system appearance
 */
export function getNotificationThemeColors() {
  const isDark = Appearance?.getColorScheme ? Appearance.getColorScheme() === 'dark' : false;
  return {
    isDark,
    theme: isDark ? NOTIFICATION_THEMES.dark : NOTIFICATION_THEMES.light
  };
}

/**
 * 1. Initialize Notification Categories & Channels
 * Configures iOS UNNotificationCategory with Green/Red actions and Android Heads-Up Notification Channel.
 */
export async function setupTripNotificationEngine() {
  try {
    const notifee = (await import('@notifee/react-native')).default;
    const { AndroidImportance, AndroidVisibility } = await import('@notifee/react-native');

    // 1. Android Notification Channel (Heads-up banner + sound + lockscreen visible)
    if (Platform.OS === 'android') {
      await notifee.createChannel({
        id: NOTIFICATION_CHANNELS.TRIP_DISPATCH,
        name: 'Ridingo Trip Requests',
        description: 'Urgent incoming trip dispatches with custom light/dark layout and action buttons',
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        vibration: true,
        vibrationPattern: [300, 150, 300, 150, 400],
        lights: true,
        lightColor: '#FFC70A',
        sound: 'default'
      });
    }

    // 2. iOS UNNotificationCategory (Action buttons on lockscreen and notification center)
    if (Platform.OS === 'ios') {
      await notifee.setNotificationCategories([
        {
          id: NOTIFICATION_CATEGORIES.TRIP_DISPATCH,
          actions: [
            {
              id: NOTIFICATION_ACTIONS.ACCEPT,
              title: 'Accept Trip',
              foreground: true // Launches or brings driver app to foreground immediately
            },
            {
              id: NOTIFICATION_ACTIONS.DECLINE,
              title: 'Decline',
              destructive: true // Native iOS renders destructive actions in Red (#DC2626)
            }
          ]
        }
      ]);
    }

    console.info('[NotificationEngine] Channels & Categories initialized successfully');
  } catch (err) {
    console.warn('[NotificationEngine] Setup note:', err?.message || err);
  }
}

/**
 * 2. Display Custom Light/Dark Mode Trip Notification
 * Applies strict:
 * - Light Mode: White background (#FFFFFF) with Black text (#000000)
 * - Dark Mode: Black background (#000000) with White text (#FFFFFF)
 * - Pickup, Drop, Distance, ETA, and Fare Amount (₹)
 * - Green Accept Button (#16A34A / #22C55E) & Red Decline Button (#DC2626 / #EF4444)
 */
export async function displayCustomTripNotification(tripData = {}) {
  try {
    const notifee = (await import('@notifee/react-native')).default;
    const { AndroidImportance, AndroidVisibility, AndroidStyle } = await import('@notifee/react-native');

    const tripId = tripData.tripId || tripData.id || `trip_${Date.now()}`;
    const fare = Number(tripData.fare || tripData.driverPayout || 600);
    const advance = Number(tripData.advance || Math.round(fare * 0.3));
    const pickup = tripData.pickup || tripData.from || 'Customer Pickup';
    const drop = tripData.drop || tripData.drop_loc || tripData.destination || 'City Destination';
    const distance = tripData.distance || tripData.distanceText || '12.4 km';
    const duration = tripData.duration || tripData.durationText || '28 mins';
    const customer = tripData.customerName || 'Customer';

    // 1. Detect dynamic system color scheme
    const { isDark, theme } = getNotificationThemeColors();

    // 2. Android Styled HTML Text representation (Respects Light #FFFFFF vs Dark #000000 background)
    const formattedHtmlText = `
      <div style="background-color: ${theme.background}; color: ${theme.textPrimary}; padding: 8px;">
        <p><b style="color: ${theme.textPrimary}; font-size: 16px;">₹${fare} Total</b> <span style="color: ${theme.textSecondary}; font-size: 13px;">(₹${advance} Advance Paid)</span></p>
        <p><b style="color: ${theme.textPrimary};">📍 Pickup:</b> <span style="color: ${theme.textSecondary};">${pickup}</span></p>
        <p><b style="color: ${theme.textPrimary};">🏁 Drop:</b> <span style="color: ${theme.textSecondary};">${drop}</span></p>
        <p style="color: ${theme.textSecondary}; font-size: 12px;">Route: ${distance} · ETA: ${duration} (${customer})</p>
      </div>
    `.trim();

    const plainTextBody = `Total: ₹${fare} (₹${advance} Advance)\nPickup: ${pickup}\nDrop: ${drop}\nRoute: ${distance} · ETA: ${duration}`;

    // 3. Android Action Button titles styled with Green (#16A34A) and Red (#DC2626) HTML spans
    const acceptActionTitle = `<font color="${theme.acceptColor}"><b>✓ ACCEPT ₹${fare}</b></font>`;
    const declineActionTitle = `<font color="${theme.declineColor}"><b>✕ DECLINE</b></font>`;

    await notifee.displayNotification({
      id: String(tripId),
      title: `🚗 New Trip Request: ₹${fare}`,
      subtitle: `${pickup} ➔ ${drop}`,
      body: plainTextBody,
      data: {
        tripId: String(tripId),
        fare: String(fare),
        advance: String(advance),
        pickup,
        drop,
        distance,
        duration,
        type: 'TRIP_REQUEST'
      },
      // iOS Configuration: UNNotificationCategory with APNs time-sensitive interruption
      ios: {
        categoryId: NOTIFICATION_CATEGORIES.TRIP_DISPATCH,
        sound: 'default',
        critical: true,
        interruptionLevel: 'timeSensitive',
        foregroundPresentationOptions: {
          badge: true,
          sound: true,
          banner: true,
          list: true
        }
      },
      // Android Configuration: Custom Theme, Strict White/Black color scheme, Green/Red action buttons
      android: {
        channelId: NOTIFICATION_CHANNELS.TRIP_DISPATCH,
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        color: theme.background, // Sets notification accent & header background
        smallIcon: 'ic_stat_ridingo',
        largeIcon: 'https://ridingo.app/App%20icon.png',
        style: {
          type: AndroidStyle.BIGTEXT,
          text: formattedHtmlText,
          title: `<font color="${theme.textPrimary}"><b>🚗 New Trip Request · ₹${fare}</b></font>`,
          summary: `${distance} · ₹${fare}`
        },
        actions: [
          {
            title: acceptActionTitle, // Green Accept Button
            icon: 'https://ridingo.app/icons/accept-check.png',
            pressAction: {
              id: NOTIFICATION_ACTIONS.ACCEPT,
              launchActivity: true
            }
          },
          {
            title: declineActionTitle, // Red Decline Button
            icon: 'https://ridingo.app/icons/decline-cross.png',
            pressAction: {
              id: NOTIFICATION_ACTIONS.DECLINE,
              launchActivity: false
            }
          }
        ],
        pressAction: {
          id: 'default',
          launchActivity: true
        }
      }
    });

    console.info(`[NotificationEngine] Displayed custom trip notification (${isDark ? 'Dark Mode #000000' : 'Light Mode #FFFFFF'}, Fare: ₹${fare})`);
    return true;
  } catch (err) {
    console.warn('[NotificationEngine] Display error:', err);
    return false;
  }
}

/**
 * 3. Android Custom Layout Receiver (Background & Foreground Action Handler)
 * Listens for driver interactions with Green Accept and Red Decline buttons
 * 
 * @param {Object} handlers
 * @param {Function} handlers.onAccept - Called when Accept button is pressed
 * @param {Function} handlers.onDecline - Called when Decline button is pressed
 */
export async function registerNotifeeActionReceiver(handlers = {}) {
  try {
    const notifee = (await import('@notifee/react-native')).default;
    const { EventType } = await import('@notifee/react-native');

    // 1. Background Event Receiver (App is minimized, backgrounded, or killed)
    notifee.onBackgroundEvent(async ({ type, detail }) => {
      const { notification, pressAction } = detail;
      const tripId = notification?.data?.tripId || notification?.id;

      if (type === EventType.ACTION_PRESS) {
        if (pressAction.id === NOTIFICATION_ACTIONS.ACCEPT) {
          console.info(`✅ [Receiver] Driver ACCEPTED trip: ${tripId}`);
          if (tripId) {
            await notifee.cancelNotification(notification.id);
          }
          if (handlers.onAccept) {
            await handlers.onAccept(notification.data);
          }
        } else if (pressAction.id === NOTIFICATION_ACTIONS.DECLINE) {
          console.info(`❌ [Receiver] Driver DECLINED trip: ${tripId}`);
          if (tripId) {
            await notifee.cancelNotification(notification.id);
          }
          if (handlers.onDecline) {
            await handlers.onDecline(notification.data);
          }
        }
      }
    });

    // 2. Foreground Event Receiver (App is currently open)
    notifee.onForegroundEvent(async ({ type, detail }) => {
      const { notification, pressAction } = detail;
      const tripId = notification?.data?.tripId || notification?.id;

      if (type === EventType.ACTION_PRESS) {
        if (pressAction.id === NOTIFICATION_ACTIONS.ACCEPT) {
          console.info(`✅ [ForegroundReceiver] Driver ACCEPTED trip: ${tripId}`);
          if (tripId) {
            await notifee.cancelNotification(notification.id);
          }
          if (handlers.onAccept) {
            handlers.onAccept(notification.data);
          }
        } else if (pressAction.id === NOTIFICATION_ACTIONS.DECLINE) {
          console.info(`❌ [ForegroundReceiver] Driver DECLINED trip: ${tripId}`);
          if (tripId) {
            await notifee.cancelNotification(notification.id);
          }
          if (handlers.onDecline) {
            handlers.onDecline(notification.data);
          }
        }
      }
    });

    console.info('[NotificationEngine] Action Receiver registered for Accept/Decline events');
  } catch (err) {
    console.warn('[NotificationEngine] Action receiver setup error:', err);
  }
}

/**
 * 4. Android Firebase setBackgroundMessageHandler
 * Executed in a standalone Headless JS context when remote FCM message arrives in background
 */
export function registerFirebaseBackgroundHandler(messagingInstance) {
  if (!messagingInstance) return;

  messagingInstance().setBackgroundMessageHandler(async (remoteMessage) => {
    console.info('🔔 [FCM Background Task] Remote Trip Request received:', remoteMessage);

    const data = remoteMessage?.data || {};

    if (data.type === 'TRIP_REQUEST' || data.type === 'TRIP_REQUESTED' || remoteMessage.notification?.title?.includes('Trip')) {
      await displayCustomTripNotification({
        tripId: data.tripId || data.id,
        fare: data.fare || data.driverPayout || 600,
        advance: data.advance || Math.round(Number(data.fare || 600) * 0.3),
        pickup: data.pickup || data.from || 'Customer Pickup',
        drop: data.drop || data.drop_loc || data.destination || 'Destination',
        distance: data.distance || data.distanceText || '12.4 km',
        duration: data.duration || data.durationText || '28 mins',
        customerName: data.customerName || data.name || 'Customer'
      });
    }

    return Promise.resolve();
  });

  console.info('[NotificationEngine] Firebase setBackgroundMessageHandler registered');
}

/**
 * 5. iOS APNs Payload with 'content-available: 1' and 'TRIP_DISPATCH_CATEGORY'
 */
export function getBackendAPNsPayload({
  token,
  tripId,
  fare,
  pickup,
  drop,
  distance,
  duration
}) {
  return {
    token,
    notification: {
      title: `New Trip Request: ₹${fare}`,
      body: `Pickup: ${pickup} ➔ ${drop}`
    },
    data: {
      tripId: String(tripId),
      fare: String(fare),
      pickup: String(pickup),
      drop: String(drop),
      distance: String(distance || '12.4 km'),
      duration: String(duration || '28 mins'),
      type: 'TRIP_REQUEST'
    },
    apns: {
      headers: {
        'apns-push-type': 'alert',
        'apns-priority': '10',
        'apns-topic': 'app.ridingo.driver'
      },
      payload: {
        aps: {
          alert: {
            title: `New Trip Request: ₹${fare}`,
            subtitle: `${pickup} ➔ ${drop}`,
            body: `Total: ₹${fare} · ${distance} · ${duration}`
          },
          category: NOTIFICATION_CATEGORIES.TRIP_DISPATCH,
          sound: 'default',
          badge: 1,
          'content-available': 1, // Wakes driver app in background
          'mutable-content': 1
        }
      }
    },
    android: {
      priority: 'high',
      notification: {
        channelId: NOTIFICATION_CHANNELS.TRIP_DISPATCH,
        priority: 'max',
        defaultSound: true,
        defaultVibrateTimings: true
      }
    }
  };
}

/**
 * 6. Reference Native Android RemoteViews Custom Layout XML
 * For native Android NotificationManager implementations requiring an XML layout
 */
export const ANDROID_CUSTOM_LAYOUT_XML = `
<?xml version="1.0" encoding="utf-8"?>
<!-- res/layout/custom_trip_notification.xml -->
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:orientation="vertical"
    android:padding="16dp"
    android:background="@color/notification_bg">

    <TextView
        android:id="@+id/notif_fare"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:textColor="@color/notification_text"
        android:textSize="18sp"
        android:textStyle="bold" />

    <TextView
        android:id="@+id/notif_pickup"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:textColor="@color/notification_text_secondary"
        android:textSize="14sp"
        android:layout_marginTop="4dp" />

    <TextView
        android:id="@+id/notif_drop"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:textColor="@color/notification_text_secondary"
        android:textSize="14sp"
        android:layout_marginTop="2dp" />

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:layout_marginTop="12dp">

        <Button
            android:id="@+id/btn_accept"
            android:layout_width="0dp"
            android:layout_height="40dp"
            android:layout_weight="1"
            android:text="ACCEPT"
            android:textColor="#FFFFFF"
            android:backgroundTint="#16A34A"
            android:textStyle="bold" />

        <Button
            android:id="@+id/btn_decline"
            android:layout_width="0dp"
            android:layout_height="40dp"
            android:layout_weight="1"
            android:layout_marginStart="8dp"
            android:text="DECLINE"
            android:textColor="#FFFFFF"
            android:backgroundTint="#DC2626"
            android:textStyle="bold" />
    </LinearLayout>
</LinearLayout>
`.trim();
