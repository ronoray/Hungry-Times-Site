// site/public/sw.js - Customer Site Service Worker
// ============================================================================
// AGGRESSIVE CACHE-CLEAR VERSION - Forces updates on every deploy
// Version: v4-AGGRESSIVE-20251229
// ============================================================================

const CACHE_NAME = 'hungry-times-v4-20251229-' + Date.now(); // ← TIMESTAMP for uniqueness
const STATIC_ASSETS = ['/icon-512x512.png', '/badge-72x72.png'];

console.log('[SW] 🚀 Customer Site Service Worker loading - AGGRESSIVE MODE');
console.log('[SW] 📦 Cache name:', CACHE_NAME);

// ============================================================================
// INSTALL EVENT - Force immediate activation
// ============================================================================

self.addEventListener('install', (event) => {
  console.log('[SW] 🔧 Installing service worker - FORCE MODE');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] 💾 Pre-caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] ✅ Static assets cached');
        console.log('[SW] ⚡ FORCE ACTIVATING - Skipping waiting');
        return self.skipWaiting(); // CRITICAL: Don't wait for old SW to close
      })
  );
});

// ============================================================================
// ACTIVATE EVENT - AGGRESSIVE cache deletion + force reload
// ============================================================================

self.addEventListener('activate', (event) => {
  console.log('[SW] ⚡ Activating service worker - AGGRESSIVE MODE');
  
  event.waitUntil(
    Promise.all([
      // Delete ALL old caches aggressively
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
      
      // Force claim all clients immediately
      self.clients.claim()
    ])
    .then(() => {
      console.log('[SW] ✅ All old caches deleted, clients claimed');
      
      // Force reload all open clients
      return self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clients) => {
          console.log(`[SW] 🔄 Force reloading ${clients.length} client(s)`);
          clients.forEach((client) => {
            // Send reload message to client
            client.postMessage({
              type: 'SW_UPDATED',
              message: 'Service worker updated, please refresh',
              cacheCleared: true
            });
          });
        });
    })
  );
});

// ============================================================================
// FETCH EVENT - Network-first with cache busting
// ============================================================================

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip API requests
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Skip non-http protocols
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // CRITICAL: Add cache-busting for service worker itself
  if (url.pathname.includes('sw.js') || url.pathname.includes('service-worker.js')) {
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
  const isMedia = /\.(png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|eot)$/i.test(url.pathname);

  if (isDocument || isAsset) {
    // NETWORK-FIRST for HTML/CSS/JS (always check for updates!)
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
                console.log('[SW] 📦 Network failed, serving from cache:', url.pathname);
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
// NOTIFICATION CLICK EVENT
// ============================================================================

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] 🖱️ Notification clicked:', event.notification.tag);
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';
  console.log('[SW] 🔗 Opening URL:', urlToOpen);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(location.origin) && 'focus' in client) {
            console.log('[SW] ✅ Focusing existing window');
            client.focus();
            if (urlToOpen !== '/') {
              client.navigate(urlToOpen);
            }
            return;
          }
        }
        
        if (clients.openWindow) {
          console.log('[SW] ✅ Opening new window');
          return clients.openWindow(urlToOpen);
        }
      })
  );

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

  if (event.data?.type === 'SKIP_WAITING') {
    console.log('[SW] ⭐ Skipping waiting, activating new version');
    self.skipWaiting();
  }

  if (event.data?.type === 'get-token') {
    console.log('[SW] 🔑 Requesting auth token');
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
console.log('[SW] Version: v4-AGGRESSIVE-20251229');
console.log('[SW] Cache Strategy: NETWORK-FIRST + AGGRESSIVE CLEAR');
console.log('[SW] Portal: Customer (hungrytimes.in)');
console.log('[SW] Features:');
console.log('     ✅ Push notifications');
console.log('     ✅ Order status updates');
console.log('     ✅ AGGRESSIVE cache clearing');
console.log('     ✅ Force immediate updates');
console.log('     ✅ Auto-reload on deploy');
console.log('[SW] Notification types:');
console.log('     - 📦 Order Status Updates');
console.log('     - 🛒 Order Confirmation');
console.log('     - 💳 Payment Updates');
console.log('╚═══════════════════════════════════════════════════╝');