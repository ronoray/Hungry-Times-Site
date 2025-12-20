// site/public/sw.js - Customer Site Service Worker
// ============================================================================
// Simplified version for hungrytimes.in customer portal
// Features: Push notifications, smart caching, order updates
// ============================================================================

const CACHE_NAME = 'hungry-times-v3-20241220'; // ← INCREMENT THIS ON EVERY DEPLOY!
const STATIC_ASSETS = ['/icon-512x512.png', '/badge-72x72.png'];

console.log('[SW] 🚀 Customer Site Service Worker loading');

// ============================================================================
// INSTALL EVENT
// ============================================================================

self.addEventListener('install', (event) => {
  console.log('[SW] 🔧 Installing service worker');
  
  // Pre-cache critical assets
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] 💾 Pre-caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] ✅ Static assets cached');
        return self.skipWaiting(); // Activate immediately
      })
  );
});

// ============================================================================
// ACTIVATE EVENT
// ============================================================================

self.addEventListener('activate', (event) => {
  console.log('[SW] ⚡ Activating service worker');
  
  event.waitUntil(
    // Delete old caches
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] 🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('[SW] ✅ Old caches deleted');
      return self.clients.claim(); // Take control immediately
    })
  );
});

// ============================================================================
// FETCH EVENT - Smart Caching Strategy
// ============================================================================

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip API requests (always fetch fresh)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Determine caching strategy based on file type
  const isDocument = event.request.mode === 'navigate' || 
                     event.request.destination === 'document' ||
                     url.pathname.endsWith('.html');
  
  const isAsset = /\.(js|css|json)$/i.test(url.pathname);
  const isMedia = /\.(png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|eot)$/i.test(url.pathname);

  if (isDocument || isAsset) {
    // NETWORK-FIRST for HTML/CSS/JS (always check for updates!)
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone and cache the response
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Network failed, try cache as fallback
          return caches.match(event.request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                console.log('[SW] 📦 Network failed, serving from cache:', url.pathname);
                return cachedResponse;
              }
              // No cache, return offline message
              return new Response('Offline - please check your connection', {
                status: 503,
                statusText: 'Service Unavailable',
                headers: new Headers({ 'Content-Type': 'text/plain' })
              });
            });
        })
    );
  } else if (isMedia) {
    // CACHE-FIRST for images/fonts (they rarely change)
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Not in cache, fetch and cache
          return fetch(event.request)
            .then((response) => {
              if (response && response.status === 200) {
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, responseToCache);
                });
              }
              return response;
            });
        })
    );
  }
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

console.log('╔══════════════════════════════════════════════════════╗');
console.log('[SW] ✅ Customer Site Service Worker Ready');
console.log('[SW] Version: v3-20241220');
console.log('[SW] Cache Strategy: NETWORK-FIRST for HTML/CSS/JS');
console.log('[SW] Portal: Customer (hungrytimes.in)');
console.log('[SW] Features:');
console.log('     ✅ Push notifications');
console.log('     ✅ Order status updates');
console.log('     ✅ Smart caching (network-first)');
console.log('     ✅ Auto-update on new deploy');
console.log('[SW] Supported notification types:');
console.log('     - 📦 Order Status (accepted, preparing, delivered)');
console.log('     - 🛒 New Order Confirmation');
console.log('     - 💳 Payment Updates');
console.log('╚══════════════════════════════════════════════════════╝');