// Ridingo Service Worker for Background Push Notifications & Dispatch Actions

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming background push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const payload = event.data.json();
    const title = payload.title || 'Ridingo Alert';
    const options = {
      body: payload.body || '',
      icon: payload.icon || '/App icon.png',
      badge: payload.badge || '/App icon.png',
      tag: payload.tag || ('ridingo_notif_' + Date.now()),
      renotify: true,
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
      data: payload.data || {}
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('Ridingo', {
        body: text,
        icon: '/App icon.png'
      })
    );
  }
});

// Handle notification tap / click by driver or customer
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notifData = event.notification.data || {};
  const isDriverNotif = notifData.source === 'RidingoDriver' || notifData.type === 'request' || event.action === 'accept' || event.action === 'view';
  const targetPath = isDriverNotif ? '/?view=driver' : '/';

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
            action: event.action,
            data: notifData
          });
          return client.focus();
        }
      }
      // If no window is currently open, open a new window pointing to driver or user app
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetPath);
      }
    })
  );
});
