// site/src/App.jsx - FIXED: No guest subscriptions, auth required
import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { LocationProvider } from "./context/LocationContext";
import { MenuCategoryProvider } from './context/MenuCategoryContext';
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
 * ⚠️ IMPORTANT: Requires authentication - customer must be logged in
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
      return false;
    }

    const { publicKey } = await keyResponse.json();
    console.log('[Push] ✅ Got VAPID public key');

    // Validate VAPID key
    const vapidArray = urlBase64ToUint8Array(publicKey);
    if (!vapidArray) {
      console.warn('[Push] ⚠️ Invalid VAPID key format');
      return false;
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

    // ✅ Get authentication token - REQUIRED for push subscription
    const token = localStorage.getItem('customerToken');

    if (!token) {
      console.log('[Push] ⚠️ No auth token - customer must login first to subscribe to push');
      return false;
    }

    // Send subscription to backend with authentication
    console.log('[Push] 🤝 Sending subscription to backend with auth token...');
    
    try {
      const subResponse = await Promise.race([
        fetch(`${API_BASE}/push/subscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
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
        return false;
      }

      const result = await subResponse.json();
      console.log('[Push] ✅ Successfully subscribed to push notifications:', result);
      return true;
    } catch (error) {
      console.error('[Push] ❌ Subscription to backend failed:', error.message);
      return false;
    }

  } catch (error) {
    // ⚠️ DON'T THROW - Log the error but let app continue
    console.warn('[Push] ⚠️ Push setup warning:', error.message);
    // Push notifications are optional - app should work without them
    return false;
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
          console.warn('[Push] ⚠️ Re-subscription after login failed:', subResponse.status, errorText);
          return false;
        }
      } else {
        console.log('[Push] ℹ️ No local subscription found, will create new subscription...');
        // No existing subscription, create one
        return await setupPushNotifications();
      }
    }
    return false;
  } catch (error) {
    console.error('[Push] ❌ Re-subscription after login error:', error);
    return false;
  }
}

export default function App() {
  useEffect(() => {
    console.log('[Push] 🚀 App mounted');
    
    // Setup service worker message listener
    setupServiceWorkerMessages();
    
    // ✅ Check if user is already logged in
    const token = localStorage.getItem('customerToken');
    
    if (token) {
      console.log('[Push] 🔑 Customer is logged in, setting up push notifications...');
      
      // Subscribe to push notifications
      setupPushNotifications()
        .then(success => {
          if (success) {
            console.log('[Push] ✅ Push notifications initialized');
          } else {
            console.warn('[Push] ⚠️ Push setup failed but app continues');
          }
        })
        .catch(error => {
          console.warn('[Push] ⚠️ Push setup error (non-blocking):', error.message);
        });
    } else {
      console.log('[Push] ℹ️ Customer not logged in yet, waiting for login to setup push');
    }

  }, []);

  return (
    <MenuCategoryProvider>
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
    </MenuCategoryProvider>
  );
}