// site/public/sw.js - Customer Site Service Worker
// ============================================================================
// CORRECTED VERSION - Fixed icon paths to match actual files
// Version: v6
// ============================================================================

const CACHE_NAME = 'hungry-times-v6';

// ✅ FIXED: Match actual icon filenames in /public folder
const STATIC_ASSETS = [
  '/icon-512.png',      // ← Fixed: was /icon-512x512.png
  '/icon-192.png',
  '/icon-180.png',
  '/favicon.ico'
];

console.log('[SW] 🚀 Customer Site Service Worker loading');
console.log('[SW] 📦 Cache name:', CACHE_NAME);

// ============================================================================
// INSTALL EVENT - Force immediate activation
// ============================================================================

self.addEventListener('install', (event) => {
  console.log('[SW] 🔧 Installing service worker');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] 💾 Pre-caching static assets');
        // ✅ Use addAll with error handling
        return cache.addAll(STATIC_ASSETS).catch(err => {
          console.warn('[SW] ⚠️ Some assets failed to cache:', err);
          // Don't fail installation if some assets are missing
        });
      })
      .then(() => {
        console.log('[SW] ✅ Installation complete');
        console.log('[SW] ⚡ FORCE ACTIVATING - Skipping waiting');
        return self.skipWaiting();
      })
  );
});

// ============================================================================
// ACTIVATE EVENT - Clean old caches
// ============================================================================

self.addEventListener('activate', (event) => {
  console.log('[SW] ⚡ Activating service worker');
  
  event.waitUntil(
    Promise.all([
      // Delete old caches
      caches.keys().then((cacheNames) => {
        console.log('[SW] 🗑️ Found caches:', cacheNames);
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] ❌ DELETING cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Claim all clients
      self.clients.claim()
    ])
    .then(() => {
      console.log('[SW] ✅ Activation complete, clients claimed');
      
      // Notify clients
      return self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clients) => {
          console.log(`[SW] 📡 Notifying ${clients.length} client(s)`);
          clients.forEach((client) => {
            client.postMessage({
              type: 'SW_UPDATED',
              message: 'Service worker updated',
              cacheCleared: true
            });
          });
        });
    })
  );
});

// ============================================================================
// FETCH EVENT - Network-first strategy
// ============================================================================

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Stale-while-revalidate for menu API (offline menu browsing)
  if (url.pathname === '/api/public/menu' || url.pathname === '/api/public/categories') {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cached) => {
          const fetched = fetch(event.request).then((response) => {
            if (response && response.status === 200) {
              cache.put(event.request, response.clone());
            }
            return response;
          }).catch(() => cached);
          return cached || fetched;
        });
      })
    );
    return;
  }

  // Skip other API requests - let them go to network
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Skip non-http protocols
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Cache-bust service worker itself
  if (url.pathname.includes('sw.js')) {
    event.respondWith(
      fetch(event.request.url + '?v=' + Date.now(), {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      })
    );
    return;
  }

  // Determine file type
  const isDocument = event.request.mode === 'navigate' || 
                     event.request.destination === 'document' ||
                     url.pathname.endsWith('.html');
  
  const isAsset = /\.(js|css|json)$/i.test(url.pathname);
  const isMedia = /\.(png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot)$/i.test(url.pathname);

  if (isDocument || isAsset) {
    // NETWORK-FIRST for HTML/CSS/JS
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                console.log('[SW] 📦 Serving from cache:', url.pathname);
                return cachedResponse;
              }
              return new Response('Offline - please check your connection', {
                status: 503,
                statusText: 'Service Unavailable',
                headers: new Headers({ 'Content-Type': 'text/plain' })
              });
            });
        })
    );
  } else if (isMedia) {
    // CACHE-FIRST for images/fonts
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
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

  let notificationData = {
    title: 'Hungry Times',
    body: 'You have a new notification',
    icon: '/icon-512.png',
    badge: '/icon-192.png',
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

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
      .then(() => {
        console.log('[SW] ✅ Notification shown');
      })
      .catch((error) => {
        console.error('[SW] ❌ Error showing notification:', error);
      })
  );

  // Notify open clients
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
// NOTIFICATION CLICK EVENT - ✅ FIXED for mobile
// ============================================================================

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] 🖱️ Notification clicked');
  console.log('[SW] Tag:', event.notification.tag);
  console.log('[SW] Data:', event.notification.data);
  
  event.notification.close();

  // ✅ FIXED: Ensure full URL for mobile browsers
  let urlToOpen = event.notification.data?.url || '/';
  
  // Convert relative URL to absolute
  if (!urlToOpen.startsWith('http')) {
    urlToOpen = self.location.origin + urlToOpen;
  }
  
  console.log('[SW] 🔗 Opening URL:', urlToOpen);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        console.log(`[SW] 📋 Found ${clientList.length} open window(s)`);
        
        // Try to focus existing window
        for (const client of clientList) {
          const clientOrigin = new URL(client.url).origin;
          if (clientOrigin === self.location.origin) {
            console.log('[SW] ✅ Focusing existing window');
            
            // Navigate to the URL if different from home
            if (urlToOpen !== self.location.origin + '/') {
              client.navigate(urlToOpen);
            }
            
            return client.focus();
          }
        }
        
        // No window open, open new one
        if (clients.openWindow) {
          console.log('[SW] ✅ Opening new window');
          return clients.openWindow(urlToOpen);
        } else {
          console.error('[SW] ❌ clients.openWindow not available');
        }
      })
      .catch(err => {
        console.error('[SW] ❌ Error handling notification click:', err);
      })
  );

  // Notify app
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
  console.log('[SW] 💬 Message from app:', event.data?.type);

  if (event.data?.type === 'SKIP_WAITING') {
    console.log('[SW] ⭐ Skipping waiting');
    self.skipWaiting();
  }

  if (event.data?.type === 'get-token') {
    console.log('[SW] 🔑 Token requested');
    const token = localStorage?.getItem?.('customerToken');
    event.ports[0]?.postMessage({ token });
  }

  if (event.data?.type === 'clear-cache') {
    console.log('[SW] 🗑️ Clearing cache');
    caches.delete(CACHE_NAME)
      .then(() => {
        console.log('[SW] ✅ Cache cleared');
      });
  }
});

// ============================================================================
// SYNC EVENT
// ============================================================================

self.addEventListener('sync', (event) => {
  console.log('[SW] 🔄 Background sync:', event.tag);

  if (event.tag === 'sync-pending-orders') {
    console.log('[SW] 📋 Syncing pending orders');
  }
});

// ============================================================================
// INITIALIZATION COMPLETE
// ============================================================================

console.log('╔═══════════════════════════════════════════════════╗');
console.log('[SW] ✅ Customer Site Service Worker Ready');
console.log('[SW] Version: v6');
console.log('[SW] Cache Strategy: NETWORK-FIRST');
console.log('[SW] Portal: Customer (hungrytimes.in)');
console.log('[SW] Features:');
console.log('     ✅ Push notifications');
console.log('     ✅ Order status updates');
console.log('     ✅ Offline support');
console.log('     ✅ PWA installation');
console.log('[SW] Notification types:');
console.log('     - 📦 Order Status Updates');
console.log('     - 🛒 Order Confirmation');
console.log('     - 💳 Payment Updates');
console.log('╚═══════════════════════════════════════════════════╝');