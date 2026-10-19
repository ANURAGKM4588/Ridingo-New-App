// Ridingo Service Worker for Background Push Notifications & Dispatch Actions

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming background push notifications
// STRICT USER SPECIFICATION:
// - When the app is OPEN in foreground, do NOT display push notification.
// - When the app is MINIMIZED (background) or CLOSED (not in recent apps), display real device system push notification with Accept & Decline buttons.
self.addEventListener('push', (event) => {
  if (!event.data) return;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if any client is open and focused in the foreground
      const isForeground = clientList.some(client => client.visibilityState === 'visible' && client.focused);

      if (isForeground) {
        console.log('[SW] App is currently OPEN and focused in foreground. Suppressing system push notification.');
        return;
      }

      // App is minimized or closed: show real system push notification!
      try {
        const payload = event.data.json();
        const title = payload.title || 'Ridingo Alert';
        const isRequest = payload.data?.type === 'request' || payload.data?.type === 'TRIP_REQUEST' || (payload.title && payload.title.includes('Trip'));

        const options = {
          body: payload.body || '',
          icon: payload.icon || '/App icon.png',
          badge: payload.badge || '/App icon.png',
          tag: payload.tag || ('ridingo_notif_' + Date.now()),
          renotify: true,
          requireInteraction: true,
          vibrate: [200, 100, 200, 100, 200],
          data: payload.data || {},
          actions: isRequest ? [
            { action: 'accept', title: '✓ Accept' },
            { action: 'decline', title: '✕ Decline' }
          ] : []
        };
        return self.registration.showNotification(title, options);
      } catch (e) {
        const text = event.data.text();
        return self.registration.showNotification('Ridingo Trip Alert', {
          body: text,
          icon: '/App icon.png'
        });
      }
    })
  );
});

// Handle notification tap / click by driver or customer
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notifData = event.notification.data || {};
  const isDriverNotif = notifData.source === 'RidingoDriver' || notifData.type === 'request' || event.action === 'accept' || event.action === 'view';
  const targetPath = isDriverNotif ? '/?view=driver' : '/';

  if (event.action === 'decline') {
    console.info('[SW] Driver declined trip request from notification banner');
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If window/tab already open, navigate to target and focus window
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          const targetUrl = new URL(targetPath, client.url).href;
          if (client.navigate) {
            client.navigate(targetUrl);
          }
          client.postMessage({
            type: 'NOTIFICATION_ACTION_CLICK',
            action: event.action || 'accept',
            data: notifData
          });
          return client.focus();
        }
      }
      // If no window is currently open (app was closed), open a new window pointing to driver or user app
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetPath);
      }
    })
  );
});
