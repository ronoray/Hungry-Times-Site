// site/public/sw.js - Customer Site Service Worker
// ============================================================================
// Simplified version for hungrytimes.in customer portal
// Features: Push notifications, offline caching, order updates
// ============================================================================

const CACHE_NAME = 'hungrytimes-customer-v1';

console.log('[SW] 🚀 Customer Site Service Worker loading');

// ============================================================================
// INSTALL EVENT
// ============================================================================

self.addEventListener('install', (event) => {
  console.log('[SW] 🔧 Installing service worker');
  self.skipWaiting();
});

// ============================================================================
// ACTIVATE EVENT
// ============================================================================

self.addEventListener('activate', (event) => {
  console.log('[SW] ⚡ Activating service worker');
  event.waitUntil(self.clients.claim());
});

// ============================================================================
// FETCH EVENT - Caching strategy
// ============================================================================

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip API requests (they need fresh data)
  if (url.pathname.startsWith('/api/')) {
    console.log('[SW] 🔄 API request - fetching fresh:', url.pathname);
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          console.log('[SW] 💾 Cache hit:', url.pathname);
          return response;
        }
        
        console.log('[SW] 🌐 Fetching from network:', url.pathname);
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200) {
              return response;
            }
            
            // Cache successful responses
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // Return offline fallback if available
            console.warn('[SW] ⚠️ Fetch failed, offline mode');
            return new Response('Offline - no cached version available', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// ============================================================================
// PUSH EVENT - Handle push notifications
// ============================================================================

self.addEventListener('push', (event) => {
  console.log('[SW] 📬 Push notification received');

  if (!event.data) {
    console.warn('[SW] ⚠️ No data in push event');
    return;
  }

  // Parse push payload
  let notificationData = {
    title: 'Hungry Times',
    body: 'You have a new notification',
    icon: '/icon-512x512.png',
    badge: '/badge-72x72.png',
    tag: 'notification',
    data: { url: '/' }
  };

  try {
    const payload = event.data.json();
    console.log('[SW] 📦 Push payload:', payload);
    
    notificationData = {
      title: payload.title || notificationData.title,
      body: payload.body || notificationData.body,
      icon: payload.icon || notificationData.icon,
      badge: payload.badge || notificationData.badge,
      tag: payload.tag || notificationData.tag,
      data: payload.data || notificationData.data,
      vibrate: payload.vibrate || [200, 100, 200],
      requireInteraction: payload.requireInteraction || false,
      actions: payload.actions || []
    };

    console.log('[SW] 🎯 Notification details:', {
      title: notificationData.title,
      tag: notificationData.tag,
      type: notificationData.data?.type
    });
  } catch (error) {
    console.error('[SW] ❌ Error parsing push data:', error);
  }

  // Show notification
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
      .then(() => {
        console.log('[SW] ✅ Notification shown');
      })
      .catch((error) => {
        console.error('[SW] ❌ Error showing notification:', error);
      })
  );

  // Notify open clients about the push
  event.waitUntil(
    self.clients.matchAll({ includeUncontrolled: true, type: 'window' })
      .then((clients) => {
        console.log(`[SW] 📡 Notifying ${clients.length} client(s) about push`);
        clients.forEach((client) => {
          client.postMessage({
            type: 'push-received',
            notification: notificationData
          });
        });
      })
  );
});

// ============================================================================
// NOTIFICATION CLICK EVENT
// ============================================================================

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] 🖱️ Notification clicked:', event.notification.tag);
  event.notification.close();

  // Get URL from notification data
  const urlToOpen = event.notification.data?.url || '/';
  console.log('[SW] 🔗 Opening URL:', urlToOpen);

  // Try to focus existing window or open new one
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if window already open
        for (const client of clientList) {
          if (client.url.includes(location.origin) && 'focus' in client) {
            console.log('[SW] ✅ Focusing existing window');
            client.focus();
            // Navigate to URL if needed
            if (urlToOpen !== '/') {
              client.navigate(urlToOpen);
            }
            return;
          }
        }
        
        // Open new window
        if (clients.openWindow) {
          console.log('[SW] ✅ Opening new window');
          return clients.openWindow(urlToOpen);
        }
      })
  );

  // Notify app that notification was clicked
  self.clients.matchAll({ type: 'window' })
    .then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'notification-clicked',
          data: event.notification.data
        });
      });
    });
});

// ============================================================================
// NOTIFICATION CLOSE EVENT
// ============================================================================

self.addEventListener('notificationclose', (event) => {
  console.log('[SW] ❌ Notification closed:', event.notification.tag);
});

// ============================================================================
// MESSAGE EVENT - Handle messages from app
// ============================================================================

self.addEventListener('message', (event) => {
  console.log('[SW] 💬 Message received from app:', event.data?.type);

  // Handle SKIP_WAITING
  if (event.data?.type === 'SKIP_WAITING') {
    console.log('[SW] ⏭️ Skipping waiting, activating new version');
    self.skipWaiting();
  }

  // Handle GET_TOKEN request (for push subscription)
  if (event.data?.type === 'get-token') {
    console.log('[SW] 🔑 Requesting auth token');
    const token = localStorage?.getItem?.('customerToken');
    event.ports[0]?.postMessage({ token });
  }

  // Handle CLEAR_CACHE
  if (event.data?.type === 'clear-cache') {
    console.log('[SW] 🗑️ Clearing cache');
    caches.delete(CACHE_NAME)
      .then(() => {
        console.log('[SW] ✅ Cache cleared');
      });
  }
});

// ============================================================================
// SYNC EVENT - Background sync (optional)
// ============================================================================

self.addEventListener('sync', (event) => {
  console.log('[SW] 🔄 Background sync:', event.tag);

  if (event.tag === 'sync-pending-orders') {
    console.log('[SW] 📋 Syncing pending orders');
    // Can be implemented for offline order submission
  }
});

// ============================================================================
// INITIALIZATION COMPLETE
// ============================================================================

console.log('═══════════════════════════════════════════════════════');
console.log('[SW] ✅ Customer Site Service Worker Ready');
console.log('[SW] Version: 1.0');
console.log('[SW] Portal: Customer (hungrytimes.in)');
console.log('[SW] Features:');
console.log('     ✅ Push notifications');
console.log('     ✅ Order status updates');
console.log('     ✅ Offline caching');
console.log('     ✅ Notification click handling');
console.log('[SW] Supported notification types:');
console.log('     - 📦 Order Status (accepted, preparing, delivered)');
console.log('     - 🛒 New Order Confirmation');
console.log('     - 💳 Payment Updates');
console.log('═══════════════════════════════════════════════════════');