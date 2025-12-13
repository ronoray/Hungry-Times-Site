// site/src/App.jsx - FIXED: Push notifications don't block page load
import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { LocationProvider } from "./context/LocationContext";
import API_BASE from "./config/api.js";
import "./styles/index.css";

/**
 * Helper: Convert base64 VAPID key to Uint8Array for push subscription
 */
function urlBase64ToUint8Array(base64String) {
  try {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  } catch (error) {
    console.warn('[Push] ⚠️ VAPID key conversion failed:', error.message);
    return null;
  }
}

/**
 * Register service worker and setup push notifications
 * ⚠️ IMPORTANT: This runs in background and should NOT block app rendering
 */
async function setupPushNotifications() {
  try {
    // Check browser support
    if (!('serviceWorker' in navigator)) {
      console.warn('[Push] ⚠️ Service Workers not supported');
      return false;
    }

    console.log('[Push] 🔧 Setting up push notifications for customer site');

    // Register service worker with timeout
    console.log('[Push] 📝 Registering service worker...');
    const registrationPromise = navigator.serviceWorker.register('/sw.js', { scope: '/' });
    
    const registration = await Promise.race([
      registrationPromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Service worker registration timeout')), 5000)
      )
    ]);
    
    console.log('[Push] ✅ Service worker registered');

    // Wait for service worker to be ready (with timeout)
    const readyPromise = navigator.serviceWorker.ready;
    await Promise.race([
      readyPromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Service worker ready timeout')), 5000)
      )
    ]);
    console.log('[Push] ✅ Service worker is ready');

    // Get VAPID public key from backend (with timeout)
    console.log('[Push] 🔑 Fetching VAPID public key...');
    const keyPromise = fetch(`${API_BASE}/push/vapid-public-key`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const keyResponse = await Promise.race([
      keyPromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('VAPID key fetch timeout')), 5000)
      )
    ]);

    if (!keyResponse.ok) {
      console.warn(`[Push] ⚠️ Failed to get VAPID key: ${keyResponse.status}`);
      // Don't throw - push is optional
      return true;
    }

    const { publicKey } = await keyResponse.json();
    console.log('[Push] ✅ Got VAPID public key');

    // Validate VAPID key
    const vapidArray = urlBase64ToUint8Array(publicKey);
    if (!vapidArray) {
      console.warn('[Push] ⚠️ Invalid VAPID key format');
      return true;
    }

    // Subscribe to push notifications (with timeout)
    console.log('[Push] 📡 Creating push subscription...');
    const subPromise = registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidArray
    });

    const subscription = await Promise.race([
      subPromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Push subscription timeout')), 5000)
      )
    ]);
    
    console.log('[Push] ✅ Push subscription created');

    // Get authentication token (optional - guest users might not have one)
    const token = localStorage.getItem('customerToken');
    const hasAuth = !!token;

    // Send subscription to backend (optional - doesn't block if fails)
    console.log('[Push] 🤝 Sending subscription to backend...', { hasAuth });
    
    try {
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // Only add auth if token exists
      if (hasAuth) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('[Push] 📋 Including auth token with subscription');
      } else {
        console.log('[Push] ℹ️ No auth token, sending as guest subscription');
      }

      const subResponse = await Promise.race([
        fetch(`${API_BASE}/push/subscribe`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ 
            subscription: subscription.toJSON() 
          })
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Backend subscription timeout')), 5000)
        )
      ]);

      if (!subResponse.ok) {
        const errorText = await subResponse.text();
        console.warn(`[Push] ⚠️ Backend subscription failed: ${subResponse.status} - ${errorText}`);
        
        // Check if it's auth-related
        if (subResponse.status === 401) {
          console.log('[Push] ℹ️ 401 Unauthorized - guest user, subscription stored locally');
          console.log('[Push] ℹ️ When user logs in, subscription will be attached to account');
        }
        
        // Don't fail - subscription is still registered locally
        return true;
      }

      const result = await subResponse.json();
      console.log('[Push] ✅ Successfully subscribed to push notifications:', result);
      return true;
    } catch (error) {
      console.warn('[Push] ⚠️ Subscription to backend failed:', error.message);
      // Subscription is still created locally, continue anyway
      console.log('[Push] ℹ️ Subscription stored locally, will sync when user logs in');
      return true;
    }

  } catch (error) {
    // ⚠️ DON'T THROW - Log the error but let app continue
    console.warn('[Push] ⚠️ Push setup warning:', error.message);
    // Push notifications are optional - app should work without them
    return true;
  }
}

/**
 * Handle service worker messages
 */
function setupServiceWorkerMessages() {
  if (!('serviceWorker' in navigator)) return;

  try {
    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, data } = event.data || {};

      console.log('[Push] 📨 Message from service worker:', type);

      switch (type) {
        case 'push-received':
          console.log('[Push] 📬 Push notification received:', data);
          // Dispatch custom event for app components to react to
          window.dispatchEvent(new CustomEvent('notification:received', { detail: data }));
          break;

        case 'notification-clicked':
          console.log('[Push] 🖱️ Notification clicked:', data);
          window.dispatchEvent(new CustomEvent('notification:clicked', { detail: data }));
          break;

        case 'feedback-published':
          console.log('[Push] 📢 Feedback published:', data);
          window.dispatchEvent(new CustomEvent('feedback:published', { detail: data }));
          break;

        case 'get-token':
          // Service worker requests auth token
          const token = localStorage.getItem('customerToken');
          event.ports[0]?.postMessage({ token });
          break;

        default:
          console.log('[Push] 📨 Unknown message type:', type);
      }
    });

    console.log('[Push] 📊 Service worker message listener set up');
  } catch (error) {
    console.warn('[Push] ⚠️ Failed to setup service worker messages:', error.message);
  }
}

/**
 * Re-subscribe on login
 * Call this from AuthContext after customer successfully logs in
 * This attaches the local subscription to the customer account
 */
export async function resubscribeOnLogin() {
  console.log('[Push] 🔄 Re-subscribing after customer login...');
  try {
    const token = localStorage.getItem('customerToken');
    
    if (!token) {
      console.warn('[Push] ⚠️ No token found after login');
      return false;
    }
    
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        console.log('[Push] 📋 Found local subscription, attaching to account...');
        
        const subResponse = await fetch(`${API_BASE}/push/subscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            subscription: subscription.toJSON() 
          })
        });

        if (subResponse.ok) {
          const result = await subResponse.json();
          console.log('[Push] ✅ Re-subscribed successfully after login:', result);
          return true;
        } else {
          const errorText = await subResponse.text();
          console.warn('[Push] ⚠️ Re-subscription after login failed:', subResponse.status);
          return false;
        }
      } else {
        console.log('[Push] ℹ️ No local subscription found yet, will create on next refresh');
        return false;
      }
    }
  } catch (error) {
    console.error('[Push] ❌ Re-subscription after login error:', error);
    return false;
  }
}

/**
 * Main App Component
 */
export default function App() {
  useEffect(() => {
    // Setup push notifications on app load
    // ✅ FIXED: Run in background - don't block page rendering
    console.log('[Push] 🚀 App mounted, initializing push notifications...');
    
    // Fire and forget - don't await
    setupPushNotifications()
      .then(success => {
        if (success) {
          console.log('[Push] ✅ Push notifications initialized');
        } else {
          console.warn('[Push] ⚠️ Push notifications setup skipped - app continues');
        }
      })
      .catch(error => {
        // Catch any uncaught errors
        console.warn('[Push] ⚠️ Push setup error (non-blocking):', error.message);
      });

    // Setup service worker message listener
    setupServiceWorkerMessages();

  }, []);

  return (
    <AuthProvider>
      <CartProvider>
        <LocationProvider>
          <div className="min-h-screen flex flex-col bg-[#0B0B0B] text-white">
            
            {/* Navigation Bar */}
            <Navbar />

            {/* Main Content */}
            <main className="flex-1">
              <Outlet />
            </main>

            {/* Footer */}
            <Footer />

          </div>
        </LocationProvider>
      </CartProvider>
    </AuthProvider>
  );
}