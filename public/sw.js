// c:\hungry-times-site\client\public\sw.js
// Service Worker for Customer Portal (hungrytimes.in)

const CACHE_NAME = 'hungrytimes-customer-v1';

console.log('🔵 Service Worker loaded');

// Install event
self.addEventListener('install', (event) => {
  console.log('✅ Service Worker installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activating...');
  event.waitUntil(self.clients.claim());
});

// Push notification received
self.addEventListener('push', (event) => {
  console.log('ðŸ"¢ [Customer SW] Push notification received');
  
  let notificationData = {
    title: 'Hungry Times',
    body: 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    data: { url: '/' }
  };

  if (event.data) {
    try {
      const data = event.data.json();
      console.log('ðŸ"¦ [Customer SW] Push data:', data);
      
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        tag: data.tag || 'notification',
        data: data.data || { url: '/' },
        actions: data.actions || [],
        requireInteraction: data.requireInteraction || false,
        // ✨ NEW: Add sound support
        sound: data.sound !== false ? true : false
      };

      // ✨ NEW: Log notification type for analytics
      if (data.type) {
        console.log(`ðŸ"¢ [Customer SW] Notification type: ${data.type}`);
      }
    } catch (err) {
      console.error('âŒ [Customer SW] Error parsing push data:', err);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data,
      actions: notificationData.actions,
      requireInteraction: notificationData.requireInteraction,
      // ✨ NEW: Include vibration pattern
      vibrate: [200, 100, 200]
    }).then((notification) => {
      console.log('âœ… [Customer SW] Notification shown');
    }).catch((err) => {
      console.error('âŒ [Customer SW] Error showing notification:', err);
    })
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ Notification clicked');
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            console.log('✅ Focusing existing window');
            return client.focus().then(() => {
              // Navigate to URL if different
              if (urlToOpen !== '/') {
                return client.navigate(urlToOpen);
              }
            });
          }
        }
        // Open new window
        if (clients.openWindow) {
          console.log('✅ Opening new window:', urlToOpen);
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync (optional - for offline order submission)
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync:', event.tag);
  
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncPendingOrders());
  }
});

async function syncPendingOrders() {
  // TODO: Implement offline order sync if needed
  console.log('🔄 Syncing pending orders...');
}